import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CarrierForm from "@/components/carriers/CarrierForm";
import { updateCarrier } from "@/actions/carriers";
import type { Carrier, EquipmentType, FactoringCompany } from "@/lib/types";

export default async function EditCarrierPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const [{ data: carrier }, { data: equipmentTypes }, { data: selectedLinks }, { data: factoringCompanies }] = await Promise.all([
    supabase.from("carriers").select("*").eq("id", params.id).single(),
    supabase.from("equipment_types").select("*").order("name"),
    supabase.from("carrier_equipment_types").select("equipment_type_id").eq("carrier_id", params.id),
    supabase.from("factoring_companies").select("*").order("name"),
  ]);

  if (!carrier) notFound();

  const boundAction = updateCarrier.bind(null, params.id);
  const defaultEquipmentIds = (selectedLinks ?? []).map((l) => l.equipment_type_id as string);
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? "";

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href={`/carriers/${params.id}`} className="text-sm text-manifest-navy-400 hover:text-manifest-navy-700">
        ← Back to profile
      </Link>
      <h1 className="font-display text-2xl font-medium text-manifest-navy-800 mt-2 mb-6">
        Edit {(carrier as Carrier).name}
      </h1>

      {searchParams.error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {searchParams.error}
        </div>
      )}

      <CarrierForm
        action={boundAction}
        defaultValues={carrier as Carrier}
        submitLabel="Save changes"
        showImport={false}
        equipmentTypes={(equipmentTypes as EquipmentType[]) ?? []}
        defaultEquipmentIds={defaultEquipmentIds}
        googleMapsApiKey={googleMapsApiKey}
        factoringCompanies={(factoringCompanies as FactoringCompany[]) ?? []}
      />
    </div>
  );
}
