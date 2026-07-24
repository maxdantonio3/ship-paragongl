"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createLoadLineItemType(formData: FormData) {
  const name = (formData.get("name") ?? "").toString().trim();
  if (!name) return;

  const supabase = createClient();
  const { error } = await supabase.from("load_line_item_types").insert({ name });

  if (error) {
    redirect(`/settings?lineItemTypeError=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/settings");
  revalidatePath("/loads/new");
  revalidatePath("/loads");
}

export async function deleteLoadLineItemType(lineItemTypeId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("load_line_item_types").delete().eq("id", lineItemTypeId);
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
  revalidatePath("/loads/new");
  revalidatePath("/loads");
}
