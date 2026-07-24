import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LocationForm from "@/components/locations/LocationForm";
import { updateLocation } from "@/actions/locations";
import type { Location, LocationType } from "@/lib/types";

export default async function EditLocationPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const [{ data: location }, { data: locationTypes }] = await Promise.all([
    supabase.from("locations").select("*").eq("id", params.id).single(),
    supabase.from("location_types").select("*").order("name"),
  ]);

  if (!location) notFound();

  const boundAction = updateLocation.bind(null, params.id);
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? "";

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href={`/locations/${params.id}`} className="text-sm text-manifest-navy-400 hover:text-manifest-navy-700">
        ← Back to location
      </Link>
      <h1 className="font-display text-2xl font-medium text-manifest-navy-800 mt-2 mb-6">
        Edit {(location as Location).name}
      </h1>

      {searchParams.error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {searchParams.error}
        </div>
      )}

      <LocationForm
        action={boundAction}
        defaultValues={location as Location}
        submitLabel="Save changes"
        showImport={false}
        locationTypes={(locationTypes as LocationType[]) ?? []}
        googleMapsApiKey={googleMapsApiKey}
      />
    </div>
  );
}
