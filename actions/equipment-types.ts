"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createEquipmentType(formData: FormData) {
  const name = (formData.get("name") ?? "").toString().trim();
  if (!name) return;

  const supabase = createClient();
  const { error } = await supabase.from("equipment_types").insert({ name });

  if (error) {
    redirect(`/settings?equipmentError=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/settings");
  revalidatePath("/carriers/new");
  revalidatePath("/carriers");
}

export async function deleteEquipmentType(equipmentTypeId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("equipment_types").delete().eq("id", equipmentTypeId);
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
  revalidatePath("/carriers/new");
  revalidatePath("/carriers");
}
