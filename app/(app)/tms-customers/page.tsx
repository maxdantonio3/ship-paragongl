import Link from "next/link";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import type { TmsCustomer } from "@/lib/types";
import CopyableText from "@/components/CopyableText";
import ClickableTableRow from "@/components/ClickableTableRow";

export const dynamic = "force-dynamic";

function fmtDate(d: string | null) {
  if (!d) return "Never";
  try {
    return format(new Date(d), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

export default async function TmsCustomersPage({ searchParams }: { searchParams: { q?: string } }) {
  const supabase = createClient();
  const q = (searchParams.q ?? "").trim();

  let query = supabase.from("tms_customers").select("*").order("name");
  if (q) {
    query = query.or(`name.ilike.%${q}%,email.ilike.%${q}%`);
  }

  const { data: customers, error } = await query;
  const rows = (customers as TmsCustomer[]) ?? [];
  const customerIds = rows.map((c) => c.id);

  const [{ data: contacts }, { data: loads }] = await Promise.all([
    customerIds.length
      ? supabase.from("tms_customer_contacts").select("tms_customer_id, name, email").in("tms_customer_id", customerIds)
      : Promise.resolve({ data: [] }),
    customerIds.length
      ? supabase.from("loads").select("id, customer_id, status, customer_rate").in("customer_id", customerIds)
      : Promise.resolve({ data: [] }),
  ]);

  const firstContactByCustomer = new Map<string, { name: string; email: string | null }>();
  (contacts ?? []).forEach((c: { tms_customer_id: string; name: string; email: string | null }) => {
    if (!firstContactByCustomer.has(c.tms_customer_id)) firstContactByCustomer.set(c.tms_customer_id, c);
  });

  const loadIds = (loads ?? []).map((l) => l.id);
  const { data: pickupStops } = loadIds.length
    ? await supabase.from("load_stops").select("load_id, date_start").eq("stop_type", "Pickup").in("load_id", loadIds)
    : { data: [] };
  const pickupDateByLoad = new Map<string, string>();
  (pickupStops ?? []).forEach((s: { load_id: string; date_start: string | null }) => {
    if (!s.date_start) return;
    const existing = pickupDateByLoad.get(s.load_id);
    if (!existing || s.date_start < existing) pickupDateByLoad.set(s.load_id, s.date_start);
  });

  const statsByCustomer = new Map<string, { completed: number; revenue: number; lastShipment: string | null }>();
  (loads ?? []).forEach((l: { id: string; customer_id: string; status: string; customer_rate: number | null }) => {
    const stat = statsByCustomer.get(l.customer_id) ?? { completed: 0, revenue: 0, lastShipment: null };
    if (l.status === "Delivered") {
      stat.completed += 1;
      stat.revenue += l.customer_rate ?? 0;
    }
    const pickupDate = pickupDateByLoad.get(l.id) ?? null;
    if (pickupDate && (!stat.lastShipment || pickupDate > stat.lastShipment)) stat.lastShipment = pickupDate;
    statsByCustomer.set(l.customer_id, stat);
  });

  return (
    <div className="px-6 py-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-medium text-manifest-navy-800">Customers</h1>
          <p className="text-sm text-manifest-navy-400 mt-1">
            {rows.length} {rows.length === 1 ? "customer" : "customers"} — a separate, smaller list
            than your full CRM company book.
          </p>
        </div>
        <Link href="/tms-customers/new" className="btn-primary">
          + Add customer
        </Link>
      </div>

      <form className="panel p-4 mb-5 flex flex-wrap items-end gap-4" method="get">
        <div className="flex-1 min-w-[220px]">
          <label className="field-label" htmlFor="q">
            Search
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Name, email…" className="field-input" />
        </div>
        <button type="submit" className="btn-secondary">
          Apply
        </button>
        {q && (
          <Link href="/tms-customers" className="text-sm text-manifest-navy-400 hover:text-manifest-navy-700">
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
                <th className="px-4 py-3 font-semibold min-w-[180px]">Name</th>
                <th className="px-4 py-3 font-semibold">City / State</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Phone</th>
                <th className="px-4 py-3 font-semibold">Accounting contact</th>
                <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">Completed loads</th>
                <th className="px-4 py-3 font-semibold text-right whitespace-nowrap">Gross revenue</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Last shipment</th>
                <th className="px-4 py-3 font-semibold">&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const contact = firstContactByCustomer.get(c.id);
                const stat = statsByCustomer.get(c.id);
                return (
                  <ClickableTableRow
                    key={c.id}
                    href={`/tms-customers/${c.id}`}
                    className="border-b border-manifest-line last:border-0 hover:bg-manifest-navy-50/40 transition"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/tms-customers/${c.id}`} className="font-medium text-manifest-navy-800 hover:text-manifest-signal">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-manifest-navy-600">{[c.city, c.state].filter(Boolean).join(", ") || "—"}</td>
                    <td className="px-4 py-3 font-mono text-xs text-manifest-navy-600 whitespace-nowrap">{c.phone || "—"}</td>
                    <td className="px-4 py-3 text-manifest-navy-600">
                      {contact ? (
                        <div>
                          <div>{contact.name}</div>
                          {contact.email && (
                            <CopyableText value={contact.email} label="Copy email" />
                          )}
                        </div>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 text-center font-mono">{stat?.completed ?? 0}</td>
                    <td className="px-4 py-3 text-right font-mono text-status-customer">
                      ${(stat?.revenue ?? 0).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-manifest-navy-600 whitespace-nowrap">
                      {fmtDate(stat?.lastShipment ?? null)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link href={`/tms-customers/${c.id}/edit`} className="btn-secondary text-xs px-2.5 py-1">
                        Edit
                      </Link>
                    </td>
                  </ClickableTableRow>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-manifest-navy-400">
                    No customers yet.{" "}
                    <Link href="/tms-customers/new" className="text-manifest-signal hover:underline">
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
