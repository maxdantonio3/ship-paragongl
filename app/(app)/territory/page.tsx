import { createClient } from "@/lib/supabase/server";
import TerritoryMap, { type TerritoryCompany } from "@/components/territory/TerritoryMap";
import BackfillLocationsButton from "@/components/territory/BackfillLocationsButton";
import { countCompaniesMissingLocation } from "@/actions/territory";
import type { Branch, CompanyStats } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function TerritoryPage() {
  const supabase = createClient();

  // Only ever reads coordinates already stored in Supabase — no Places API
  // calls happen when this page loads.
  const { data: companies, error } = await supabase
    .from("companies")
    .select("id, name, status, city, state, phone, last_contacted_date, latitude, longitude")
    .not("latitude", "is", null)
    .not("longitude", "is", null);

  const { data: branches } = await supabase.from("branches").select("*").order("name");

  const missingCount = await countCompaniesMissingLocation();

  const companyIds = (companies ?? []).map((c) => c.id);
  const { data: stats } = companyIds.length
    ? await supabase.from("company_stats").select("*").in("company_id", companyIds)
    : { data: [] as CompanyStats[] };

  const statsMap = new Map<string, number>();
  (stats ?? []).forEach((s) => statsMap.set(s.company_id, (s as CompanyStats).total_contacts));

  const mapCompanies: TerritoryCompany[] = (companies ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    city: c.city,
    state: c.state,
    phone: c.phone,
    last_contacted_date: c.last_contacted_date,
    latitude: c.latitude as number,
    longitude: c.longitude as number,
    total_contacts: statsMap.get(c.id) ?? 0,
  }));

  const apiKey = process.env.GOOGLE_MAPS_API_KEY ?? "";

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="font-display text-2xl font-medium text-manifest-navy-800">Territory Map</h1>
          <p className="text-sm text-manifest-navy-400 mt-1">
            {mapCompanies.length} {mapCompanies.length === 1 ? "company" : "companies"} plotted —
            only companies with a saved location show up here.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error.message}
        </div>
      )}

      {!apiKey && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Territory Map needs a Google Maps key — set{" "}
          <span className="font-mono">GOOGLE_MAPS_API_KEY</span> in your environment (the same one
          already used for Google Maps import) and make sure{" "}
          <span className="font-medium">Maps JavaScript API</span> is enabled on that key in Google
          Cloud, then redeploy.
        </div>
      )}

      <BackfillLocationsButton missingCount={missingCount} />

      <TerritoryMap companies={mapCompanies} apiKey={apiKey} branches={(branches as Branch[]) ?? []} />
    </div>
  );
}
