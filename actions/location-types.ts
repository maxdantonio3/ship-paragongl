"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createLocationType(formData: FormData) {
  const name = (formData.get("name") ?? "").toString().trim();
  if (!name) return;

  const supabase = createClient();
  const { error } = await supabase.from("location_types").insert({ name });

  if (error) {
    redirect(`/settings?locationTypeError=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/settings");
  revalidatePath("/locations/new");
  revalidatePath("/locations");
}

export async function deleteLocationType(locationTypeId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("location_types").delete().eq("id", locationTypeId);
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
  revalidatePath("/locations/new");
  revalidatePath("/locations");
}
