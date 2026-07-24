import Link from "next/link";
import CarrierForm from "@/components/carriers/CarrierForm";
import { createCarrier } from "@/actions/carriers";
import { createClient } from "@/lib/supabase/server";
import type { EquipmentType, FactoringCompany } from "@/lib/types";

export default async function NewCarrierPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const { data: equipmentTypes } = await supabase.from("equipment_types").select("*").order("name");
  const { data: factoringCompanies } = await supabase.from("factoring_companies").select("*").order("name");
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? "";

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href="/carriers" className="text-sm text-manifest-navy-400 hover:text-manifest-navy-700">
        ← Back to carriers
      </Link>
      <h1 className="font-display text-2xl font-medium text-manifest-navy-800 mt-2 mb-6">Add carrier</h1>

      {searchParams.error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {searchParams.error}
        </div>
      )}

      {!googleMapsApiKey && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Address autocomplete needs <span className="font-mono">GOOGLE_MAPS_API_KEY</span> set in your
          environment — the same key already used elsewhere. Without it, you can still fill in the
          address fields by hand after saving.
        </div>
      )}

      <CarrierForm
        action={createCarrier}
        submitLabel="Add carrier"
        equipmentTypes={(equipmentTypes as EquipmentType[]) ?? []}
        googleMapsApiKey={googleMapsApiKey}
        factoringCompanies={(factoringCompanies as FactoringCompany[]) ?? []}
      />
    </div>
  );
}
