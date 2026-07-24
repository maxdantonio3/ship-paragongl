import Link from "next/link";
import { notFound } from "next/navigation";
import { format, formatDistanceToNow } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import type { Activity, Branch, Company, CompanyStats, Contact, Note, UserSettings, CompanyStatusHistory } from "@/lib/types";
import StatusBadge from "@/components/StatusBadge";
import CompanyStatusSelect from "@/components/CompanyStatusSelect";
import ContactList from "@/components/ContactList";
import ActivityLog from "@/components/ActivityLog";
import NotesLog from "@/components/NotesLog";
import FollowUpControl from "@/components/FollowUpControl";
import DeleteButton from "@/components/DeleteButton";
import CompanyTimeline from "@/components/CompanyTimeline";
import { createContact, updateContact, deleteContact } from "@/actions/contacts";
import { createActivity, updateActivity, deleteActivity } from "@/actions/activities";
import { createNote, deleteNote } from "@/actions/notes";
import { deleteCompany } from "@/actions/companies";

export const dynamic = "force-dynamic";

function fmtDate(d: string | null) {
  if (!d) return "Never";
  return format(new Date(d), "MMM d, yyyy");
}

export default async function CompanyProfilePage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [{ data: company }, { data: contacts }, { data: activities }, { data: notes }, { data: stats }, { data: statusHistory }] =
    await Promise.all([
      supabase.from("companies").select("*").eq("id", params.id).single(),
      supabase
        .from("contacts")
        .select("*")
        .eq("company_id", params.id)
        .order("created_at", { ascending: true }),
      supabase
        .from("activities")
        .select("*")
        .eq("company_id", params.id)
        .order("activity_date", { ascending: false }),
      supabase
        .from("notes")
        .select("*")
        .eq("company_id", params.id)
        .order("created_at", { ascending: false }),
      supabase.from("company_stats").select("*").eq("company_id", params.id).maybeSingle(),
      supabase
        .from("company_status_history")
        .select("*")
        .eq("company_id", params.id)
        .order("changed_at", { ascending: true }),
    ]);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: userSettings } = user
    ? await supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle()
    : { data: null };
  const defaultFollowUpDays = (userSettings as UserSettings | null)?.default_follow_up_days ?? 7;

  const branchId = (company as Company | null)?.branch_id ?? null;
  const { data: branch } = branchId
    ? await supabase.from("branches").select("*").eq("id", branchId).maybeSingle()
    : { data: null };

  if (!company) notFound();

  const c = company as Company;
  const s = stats as CompanyStats | null;

  const boundCreateContact = createContact.bind(null, c.id);
  const boundUpdateContact = updateContact.bind(null, c.id);
  const boundDeleteContact = deleteContact.bind(null, c.id);
  const boundCreateActivity = createActivity.bind(null, c.id);
  const boundUpdateActivity = updateActivity.bind(null, c.id);
  const boundDeleteActivity = deleteActivity.bind(null, c.id);
  const boundCreateNote = createNote.bind(null, c.id);
  const boundDeleteNote = deleteNote.bind(null, c.id);
  const boundDeleteCompany = deleteCompany.bind(null, c.id);

  const daysSinceContact = c.last_contacted_date
    ? Math.floor((Date.now() - new Date(c.last_contacted_date).getTime()) / 86400000)
    : null;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link href="/dashboard" className="text-sm text-manifest-navy-400 hover:text-manifest-navy-700">
        ← Back to dashboard
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mt-3 mb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-3xl font-medium text-manifest-navy-800">{c.name}</h1>
            <CompanyStatusSelect companyId={c.id} status={c.status} />
          </div>
          {c.industry && <p className="text-sm text-manifest-navy-400 mt-1">{c.industry}</p>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/companies/${c.id}/edit`} className="btn-secondary text-sm">
            Edit
          </Link>
          <DeleteButton
            action={boundDeleteCompany}
            confirmMessage={`Delete ${c.name} and all of its contacts, activity, and notes? This cannot be undone.`}
            label="Delete"
            className="btn-danger text-sm"
          />
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <StatCard label="Contacts" value={s?.total_contacts ?? 0} />
        <StatCard label="Emails" value={s?.email_count ?? 0} />
        <StatCard label="Calls" value={s?.call_count ?? 0} />
        <StatCard label="Visits" value={s?.visit_count ?? 0} />
        <StatCard label="Total activity" value={s?.total_activities ?? 0} highlight />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: company info */}
        <div className="lg:col-span-1 space-y-6">
          <FollowUpControl
            companyId={c.id}
            nextFollowUpDate={c.next_follow_up_date}
            defaultDays={defaultFollowUpDays}
          />

          <div className="panel p-5">
            <h2 className="font-display text-lg font-medium text-manifest-navy-800 mb-4">
              Company information
            </h2>
            <dl className="space-y-3 text-sm">
              {branch && <InfoRow label="Branch">{(branch as Branch).name}</InfoRow>}
              <InfoRow label="Address">
                {c.address ? (
                  <>
                    {c.address}
                    <br />
                    {[c.city, c.state, c.zip].filter(Boolean).join(", ")}
                  </>
                ) : (
                  [c.city, c.state, c.zip].filter(Boolean).join(", ") || "—"
                )}
              </InfoRow>
              <InfoRow label="Phone">
                <span className="font-mono">{c.phone || "—"}</span>
              </InfoRow>
              <InfoRow label="Email">{c.email || "—"}</InfoRow>
              <InfoRow label="Website">
                {c.website ? (
                  <a href={c.website} target="_blank" rel="noreferrer" className="text-manifest-signal hover:underline">
                    {c.website.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  "—"
                )}
              </InfoRow>
              <InfoRow label="Google Maps">
                {c.google_maps_link ? (
                  <a
                    href={c.google_maps_link}
                    target="_blank"
                    rel="noreferrer"
                    className="text-manifest-signal hover:underline"
                  >
                    Open in Maps ↗
                  </a>
                ) : (
                  "—"
                )}
              </InfoRow>
              <InfoRow label="Date added">{fmtDate(c.date_added)}</InfoRow>
              <InfoRow label="Last contacted">
                {fmtDate(c.last_contacted_date)}
                {daysSinceContact !== null && daysSinceContact >= 30 && (
                  <span className="ml-2 inline-block rounded-full bg-red-50 text-red-600 border border-red-200 px-2 py-0.5 text-[11px] font-semibold">
                    {daysSinceContact}d ago
                  </span>
                )}
              </InfoRow>
            </dl>

            {c.notes_summary && (
              <div className="mt-4 pt-4 border-t border-manifest-line">
                <div className="field-label mb-1">Notes summary</div>
                <p className="text-sm text-manifest-navy-600">{c.notes_summary}</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: contacts, activity, notes */}
        <div className="lg:col-span-2 space-y-6">
          <ContactList
            companyId={c.id}
            contacts={(contacts as Contact[]) ?? []}
            createContact={boundCreateContact}
            updateContact={boundUpdateContact}
            deleteContact={boundDeleteContact}
          />
          <ActivityLog
            contacts={(contacts as Contact[]) ?? []}
            activities={(activities as Activity[]) ?? []}
            createActivity={boundCreateActivity}
            updateActivity={boundUpdateActivity}
            deleteActivity={boundDeleteActivity}
          />
          <NotesLog
            notes={(notes as Note[]) ?? []}
            createNote={boundCreateNote}
            deleteNote={boundDeleteNote}
          />
        </div>
      </div>

      <div className="panel p-5 mt-6">
        <h2 className="font-display text-lg font-medium text-manifest-navy-800 mb-4">Timeline</h2>
        <CompanyTimeline
          dateAdded={c.date_added}
          activities={(activities as Activity[]) ?? []}
          statusHistory={(statusHistory as CompanyStatusHistory[]) ?? []}
        />
      </div>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div className={`panel p-4 text-center ${highlight ? "border-manifest-signal-100 bg-manifest-signal-50/30" : ""}`}>
      <div className={`font-display text-2xl font-medium ${highlight ? "text-manifest-signal-600" : "text-manifest-navy-800"}`}>
        {value}
      </div>
      <div className="text-xs text-manifest-navy-400 mt-0.5">{label}</div>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <dt className="text-manifest-navy-400 col-span-1">{label}</dt>
      <dd className="col-span-2 text-manifest-navy-700">{children}</dd>
    </div>
  );
}
