import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Load, Carrier, TmsCustomer, Location, FactoringCompany, LoadStatus } from "@/lib/types";
import { LOAD_STATUSES } from "@/lib/types";
import LoadsTable, { type LoadRow } from "@/components/loads/LoadsTable";
import { getPodDocumentsForLoads } from "@/actions/load-documents";
import { getRatingsForLoads } from "@/actions/carrier-ratings";

export const dynamic = "force-dynamic";

export default async function LoadsPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string };
}) {
  const supabase = createClient();
  const q = (searchParams.q ?? "").trim();
  const statusParam = searchParams.status ?? "All";

  let query = supabase.from("loads").select("*").order("created_at", { ascending: false });
  if (statusParam !== "All") {
    query = query.eq("status", statusParam as LoadStatus);
  }
  if (q) {
    if (/^\d+$/.test(q)) {
      query = query.eq("load_number", Number(q));
    } else {
      query = query.or(`po_number.ilike.%${q}%,bol_number.ilike.%${q}%`);
    }
  }

  const { data: loads, error } = await query;
  const loadRows = (loads as Load[]) ?? [];

  const customerIds = Array.from(new Set(loadRows.map((l) => l.customer_id).filter(Boolean))) as string[];
  const carrierIds = Array.from(new Set(loadRows.map((l) => l.carrier_id).filter(Boolean))) as string[];
  const loadIds = loadRows.map((l) => l.id);

  const [{ data: customers }, { data: carriers }, { data: factoringCompanies }, { data: stops }] = await Promise.all([
    customerIds.length ? supabase.from("tms_customers").select("id, name").in("id", customerIds) : Promise.resolve({ data: [] }),
    carrierIds.length
      ? supabase.from("carriers").select("id, name, mc_number, payment_method, factoring_company_id").in("id", carrierIds)
      : Promise.resolve({ data: [] }),
    supabase.from("factoring_companies").select("id, name"),
    loadIds.length
      ? supabase
          .from("load_stops")
          .select("load_id, stop_type, date_start, location_id")
          .in("load_id", loadIds)
          .order("date_start")
      : Promise.resolve({ data: [] }),
  ]);

  const customerMap = new Map<string, string>();
  ((customers as Pick<TmsCustomer, "id" | "name">[]) ?? []).forEach((c) => customerMap.set(c.id, c.name));

  const factoringNameMap = new Map<string, string>();
  ((factoringCompanies as Pick<FactoringCompany, "id" | "name">[]) ?? []).forEach((f) => factoringNameMap.set(f.id, f.name));

  const carrierMap = new Map<string, Pick<Carrier, "id" | "name" | "mc_number" | "payment_method" | "factoring_company_id">>();
  ((carriers as Pick<Carrier, "id" | "name" | "mc_number" | "payment_method" | "factoring_company_id">[]) ?? []).forEach((c) =>
    carrierMap.set(c.id, c)
  );

  // Earliest pickup / earliest delivery stop per load.
  const pickupStopByLoad = new Map<string, { date_start: string | null; location_id: string | null }>();
  const deliveryStopByLoad = new Map<string, { date_start: string | null; location_id: string | null }>();
  (stops ?? []).forEach((s: { load_id: string; stop_type: string; date_start: string | null; location_id: string | null }) => {
    const map = s.stop_type === "Pickup" ? pickupStopByLoad : deliveryStopByLoad;
    if (!map.has(s.load_id)) map.set(s.load_id, { date_start: s.date_start, location_id: s.location_id });
  });

  const locationIds = Array.from(
    new Set(
      [...pickupStopByLoad.values(), ...deliveryStopByLoad.values()]
        .map((s) => s.location_id)
        .filter(Boolean) as string[]
    )
  );
  const { data: locations } = locationIds.length
    ? await supabase.from("locations").select("id, name, address, city, state, zip").in("id", locationIds)
    : { data: [] };
  const locationMap = new Map<string, Pick<Location, "id" | "name" | "address" | "city" | "state" | "zip">>();
  (locations ?? []).forEach((l) => locationMap.set(l.id, l));

  const podByLoad = await getPodDocumentsForLoads(loadIds);
  const ratingByLoad = await getRatingsForLoads(loadIds);

  function locationSummary(locationId: string | null) {
    if (!locationId) return { cityState: "", full: "" };
    const loc = locationMap.get(locationId);
    if (!loc) return { cityState: "", full: "" };
    const cityState = [loc.city, [loc.state, loc.zip].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    const full = [loc.name, loc.address, cityState].filter(Boolean).join(" — ");
    return { cityState, full };
  }

  const rows: LoadRow[] = loadRows.map((l) => {
    const carrier = l.carrier_id ? carrierMap.get(l.carrier_id) : undefined;
    const carrierPayment = !carrier
      ? "—"
      : carrier.payment_method === "ACH"
      ? "ACH"
      : carrier.payment_method === "Factoring"
      ? factoringNameMap.get(carrier.factoring_company_id ?? "") ?? "Factoring"
      : "—";

    const pickup = locationSummary(pickupStopByLoad.get(l.id)?.location_id ?? null);
    const delivery = locationSummary(deliveryStopByLoad.get(l.id)?.location_id ?? null);

    const revenue = l.customer_rate;
    const expense = l.carrier_cost;
    const margin = l.margin;
    const marginPct = revenue && revenue !== 0 && margin != null ? (margin / revenue) * 100 : null;

    return {
      id: l.id,
      load_number: l.load_number,
      status: l.status,
      customerName: l.customer_id ? customerMap.get(l.customer_id) ?? "—" : "—",
      carrierId: l.carrier_id,
      carrierName: carrier?.name ?? "Unassigned",
      carrierMcNumber: carrier?.mc_number ?? null,
      ratingStars: ratingByLoad[l.id]?.stars ?? null,
      ratingNote: ratingByLoad[l.id]?.note ?? null,
      pickupCityState: pickup.cityState,
      pickupFullAddress: pickup.full,
      deliveryCityState: delivery.cityState,
      deliveryFullAddress: delivery.full,
      carrierPayment,
      driverName: l.driver_name ?? "",
      driverPhone: l.driver_phone ?? "",
      revenue,
      expense,
      margin,
      marginPct,
      carrierPayStatus: l.carrier_pay_status,
      pglPayStatus: l.pgl_pay_status,
      podDocument: podByLoad[l.id] ?? null,
    };
  });

  return (
    <div className="px-3 py-8 max-w-[2200px] mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-medium text-manifest-navy-800">Loads</h1>
          <p className="text-sm text-manifest-navy-400 mt-1">
            {rows.length} {rows.length === 1 ? "load" : "loads"} in view
          </p>
        </div>
        <Link href="/loads/new" className="btn-primary">
          + Add load
        </Link>
      </div>

      <form className="panel p-4 mb-5 flex flex-wrap items-end gap-4" method="get">
        <div className="flex-1 min-w-[220px]">
          <label className="field-label" htmlFor="q">
            Search
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Load #, PO #, BOL #…" className="field-input" />
        </div>
        <div className="w-48">
          <label className="field-label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={statusParam} className="field-input">
            <option value="All">All statuses</option>
            {LOAD_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn-secondary">
          Apply
        </button>
        {(q || statusParam !== "All") && (
          <Link href="/loads" className="text-sm text-manifest-navy-400 hover:text-manifest-navy-700">
            Clear
          </Link>
        )}
      </form>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error.message}
        </div>
      )}

      <LoadsTable rows={rows} />
    </div>
  );
}
