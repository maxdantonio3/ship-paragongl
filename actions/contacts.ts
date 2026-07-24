"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Contact } from "@/lib/types";

function str(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
}

export async function getCompanyContacts(companyId: string): Promise<Contact[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("contacts")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Contact[];
}

export async function createContact(companyId: string, formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload = {
    company_id: companyId,
    first_name: str(formData.get("first_name")) ?? "Unnamed",
    last_name: str(formData.get("last_name")),
    job_title: str(formData.get("job_title")),
    email: str(formData.get("email")),
    phone: str(formData.get("phone")),
    linkedin_url: str(formData.get("linkedin_url")),
    notes: str(formData.get("notes")),
    created_by: user?.id ?? null,
  };

  const { error } = await supabase.from("contacts").insert(payload);
  if (error) throw new Error(error.message);

  revalidatePath(`/companies/${companyId}`);
}

export async function updateContact(companyId: string, contactId: string, formData: FormData) {
  const supabase = createClient();

  const payload = {
    first_name: str(formData.get("first_name")) ?? "Unnamed",
    last_name: str(formData.get("last_name")),
    job_title: str(formData.get("job_title")),
    email: str(formData.get("email")),
    phone: str(formData.get("phone")),
    linkedin_url: str(formData.get("linkedin_url")),
    notes: str(formData.get("notes")),
  };

  const { error } = await supabase.from("contacts").update(payload).eq("id", contactId);
  if (error) throw new Error(error.message);

  revalidatePath(`/companies/${companyId}`);
}

export async function deleteContact(companyId: string, contactId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("contacts").delete().eq("id", contactId);
  if (error) throw new Error(error.message);

  revalidatePath(`/companies/${companyId}`);
}
