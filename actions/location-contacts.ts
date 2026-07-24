"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function str(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
}

export async function createLocationContact(locationId: string, formData: FormData) {
  const supabase = createClient();

  const payload = {
    location_id: locationId,
    name: str(formData.get("name")) ?? "Unnamed",
    phone: str(formData.get("phone")),
    email: str(formData.get("email")),
  };

  const { error } = await supabase.from("location_contacts").insert(payload);
  if (error) throw new Error(error.message);

  revalidatePath(`/locations/${locationId}`);
}

export async function updateLocationContact(locationId: string, contactId: string, formData: FormData) {
  const supabase = createClient();

  const payload = {
    name: str(formData.get("name")) ?? "Unnamed",
    phone: str(formData.get("phone")),
    email: str(formData.get("email")),
  };

  const { error } = await supabase.from("location_contacts").update(payload).eq("id", contactId);
  if (error) throw new Error(error.message);

  revalidatePath(`/locations/${locationId}`);
}

export async function deleteLocationContact(locationId: string, contactId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("location_contacts").delete().eq("id", contactId);
  if (error) throw new Error(error.message);

  revalidatePath(`/locations/${locationId}`);
}
