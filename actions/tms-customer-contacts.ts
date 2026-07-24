"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

function str(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
}

export async function createTmsCustomerContact(customerId: string, formData: FormData) {
  const supabase = createClient();

  const payload = {
    tms_customer_id: customerId,
    name: str(formData.get("name")) ?? "Unnamed",
    phone: str(formData.get("phone")),
    email: str(formData.get("email")),
  };

  const { error } = await supabase.from("tms_customer_contacts").insert(payload);
  if (error) throw new Error(error.message);

  revalidatePath(`/tms-customers/${customerId}`);
}

export async function updateTmsCustomerContact(customerId: string, contactId: string, formData: FormData) {
  const supabase = createClient();

  const payload = {
    name: str(formData.get("name")) ?? "Unnamed",
    phone: str(formData.get("phone")),
    email: str(formData.get("email")),
  };

  const { error } = await supabase.from("tms_customer_contacts").update(payload).eq("id", contactId);
  if (error) throw new Error(error.message);

  revalidatePath(`/tms-customers/${customerId}`);
}

export async function deleteTmsCustomerContact(customerId: string, contactId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("tms_customer_contacts").delete().eq("id", contactId);
  if (error) throw new Error(error.message);

  revalidatePath(`/tms-customers/${customerId}`);
}
