import Link from "next/link";
import LocationForm from "@/components/locations/LocationForm";
import { createLocation } from "@/actions/locations";
import { createClient } from "@/lib/supabase/server";
import type { LocationType } from "@/lib/types";

export default async function NewLocationPage({ searchParams }: { searchParams: { error?: string } }) {
  const supabase = createClient();
  const { data: locationTypes } = await supabase.from("location_types").select("*").order("name");
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? "";

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href="/locations" className="text-sm text-manifest-navy-400 hover:text-manifest-navy-700">
        ← Back to locations
      </Link>
      <h1 className="font-display text-2xl font-medium text-manifest-navy-800 mt-2 mb-6">Add location</h1>

      {searchParams.error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {searchParams.error}
        </div>
      )}

      <LocationForm
        action={createLocation}
        submitLabel="Add location"
        locationTypes={(locationTypes as LocationType[]) ?? []}
        googleMapsApiKey={googleMapsApiKey}
      />
    </div>
  );
}
