import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Carrier, CarrierStats, CarrierStatus, EquipmentType } from "@/lib/types";
import { CARRIER_STATUSES } from "@/lib/types";
import CarrierStatusSelect from "@/components/carriers/CarrierStatusSelect";
import ClickableTableRow from "@/components/ClickableTableRow";
import { format } from "date-fns";

export const dynamic = "force-dynamic";

type SortKey = "name" | "mc_number" | "insurance_expiration" | "status";

function fmtDate(d: string | null) {
  if (!d) return "—";
  try {
    return format(new Date(d), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

export default async function CarriersDashboardPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; sort?: string; dir?: string };
}) {
  const supabase = createClient();

  const q = (searchParams.q ?? "").trim();
  // Per spec: Inactive / Do Not Use carriers still exist but are excluded
  // from normal searches unless specifically requested — so the default
  // view (no status param at all) shows Active only, not everything.
  const statusParam = searchParams.status ?? "Active";
  const sort = (searchParams.sort ?? "name") as SortKey;
  const dir = searchParams.dir === "desc" ? "desc" : "asc";

  let query = supabase.from("carriers").select("*");

  if (statusParam !== "All") {
    query = query.eq("status", statusParam as CarrierStatus);
  }
  if (q) {
    query = query.or(`name.ilike.%${q}%,mc_number.ilike.%${q}%,dot_number.ilike.%${q}%`);
  }

  query = query.order(sort, { ascending: dir === "asc", nullsFirst: false });

  const { data: carriers, error } = await query;
  const rows = (carriers as Carrier[]) ?? [];

  const carrierIds = rows.map((c) => c.id);
  const [{ data: stats }, { data: equipmentLinks }, { data: allEquipmentTypes }] = await Promise.all([
    carrierIds.length
      ? supabase.from("carrier_stats").select("*").in("carrier_id", carrierIds)
      : Promise.resolve({ data: [] as CarrierStats[] }),
    carrierIds.length
      ? supabase.from("carrier_equipment_types").select("carrier_id, equipment_type_id").in("carrier_id", carrierIds)
      : Promise.resolve({ data: [] as { carrier_id: string; equipment_type_id: string }[] }),
    supabase.from("equipment_types").select("*"),
  ]);

  const statsMap = new Map<string, CarrierStats>();
  (stats ?? []).forEach((s) => statsMap.set(s.carrier_id, s as CarrierStats));

  const equipmentNameMap = new Map<string, string>();
  ((allEquipmentTypes as EquipmentType[]) ?? []).forEach((e) => equipmentNameMap.set(e.id, e.name));

  const equipmentByCarrier = new Map<string, string[]>();
  (equipmentLinks ?? []).forEach((link) => {
    const name = equipmentNameMap.get(link.equipment_type_id);
    if (!name) return;
    const list = equipmentByCarrier.get(link.carrier_id) ?? [];
    list.push(name);
    equipmentByCarrier.set(link.carrier_id, list);
  });

  const sortLink = (key: SortKey, label: string) => {
    const nextDir = sort === key && dir === "asc" ? "desc" : "asc";
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (statusParam) params.set("status", statusParam);
    params.set("sort", key);
    params.set("dir", nextDir);
    const active = sort === key;
    return (
      <Link
        href={`/carriers?${params.toString()}`}
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
          <h1 className="font-display text-2xl font-medium text-manifest-navy-800">Carriers</h1>
          <p className="text-sm text-manifest-navy-400 mt-1">
            {rows.length} {rows.length === 1 ? "carrier" : "carriers"} in view
          </p>
        </div>
        <Link href="/carriers/new" className="btn-primary">
          + Add carrier
        </Link>
      </div>

      <form className="panel p-4 mb-5 flex flex-wrap items-end gap-4" method="get">
        <div className="flex-1 min-w-[220px]">
          <label className="field-label" htmlFor="q">
            Search
          </label>
          <input
            id="q"
            name="q"
            defaultValue={q}
            placeholder="Carrier name, MC number, DOT number…"
            className="field-input"
          />
        </div>
        <div className="w-48">
          <label className="field-label" htmlFor="status">
            Status
          </label>
          <select id="status" name="status" defaultValue={statusParam} className="field-input">
            <option value="All">All statuses</option>
            {CARRIER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <input type="hidden" name="sort" value={sort} />
        <input type="hidden" name="dir" value={dir} />
        <button type="submit" className="btn-secondary">
          Apply
        </button>
        {(q || statusParam !== "Active") && (
          <Link href="/carriers" className="text-sm text-manifest-navy-400 hover:text-manifest-navy-700">
            Reset to Active only
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
                <th className="px-4 py-3 font-semibold min-w-[180px]">{sortLink("name", "Carrier name")}</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">{sortLink("mc_number", "MC number")}</th>
                <th className="px-4 py-3 font-semibold min-w-[160px]">Equipment types</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Last used</th>
                <th className="px-4 py-3 font-semibold text-center whitespace-nowrap">Total loads</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Carrier rating</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">
                  {sortLink("insurance_expiration", "Insurance exp.")}
                </th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">{sortLink("status", "Status")}</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((c) => {
                const s = statsMap.get(c.id);
                const equipment = equipmentByCarrier.get(c.id) ?? [];
                return (
                  <ClickableTableRow
                    key={c.id}
                    href={`/carriers/${c.id}`}
                    className="border-b border-manifest-line last:border-0 hover:bg-manifest-navy-50/40 transition"
                  >
                    <td className="px-4 py-3">
                      <Link href={`/carriers/${c.id}`} className="font-medium text-manifest-navy-800 hover:text-manifest-signal">
                        {c.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-manifest-navy-600 whitespace-nowrap">
                      {c.mc_number || "—"}
                    </td>
                    <td className="px-4 py-3 text-manifest-navy-600">
                      {equipment.length > 0 ? equipment.join(", ") : "—"}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-manifest-navy-600 whitespace-nowrap">
                      {fmtDate(s?.last_used ?? null)}
                    </td>
                    <td className="px-4 py-3 text-center font-mono">{s?.total_loads ?? 0}</td>
                    <td className="px-4 py-3 text-xs whitespace-nowrap">
                      {s?.avg_rating != null ? (
                        <span className="text-yellow-500">
                          ★ {s.avg_rating.toFixed(1)}{" "}
                          <span className="text-manifest-navy-400">({s.rating_count})</span>
                        </span>
                      ) : (
                        <span className="text-manifest-navy-400">No ratings yet</span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-manifest-navy-600 whitespace-nowrap">
                      {fmtDate(c.insurance_expiration)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <CarrierStatusSelect carrierId={c.id} status={c.status} compact />
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <Link href={`/carriers/${c.id}/edit`} className="btn-secondary text-xs px-2.5 py-1">
                        Edit
                      </Link>
                    </td>
                  </ClickableTableRow>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-manifest-navy-400">
                    No carriers match this view.{" "}
                    <Link href="/carriers/new" className="text-manifest-signal hover:underline">
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
