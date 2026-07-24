import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Branch, Company, CompanyStats, CompanyStatus } from "@/lib/types";
import { COMPANY_STATUSES } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import CompanyStatusSelect from "@/components/CompanyStatusSelect";
import QuickLogActivity from "@/components/QuickLogActivity";
import CopyableEmail from "@/components/CopyableEmail";
import CopyableText from "@/components/CopyableText";
import ClickableTableRow from "@/components/ClickableTableRow";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

type SortKey = "last_contacted_date" | "name" | "city" | "date_added" | "next_follow_up_date";

function fmtDate(d: string | null) {
  if (!d) return "—";
  try {
    return format(new Date(d), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

function FollowUpCell({ date }: { date: string | null }) {
  if (!date) return <span className="text-manifest-navy-400">—</span>;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = new Date(date + "T00:00:00");
  const diffDays = Math.round((d.getTime() - today.getTime()) / 86400000);

  let className = "text-manifest-navy-600";
  if (diffDays < 0) className = "text-red-600 font-semibold";
  else if (diffDays === 0) className = "text-manifest-signal-600 font-semibold";

  return <span className={className}>{format(d, "MMM d, yyyy")}</span>;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; sort?: string; dir?: string; due?: string; branch?: string };
}) {
  const supabase = createClient();

  const q = (searchParams.q ?? "").trim();
  const statusFilter = (searchParams.status ?? "") as CompanyStatus | "";
  const sort = (searchParams.sort ?? "last_contacted_date") as SortKey;
  const dir = searchParams.dir === "asc" ? "asc" : "desc";
  const dueOnly = searchParams.due === "1";
  const branchFilter = searchParams.branch ?? "";

  const { data: branches } = await supabase.from("branches").select("*").order("name");
  const branchMap = new Map<string, string>();
  (branches ?? []).forEach((b: Branch) => branchMap.set(b.id, b.name));
  const hasBranches = !!branches && branches.length > 0;

  let matchedCompanyIds: string[] | null = null;

  if (q) {
    const [companyMatch, contactMatch] = await Promise.all([
      supabase
        .from("companies")
        .select("id")
        .or(
          `name.ilike.%${q}%,city.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%,status.ilike.%${q}%`
        ),
      supabase
        .from("contacts")
        .select("company_id")
        .or(
          `first_name.ilike.%${q}%,last_name.ilike.%${q}%,email.ilike.%${q}%,phone.ilike.%${q}%`
        ),
    ]);

    const ids = new Set<string>();
    (companyMatch.data ?? []).forEach((c) => ids.add(c.id));
    (contactMatch.data ?? []).forEach((c) => c.company_id && ids.add(c.company_id));
    matchedCompanyIds = Array.from(ids);
  }

  let query = supabase.from("companies").select("*");

  if (statusFilter) query = query.eq("status", statusFilter);
  if (branchFilter) query = query.eq("branch_id", branchFilter);
  if (dueOnly) query = query.lte("next_follow_up_date", format(new Date(), "yyyy-MM-dd"));
  if (matchedCompanyIds !== null) {
    if (matchedCompanyIds.length === 0) {
      query = query.eq("id", "00000000-0000-0000-0000-000000000000"); // force empty
    } else {
      query = query.in("id", matchedCompanyIds);
    }
  }

  query = query.order(sort, { ascending: dir === "asc", nullsFirst: false });

  const { data: companies, error } = await query;

  const companyIds = (companies ?? []).map((c) => c.id);
  const { data: stats } = companyIds.length
    ? await supabase.from("company_stats").select("*").in("company_id", companyIds)
    : { data: [] as CompanyStats[] };

  const statsMap = new Map<string, CompanyStats>();
  (stats ?? []).forEach((s) => statsMap.set(s.company_id, s as CompanyStats));

  const rows = (companies ?? []) as Company[];

  const sortLink = (key: SortKey, label: string) => {
    const nextDir = sort === key && dir === "desc" ? "asc" : "desc";
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (statusFilter) params.set("status", statusFilter);
    if (dueOnly) params.set("due", "1");
    if (branchFilter) params.set("branch", branchFilter);
    params.set("sort", key);
    params.set("dir", nextDir);
    const active = sort === key;
    return (
      <Link
        href={`/dashboard?${params.toString()}`}
        className={`inline-flex items-center gap-1 hover:text-manifest-navy-800 ${
          active ? "text-manifest-navy-800" : "text-manifest-navy-400"
        }`}
      >
        {label}
        {active && <span className="text-[10px]">{dir === "desc" ? "▼" : "▲"}</span>}
      </Link>
    );
  };

  return (
    <div className="px-6 py-8 max-w-[1800px] mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-medium text-manifest-navy-800">Dashboard</h1>
          <p className="text-sm text-manifest-navy-400 mt-1">
            {rows.length} {rows.length === 1 ? "company" : "companies"} in view
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/companies/bulk-edit" className="btn-secondary">
            Bulk edit
          </Link>
          <Link href="/companies/new" className="btn-primary">
            + Add company
          </Link>
        </div>
      </div>

      {/* Filters */}
      <form className="panel p-4 mb-5 flex flex-wrap items-end gap-4" method="get">
        <div className="flex-1 min-w-[220px]">
          <label className="field-label" htmlFor="q">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Company, city, contact, email, phone, status…"
            className="field-input"
          />
        </div>
        <div className="w-44">
          <label className="field-label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={statusFilter} className="field-input">
            <option value="">All statuses</option>
            {COMPANY_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        {hasBranches && (
          <div className="w-44">
            <label className="field-label" htmlFor="branch">
              Branch
            </label>
            <select id="branch" name="branch" defaultValue={branchFilter} className="field-input">
              <option value="">All branches</option>
              {branches!.map((b: Branch) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="dir" value={dir} />
        <label className="flex items-center gap-2 text-sm text-manifest-navy-600 pb-2 whitespace-nowrap">
          <input
            type="checkbox"
            name="due"
            value="1"
            defaultChecked={dueOnly}
            className="rounded border-manifest-line"
          />
          Due for follow-up
        </label>
        <button type="submit" className="btn-secondary">
          Apply
        </button>
        {(q || statusFilter || dueOnly || branchFilter) && (
          <Link href="/dashboard" className="text-sm text-manifest-navy-400 hover:text-manifest-navy-700">
            Clear
          </Link>
        )}
      </form>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error.message}
        </div>
      )}

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-manifest-line bg-manifest-navy-50/50 text-left">
                <th className="px-4 py-3 font-semibold min-w-[180px]">{sortLink("name", "Company")}</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Status</th>
                {hasBranches && <th className="hidden xl:table-cell px-4 py-3 font-semibold whitespace-nowrap">Branch</th>}
                <th className="px-4 py-3 font-semibold whitespace-nowrap">{sortLink("city", "City")}</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Phone</th>
                <th className="px-4 py-3 font-semibold min-w-[240px]">Email</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">
                  {sortLink("last_contacted_date", "Last contact")}
                </th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">
                  {sortLink("next_follow_up_date", "Follow-up")}
                </th>
                <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">Activities</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Quick log</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const s = statsMap.get(c.id);
                return (
                  <ClickableTableRow
                    key={c.id}
                    href={`/companies/${c.id}`}
                    className="border-b border-manifest-line last:border-0 hover:bg-manifest-navy-50/40 transition"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/companies/${c.id}`}
                        className="font-medium text-manifest-navy-800 hover:text-manifest-signal"
                      >
                        {c.name}
                      </Link>
                      {c.industry && (
                        <div className="text-xs text-manifest-navy-400">{c.industry}</div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <CompanyStatusSelect companyId={c.id} status={c.status} compact />
                    </td>
                    {hasBranches && (
                      <td className="hidden xl:table-cell px-4 py-3 text-manifest-navy-600 whitespace-nowrap">
                        {c.branch_id ? branchMap.get(c.branch_id) ?? "—" : "—"}
                      </td>
                    )}
                    <td className="px-4 py-3 text-manifest-navy-600 whitespace-nowrap">
                      {c.city ? `${c.city}${c.state ? `, ${c.state}` : ""}` : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-manifest-navy-600 whitespace-nowrap">
                      <CopyableText value={c.phone} label="Copy phone" />
                    </td>
                    <td className="px-4 py-3 text-manifest-navy-600 min-w-[240px] max-w-[320px]">
                      <CopyableEmail email={c.email} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-manifest-navy-600 whitespace-nowrap">
                      {fmtDate(c.last_contacted_date)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">
                      <FollowUpCell date={c.next_follow_up_date} />
                    </td>
                    <td className="px-4 py-3 text-center font-mono font-semibold text-manifest-navy-800">
                      {s?.total_activities ?? 0}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <QuickLogActivity companyId={c.id} companyName={c.name} />
                    </td>
                  </ClickableTableRow>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={hasBranches ? 10 : 9} className="px-4 py-12 text-center text-manifest-navy-400">
                    No companies match this view.{" "}
                    <Link href="/companies/new" className="text-manifest-signal hover:underline">
                      Add one
                    </Link>
                    .
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
