"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CarrierContactPosition } from "@/lib/types";

function str(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
}

export async function createCarrierContact(carrierId: string, formData: FormData) {
  const supabase = createClient();

  const payload = {
    carrier_id: carrierId,
    name: str(formData.get("name")) ?? "Unnamed",
    phone: str(formData.get("phone")),
    email: str(formData.get("email")),
    position: (str(formData.get("position")) as CarrierContactPosition) ?? "Owner",
  };

  const { error } = await supabase.from("carrier_contacts").insert(payload);
  if (error) throw new Error(error.message);

  revalidatePath(`/carriers/${carrierId}`);
}

export async function updateCarrierContact(carrierId: string, contactId: string, formData: FormData) {
  const supabase = createClient();

  const payload = {
    name: str(formData.get("name")) ?? "Unnamed",
    phone: str(formData.get("phone")),
    email: str(formData.get("email")),
    position: (str(formData.get("position")) as CarrierContactPosition) ?? "Owner",
  };

  const { error } = await supabase.from("carrier_contacts").update(payload).eq("id", contactId);
  if (error) throw new Error(error.message);

  revalidatePath(`/carriers/${carrierId}`);
}

export async function deleteCarrierContact(carrierId: string, contactId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("carrier_contacts").delete().eq("id", contactId);
  if (error) throw new Error(error.message);

  revalidatePath(`/carriers/${carrierId}`);
}
