import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import LoadForm from "@/components/loads/LoadForm";
import { createLoad } from "@/actions/loads";
import type { TmsCustomer, Carrier, EquipmentType, Location, CommodityType, PieceType, LoadLineItemType } from "@/lib/types";

export default async function NewLoadPage({ searchParams }: { searchParams: { error?: string } }) {
  const supabase = createClient();
  const [
    { data: customers },
    { data: carriers },
    { data: equipmentTypes },
    { data: locations },
    { data: commodityTypes },
    { data: pieceTypes },
    { data: lineItemTypes },
  ] = await Promise.all([
    supabase.from("tms_customers").select("*").order("name"),
    supabase.from("carriers").select("*").eq("status", "Active").order("name"),
    supabase.from("equipment_types").select("*").order("name"),
    supabase.from("locations").select("*").order("name"),
    supabase.from("commodity_types").select("*").order("name"),
    supabase.from("piece_types").select("*").order("name"),
    supabase.from("load_line_item_types").select("*").order("name"),
  ]);

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href="/loads" className="text-sm text-manifest-navy-400 hover:text-manifest-navy-700">
        ← Back to loads
      </Link>
      <h1 className="font-display text-2xl font-medium text-manifest-navy-800 mt-2 mb-6">Add load</h1>

      {searchParams.error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {searchParams.error}
        </div>
      )}

      <LoadForm
        action={createLoad}
        submitLabel="Add load"
        customers={(customers as TmsCustomer[]) ?? []}
        carriers={(carriers as Carrier[]) ?? []}
        equipmentTypes={(equipmentTypes as EquipmentType[]) ?? []}
        locations={(locations as Location[]) ?? []}
        commodityTypes={(commodityTypes as CommodityType[]) ?? []}
        pieceTypes={(pieceTypes as PieceType[]) ?? []}
        lineItemTypes={(lineItemTypes as LoadLineItemType[]) ?? []}
      />
    </div>
  );
}
