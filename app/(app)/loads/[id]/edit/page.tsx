import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import LoadForm from "@/components/loads/LoadForm";
import { updateLoad } from "@/actions/loads";
import type {
  Load,
  TmsCustomer,
  Carrier,
  EquipmentType,
  Location,
  CommodityType,
  PieceType,
  LoadLineItemType,
  LoadStop,
  LoadHandlingUnit,
  LoadLineItem,
} from "@/lib/types";

export default async function EditLoadPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const [
    { data: load },
    { data: customers },
    { data: carriers },
    { data: equipmentTypes },
    { data: locations },
    { data: commodityTypes },
    { data: pieceTypes },
    { data: lineItemTypes },
    { data: stops },
    { data: handlingUnits },
    { data: lineItems },
  ] = await Promise.all([
    supabase.from("loads").select("*").eq("id", params.id).single(),
    supabase.from("tms_customers").select("*").order("name"),
    supabase.from("carriers").select("*").order("name"),
    supabase.from("equipment_types").select("*").order("name"),
    supabase.from("locations").select("*").order("name"),
    supabase.from("commodity_types").select("*").order("name"),
    supabase.from("piece_types").select("*").order("name"),
    supabase.from("load_line_item_types").select("*").order("name"),
    supabase.from("load_stops").select("*").eq("load_id", params.id).order("sequence"),
    supabase.from("load_handling_units").select("*").eq("load_id", params.id).order("sort_order"),
    supabase.from("load_line_items").select("*").eq("load_id", params.id).order("sort_order"),
  ]);

  if (!load) notFound();

  const boundAction = updateLoad.bind(null, params.id);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href={`/loads/${params.id}`} className="text-sm text-manifest-navy-400 hover:text-manifest-navy-700">
        ← Back to load
      </Link>
      <h1 className="font-display text-2xl font-medium text-manifest-navy-800 mt-2 mb-6 font-mono">
        Edit Load #{(load as Load).load_number}
      </h1>

      {searchParams.error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {searchParams.error}
        </div>
      )}

      <LoadForm
        action={boundAction}
        defaultValues={load as Load}
        submitLabel="Save changes"
        customers={(customers as TmsCustomer[]) ?? []}
        carriers={(carriers as Carrier[]) ?? []}
        equipmentTypes={(equipmentTypes as EquipmentType[]) ?? []}
        locations={(locations as Location[]) ?? []}
        commodityTypes={(commodityTypes as CommodityType[]) ?? []}
        pieceTypes={(pieceTypes as PieceType[]) ?? []}
        lineItemTypes={(lineItemTypes as LoadLineItemType[]) ?? []}
        defaultStops={(stops as LoadStop[]) ?? []}
        defaultHandlingUnits={(handlingUnits as LoadHandlingUnit[]) ?? []}
        defaultLineItems={(lineItems as LoadLineItem[]) ?? []}
      />
    </div>
  );
}
