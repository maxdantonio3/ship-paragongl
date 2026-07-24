"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createCommodityType(formData: FormData) {
  const name = (formData.get("name") ?? "").toString().trim();
  if (!name) return;

  const supabase = createClient();
  const { error } = await supabase.from("commodity_types").insert({ name });

  if (error) {
    redirect(`/settings?commodityTypeError=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/settings");
  revalidatePath("/loads/new");
  revalidatePath("/loads");
}

export async function deleteCommodityType(commodityTypeId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("commodity_types").delete().eq("id", commodityTypeId);
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
  revalidatePath("/loads/new");
  revalidatePath("/loads");
}
