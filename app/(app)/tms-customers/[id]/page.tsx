import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import type { TmsCustomer, TmsCustomerContact } from "@/lib/types";
import DeleteButton from "@/components/DeleteButton";
import TmsCustomerContactList from "@/components/tms-customers/TmsCustomerContactList";
import { deleteTmsCustomer } from "@/actions/tms-customers";
import { createTmsCustomerContact, updateTmsCustomerContact, deleteTmsCustomerContact } from "@/actions/tms-customer-contacts";

export const dynamic = "force-dynamic";

function fmtMoney(v: number | null) {
  return v != null ? `$${Number(v).toFixed(2)}` : "—";
}

function fmtDate(d: string | null) {
  if (!d) return "Never";
  try {
    return format(new Date(d), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

export default async function TmsCustomerProfilePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: customer }, { data: contacts }, { data: loads }] = await Promise.all([
    supabase.from("tms_customers").select("*").eq("id", params.id).single(),
    supabase.from("tms_customer_contacts").select("*").eq("tms_customer_id", params.id).order("created_at", { ascending: true }),
    supabase.from("loads").select("id, status, customer_rate").eq("customer_id", params.id),
  ]);

  if (!customer) notFound();
  const c = customer as TmsCustomer;
  const boundDelete = deleteTmsCustomer.bind(null, c.id);
  const boundCreateContact = createTmsCustomerContact.bind(null, c.id);
  const boundUpdateContact = updateTmsCustomerContact.bind(null, c.id);
  const boundDeleteContact = deleteTmsCustomerContact.bind(null, c.id);

  const loadList = loads ?? [];
  const loadIds = loadList.map((l) => l.id);
  const { data: pickupStops } = loadIds.length
    ? await supabase.from("load_stops").select("date_start").eq("stop_type", "Pickup").in("load_id", loadIds)
    : { data: [] };

  const completedLoads = loadList.filter((l) => l.status === "Delivered");
  const grossRevenue = completedLoads.reduce((sum, l) => sum + (l.customer_rate ?? 0), 0);
  const lastShipment = (pickupStops ?? [])
    .map((s) => s.date_start)
    .filter(Boolean)
    .sort()
    .reverse()[0] as string | undefined;

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/tms-customers" className="text-sm text-manifest-navy-400 hover:text-manifest-navy-700">
        ← Back to customers
      </Link>

      <div className="flex items-start justify-between gap-4 mt-3 mb-6">
        <h1 className="font-display text-3xl font-medium text-manifest-navy-800">{c.name}</h1>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/tms-customers/${c.id}/edit`} className="btn-secondary text-sm">
            Edit
          </Link>
          <DeleteButton
            action={boundDelete}
            confirmMessage={`Delete ${c.name}? Loads already pointing to it will keep their history but lose this reference.`}
            label="Delete"
            className="btn-danger text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-6">
        <StatCard label="Completed loads" value={String(completedLoads.length)} />
        <StatCard label="Gross revenue" value={`$${grossRevenue.toFixed(2)}`} />
        <StatCard label="Last shipment" value={fmtDate(lastShipment ?? null)} isText />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="panel p-5">
            <dl className="space-y-3 text-sm">
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
            </dl>

            {c.notes && (
              <div className="mt-4 pt-4 border-t border-manifest-line">
                <div className="field-label mb-1">Notes</div>
                <p className="text-sm text-manifest-navy-700 whitespace-pre-wrap">{c.notes}</p>
              </div>
            )}
          </div>

          <div className="panel p-5">
            <h2 className="font-display text-lg font-medium text-manifest-navy-800 mb-3">Billing</h2>
            <dl className="space-y-2.5 text-sm">
              <InfoRow label="Billing cycle">{c.billing_cycle || "—"}</InfoRow>
              <InfoRow label="Payment method">{c.payment_method || "—"}</InfoRow>
              <InfoRow label="Credit limit">{fmtMoney(c.credit_limit)}</InfoRow>
            </dl>
          </div>
        </div>

        <div className="lg:col-span-2">
          <TmsCustomerContactList
            contacts={(contacts as TmsCustomerContact[]) ?? []}
            createContact={boundCreateContact}
            updateContact={boundUpdateContact}
            deleteContact={boundDeleteContact}
          />
        </div>
      </div>
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

function StatCard({ label, value, isText }: { label: string; value: string; isText?: boolean }) {
  return (
    <div className="panel p-4 text-center">
      <div className={`font-display font-medium text-manifest-navy-800 ${isText ? "text-base" : "text-xl font-mono"}`}>
        {value}
      </div>
      <div className="text-xs text-manifest-navy-400 mt-0.5">{label}</div>
    </div>
  );
}
