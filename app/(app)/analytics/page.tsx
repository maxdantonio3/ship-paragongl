import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { format, startOfDay, startOfWeek, startOfMonth, startOfYear, subDays } from "date-fns";
import StatusBadge from "@/components/StatusBadge";
import ExpandableBreakdown, { type BreakdownRow } from "@/components/ExpandableBreakdown";
import type { Branch, Company, CompanyStatus } from "@/lib/types";
import { COMPANY_STATUSES } from "@/lib/types";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function scopeCompanies(q: any, branchId: string | null): any {
  if (!branchId) return q;
  return q.eq("branch_id", branchId);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function scopeActivitiesByCompanyIds(q: any, ids: string[] | null): any {
  if (ids === null) return q;
  if (ids.length === 0) return q.eq("company_id", "00000000-0000-0000-0000-000000000000");
  return q.in("company_id", ids);
}

async function countSince(
  supabase: ReturnType<typeof createClient>,
  table: "activities" | "companies",
  dateCol: string,
  since: Date,
  branchId: string | null,
  branchCompanyIds: string[] | null
) {
  let q = supabase.from(table).select("id", { count: "exact", head: true }).gte(dateCol, since.toISOString());
  q = table === "companies" ? scopeCompanies(q, branchId) : scopeActivitiesByCompanyIds(q, branchCompanyIds);
  const { count } = await q;
  return count ?? 0;
}

async function activityTypeBreakdownSince(
  supabase: ReturnType<typeof createClient>,
  since: Date,
  branchId: string | null,
  branchCompanyIds: string[] | null
): Promise<Record<string, number>> {
  let q = supabase.from("activities").select("activity_type").gte("activity_date", since.toISOString());
  q = scopeActivitiesByCompanyIds(q, branchId ? branchCompanyIds : null);
  const { data } = await q;
  const counts: Record<string, number> = {};
  (data ?? []).forEach((r: { activity_type: string }) => {
    counts[r.activity_type] = (counts[r.activity_type] ?? 0) + 1;
  });
  return counts;
}

async function branchBreakdownSince(
  supabase: ReturnType<typeof createClient>,
  since: Date,
  branchId: string | null
): Promise<Record<string, number>> {
  let q = supabase.from("companies").select("branch_id").gte("date_added", since.toISOString());
  q = scopeCompanies(q, branchId);
  const { data } = await q;
  const counts: Record<string, number> = {};
  (data ?? []).forEach((r: { branch_id: string | null }) => {
    const key = r.branch_id ?? "__none__";
    counts[key] = (counts[key] ?? 0) + 1;
  });
  return counts;
}

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: { branch?: string };
}) {
  const supabase = createClient();
  const now = new Date();
  const today = startOfDay(now);
  const week = startOfWeek(now, { weekStartsOn: 1 });
  const month = startOfMonth(now);
  const year = startOfYear(now);
  const thirtyDaysAgo = subDays(now, 30);
  const todayStr = format(now, "yyyy-MM-dd");

  const branchFilter = searchParams.branch ?? "";
  const { data: branches } = await supabase.from("branches").select("*").order("name");
  const activeBranch = (branches as Branch[] | null)?.find((b) => b.id === branchFilter) ?? null;

  // Activities don't carry branch_id directly, so when scoping by branch we
  // first resolve which companies are in it, then filter activities by
  // company_id. Null means "no branch filter — don't scope at all."
  let branchCompanyIds: string[] | null = null;
  if (branchFilter) {
    const { data } = await supabase.from("companies").select("id").eq("branch_id", branchFilter);
    branchCompanyIds = (data ?? []).map((r: { id: string }) => r.id);
  }

  const [
    contactsToday,
    contactsWeek,
    contactsMonth,
    contactsYear,
    companiesToday,
    companiesWeek,
    companiesMonth,
    companiesYear,
    { data: typeRows },
    { data: statusRows },
    { data: recentlyContacted },
    { data: staleCompanies },
    { count: overdueCount },
    { count: dueTodayCount },
    { data: followUpsDue },
    touchesByTypeToday,
    touchesByTypeWeek,
    touchesByTypeMonth,
    touchesByTypeYear,
    companiesByBranchToday,
    companiesByBranchWeek,
    companiesByBranchMonth,
    companiesByBranchYear,
  ] = await Promise.all([
    countSince(supabase, "activities", "activity_date", today, branchFilter, branchCompanyIds),
    countSince(supabase, "activities", "activity_date", week, branchFilter, branchCompanyIds),
    countSince(supabase, "activities", "activity_date", month, branchFilter, branchCompanyIds),
    countSince(supabase, "activities", "activity_date", year, branchFilter, branchCompanyIds),
    countSince(supabase, "companies", "date_added", today, branchFilter, branchCompanyIds),
    countSince(supabase, "companies", "date_added", week, branchFilter, branchCompanyIds),
    countSince(supabase, "companies", "date_added", month, branchFilter, branchCompanyIds),
    countSince(supabase, "companies", "date_added", year, branchFilter, branchCompanyIds),
    scopeActivitiesByCompanyIds(supabase.from("activities").select("activity_type"), branchFilter ? branchCompanyIds : null),
    scopeCompanies(supabase.from("companies").select("status"), branchFilter || null),
    scopeCompanies(
      supabase
        .from("companies")
        .select("*")
        .not("last_contacted_date", "is", null)
        .order("last_contacted_date", { ascending: false })
        .limit(8),
      branchFilter || null
    ),
    scopeCompanies(
      supabase
        .from("companies")
        .select("*")
        .or(`last_contacted_date.is.null,last_contacted_date.lt.${thirtyDaysAgo.toISOString()}`)
        .order("last_contacted_date", { ascending: true, nullsFirst: true })
        .limit(25),
      branchFilter || null
    ),
    scopeCompanies(
      supabase.from("companies").select("id", { count: "exact", head: true }).lt("next_follow_up_date", todayStr),
      branchFilter || null
    ),
    scopeCompanies(
      supabase.from("companies").select("id", { count: "exact", head: true }).eq("next_follow_up_date", todayStr),
      branchFilter || null
    ),
    scopeCompanies(
      supabase
        .from("companies")
        .select("*")
        .lte("next_follow_up_date", todayStr)
        .order("next_follow_up_date", { ascending: true })
        .limit(25),
      branchFilter || null
    ),
    activityTypeBreakdownSince(supabase, today, branchFilter, branchCompanyIds),
    activityTypeBreakdownSince(supabase, week, branchFilter, branchCompanyIds),
    activityTypeBreakdownSince(supabase, month, branchFilter, branchCompanyIds),
    activityTypeBreakdownSince(supabase, year, branchFilter, branchCompanyIds),
    branchBreakdownSince(supabase, today, branchFilter),
    branchBreakdownSince(supabase, week, branchFilter),
    branchBreakdownSince(supabase, month, branchFilter),
    branchBreakdownSince(supabase, year, branchFilter),
  ]);

  const typeCounts: Record<string, number> = { Email: 0, Call: 0, "In-Person Visit": 0, Other: 0 };
  (typeRows ?? []).forEach((r: { activity_type: string }) => {
    typeCounts[r.activity_type] = (typeCounts[r.activity_type] ?? 0) + 1;
  });
  const totalActivities = Object.values(typeCounts).reduce((a, b) => a + b, 0);

  const statusCounts: Record<CompanyStatus, number> = { Cold: 0, Warm: 0, Quoting: 0, Customer: 0 };
  (statusRows ?? []).forEach((r: { status: CompanyStatus }) => {
    statusCounts[r.status] = (statusCounts[r.status] ?? 0) + 1;
  });
  const totalCompanies = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  const ACTIVITY_TYPE_COLORS: Record<string, string> = {
    Email: "#3B82F6",
    Call: "#10B981",
    "In-Person Visit": "#E0862E",
    Other: "#9CA9BB",
  };
  const touchBreakdownRows: BreakdownRow[] = ["Email", "Call", "In-Person Visit", "Other"].map((type) => ({
    label: type,
    color: ACTIVITY_TYPE_COLORS[type],
    values: [
      touchesByTypeToday[type] ?? 0,
      touchesByTypeWeek[type] ?? 0,
      touchesByTypeMonth[type] ?? 0,
      touchesByTypeYear[type] ?? 0,
    ],
  }));

  const BRANCH_COLORS = ["#3B82F6", "#E0862E", "#10B981", "#8B5CF6", "#EC4899", "#F59E0B"];
  const branchList = (branches as Branch[] | null) ?? [];
  const branchRowDefs = [
    ...branchList.map((b, i) => ({ id: b.id, label: b.name, color: BRANCH_COLORS[i % BRANCH_COLORS.length] })),
    { id: "__none__", label: "No branch", color: "#B4B2A9" },
  ];
  const companyBreakdownRows: BreakdownRow[] = branchRowDefs
    .map((def) => ({
      label: def.label,
      color: def.color,
      values: [
        companiesByBranchToday[def.id] ?? 0,
        companiesByBranchWeek[def.id] ?? 0,
        companiesByBranchMonth[def.id] ?? 0,
        companiesByBranchYear[def.id] ?? 0,
      ],
    }))
    // Hide rows that are all-zero across every period, so an unused branch
    // doesn't clutter the table.
    .filter((row) => row.values.some((v) => v > 0));

  const BREAKDOWN_COLUMNS = ["Today", "This week", "This month", "This year"];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-8">
        <div>
          <h1 className="font-display text-2xl font-medium text-manifest-navy-800 mb-1">Analytics</h1>
          <p className="text-sm text-manifest-navy-400">
            {activeBranch
              ? `Outreach activity and pipeline health for ${activeBranch.name}.`
              : "Outreach activity and pipeline health across your book of business."}
          </p>
        </div>
        {branches && branches.length > 0 && (
          <form method="get" className="flex items-end gap-2">
            <div>
              <label className="field-label" htmlFor="branch">
                Branch
              </label>
              <select id="branch" name="branch" defaultValue={branchFilter} className="field-input">
                <option value="">All branches</option>
                {(branches as Branch[]).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-secondary">
              Apply
            </button>
          </form>
        )}
      </div>

      {/* Follow-ups due */}
      <section className="mb-8">
        <SectionTitle
          title="Follow-ups due"
          subtitle="Based on each company's Next follow-up date"
        />
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="panel p-4 text-center border-red-200 bg-red-50/40">
            <div className="font-display text-2xl font-medium text-red-600">{overdueCount ?? 0}</div>
            <div className="text-xs text-manifest-navy-400 mt-0.5">Overdue</div>
          </div>
          <div className="panel p-4 text-center border-manifest-signal-100 bg-manifest-signal-50/30">
            <div className="font-display text-2xl font-medium text-manifest-signal-600">
              {dueTodayCount ?? 0}
            </div>
            <div className="text-xs text-manifest-navy-400 mt-0.5">Due today</div>
          </div>
        </div>
        <div className="panel p-5">
          <ul className="divide-y divide-manifest-line max-h-96 overflow-y-auto">
            {(followUpsDue as Company[] | null)?.map((c) => {
              const overdue = c.next_follow_up_date! < todayStr;
              return (
                <li key={c.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <Link
                      href={`/companies/${c.id}`}
                      className="text-sm font-medium text-manifest-navy-800 hover:text-manifest-signal truncate block"
                    >
                      {c.name}
                    </Link>
                    <StatusBadge status={c.status} />
                  </div>
                  <span
                    className={`text-xs font-mono shrink-0 ${
                      overdue ? "text-red-500 font-semibold" : "text-manifest-signal-600 font-semibold"
                    }`}
                  >
                    {format(new Date(c.next_follow_up_date! + "T00:00:00"), "MMM d, yyyy")}
                  </span>
                </li>
              );
            })}
            {(!followUpsDue || followUpsDue.length === 0) && (
              <li className="py-3 text-sm text-manifest-navy-400">Nothing due — you're all caught up.</li>
            )}
          </ul>
        </div>
      </section>

      {/* Outreach touches */}
      <section className="mb-8">
        <SectionTitle
          title="Outreach touches logged"
          subtitle="Emails, calls, and visits logged — a proxy for how many contacts were made"
        />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Today" value={contactsToday} />
          <MetricCard label="This week" value={contactsWeek} />
          <MetricCard label="This month" value={contactsMonth} />
          <MetricCard label="This year" value={contactsYear} />
        </div>
        <ExpandableBreakdown
          columns={BREAKDOWN_COLUMNS}
          rows={touchBreakdownRows}
          toggleLabel="Show breakdown by type (calls, emails, visits)"
        />
      </section>

      {/* Companies added */}
      <section className="mb-8">
        <SectionTitle title="Company profiles added" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label="Today" value={companiesToday} />
          <MetricCard label="This week" value={companiesWeek} />
          <MetricCard label="This month" value={companiesMonth} />
          <MetricCard label="This year" value={companiesYear} />
        </div>
        {companyBreakdownRows.length > 0 && (
          <ExpandableBreakdown columns={BREAKDOWN_COLUMNS} rows={companyBreakdownRows} toggleLabel="Show breakdown by branch" />
        )}
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* Activity breakdown */}
        <div className="panel p-5">
          <SectionTitle title="Activity breakdown by type" compact />
          <div className="space-y-3 mt-3">
            <BarRow label="Email" value={typeCounts.Email} total={totalActivities} color="bg-blue-500" />
            <BarRow label="Call" value={typeCounts.Call} total={totalActivities} color="bg-emerald-500" />
            <BarRow
              label="In-Person Visit"
              value={typeCounts["In-Person Visit"]}
              total={totalActivities}
              color="bg-manifest-signal"
            />
            <BarRow label="Other" value={typeCounts.Other} total={totalActivities} color="bg-manifest-navy-400" />
          </div>
        </div>

        {/* Status breakdown */}
        <div className="panel p-5">
          <SectionTitle title="Companies by status" compact />
          <div className="space-y-3 mt-3">
            {COMPANY_STATUSES.map((status) => (
              <BarRow
                key={status}
                label={status}
                value={statusCounts[status]}
                total={totalCompanies}
                color={
                  status === "Cold"
                    ? "bg-status-cold"
                    : status === "Warm"
                    ? "bg-status-warm"
                    : status === "Quoting"
                    ? "bg-status-quoting"
                    : "bg-status-customer"
                }
              />
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recently contacted */}
        <div className="panel p-5">
          <SectionTitle title="Recently contacted" compact />
          <ul className="mt-3 divide-y divide-manifest-line">
            {(recentlyContacted as Company[] | null)?.map((c) => (
              <li key={c.id} className="py-2.5 flex items-center justify-between gap-3">
                <Link href={`/companies/${c.id}`} className="text-sm font-medium text-manifest-navy-800 hover:text-manifest-signal truncate">
                  {c.name}
                </Link>
                <span className="text-xs font-mono text-manifest-navy-400 shrink-0">
                  {c.last_contacted_date ? format(new Date(c.last_contacted_date), "MMM d") : "—"}
                </span>
              </li>
            ))}
            {(!recentlyContacted || recentlyContacted.length === 0) && (
              <li className="py-3 text-sm text-manifest-navy-400">No activity logged yet.</li>
            )}
          </ul>
        </div>

        {/* Not contacted in 30+ days */}
        <div className="panel p-5">
          <SectionTitle title="Not contacted in 30+ days" compact />
          <ul className="mt-3 divide-y divide-manifest-line max-h-80 overflow-y-auto">
            {(staleCompanies as Company[] | null)?.map((c) => (
              <li key={c.id} className="py-2.5 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <Link href={`/companies/${c.id}`} className="text-sm font-medium text-manifest-navy-800 hover:text-manifest-signal truncate block">
                    {c.name}
                  </Link>
                  <StatusBadge status={c.status} />
                </div>
                <span className="text-xs font-mono text-red-500 shrink-0">
                  {c.last_contacted_date ? format(new Date(c.last_contacted_date), "MMM d, yyyy") : "Never"}
                </span>
              </li>
            ))}
            {(!staleCompanies || staleCompanies.length === 0) && (
              <li className="py-3 text-sm text-manifest-navy-400">Everyone is warm — nothing overdue.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title, subtitle, compact }: { title: string; subtitle?: string; compact?: boolean }) {
  return (
    <div className={compact ? "" : "mb-3"}>
      <h2 className="font-display text-base font-medium text-manifest-navy-800">{title}</h2>
      {subtitle && <p className="text-xs text-manifest-navy-400 mt-0.5">{subtitle}</p>}
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="panel p-4 text-center">
      <div className="font-display text-2xl font-medium text-manifest-navy-800">{value}</div>
      <div className="text-xs text-manifest-navy-400 mt-0.5">{label}</div>
    </div>
  );
}

function BarRow({
  label,
  value,
  total,
  color,
}: {
  label: string;
  value: number;
  total: number;
  color: string;
}) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="text-manifest-navy-600 font-medium">{label}</span>
        <span className="font-mono text-manifest-navy-400">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-manifest-navy-50 overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
