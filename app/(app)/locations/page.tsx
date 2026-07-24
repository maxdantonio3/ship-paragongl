import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { Location } from "@/lib/types";
import ClickableTableRow from "@/components/ClickableTableRow";

export const dynamic = "force-dynamic";

export default async function LocationsPage({ searchParams }: { searchParams: { q?: string } }) {
  const supabase = createClient();
  const q = (searchParams.q ?? "").trim();

  let query = supabase.from("locations").select("*").order("name");
  if (q) {
    query = query.or(`name.ilike.%${q}%,city.ilike.%${q}%,address.ilike.%${q}%`);
  }

  const { data: locations, error } = await query;
  const rows = (locations as Location[]) ?? [];

  return (
    <div className="px-6 py-8 max-w-[1400px] mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3 flex-wrap">
        <div>
          <h1 className="font-display text-2xl font-medium text-manifest-navy-800">Locations</h1>
          <p className="text-sm text-manifest-navy-400 mt-1">
            {rows.length} {rows.length === 1 ? "location" : "locations"} — reusable pickup/delivery
            addresses for Loads.
          </p>
        </div>
        <Link href="/locations/new" className="btn-primary">
          + Add location
        </Link>
      </div>

      <form className="panel p-4 mb-5 flex flex-wrap items-end gap-4" method="get">
        <div className="flex-1 min-w-[220px]">
          <label className="field-label" htmlFor="q">
            Search
          </label>
          <input id="q" name="q" defaultValue={q} placeholder="Name, city, address…" className="field-input" />
        </div>
        <button type="submit" className="btn-secondary">
          Apply
        </button>
        {q && (
          <Link href="/locations" className="text-sm text-manifest-navy-400 hover:text-manifest-navy-700">
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
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold whitespace-nowrap">Phone</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((loc) => (
                <ClickableTableRow
                  key={loc.id}
                  href={`/locations/${loc.id}`}
                  className="border-b border-manifest-line last:border-0 hover:bg-manifest-navy-50/40 transition"
                >
                  <td className="px-4 py-3">
                    <Link href={`/locations/${loc.id}`} className="font-medium text-manifest-navy-800 hover:text-manifest-signal">
                      {loc.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-manifest-navy-600">
                    {[loc.city, loc.state].filter(Boolean).join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-manifest-navy-600">{loc.contact_name || "—"}</td>
                  <td className="px-4 py-3 font-mono text-xs text-manifest-navy-600 whitespace-nowrap">
                    {loc.contact_phone || "—"}
                  </td>
                </ClickableTableRow>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-12 text-center text-manifest-navy-400">
                    No locations yet.{" "}
                    <Link href="/locations/new" className="text-manifest-signal hover:underline">
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
