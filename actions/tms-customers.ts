"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function str(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
}

function buildPayload(formData: FormData) {
  return {
    name: str(formData.get("name")) ?? "Untitled customer",
    address: str(formData.get("address")),
    city: str(formData.get("city")),
    state: str(formData.get("state")),
    zip: str(formData.get("zip")),
    phone: str(formData.get("phone")),
    email: str(formData.get("email")),
    billing_cycle: str(formData.get("billing_cycle")),
    payment_method: str(formData.get("payment_method")),
    credit_limit: (() => {
      const v = str(formData.get("credit_limit"));
      return v ? Number(v) : null;
    })(),
    notes: str(formData.get("notes")),
    imported_from_company_id: str(formData.get("imported_from_company_id")),
  };
}

export async function createTmsCustomer(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload = { ...buildPayload(formData), created_by: user?.id ?? null };

  const { data, error } = await supabase.from("tms_customers").insert(payload).select("id").single();

  if (error) {
    redirect(`/tms-customers/new?error=${encodeURIComponent(error.message)}`);
  }

  const contactNames = formData.getAll("accounting_contact_name").map(String);
  const contactPhones = formData.getAll("accounting_contact_phone").map(String);
  const contactEmails = formData.getAll("accounting_contact_email").map(String);

  const contactsToInsert = contactNames
    .map((name, i) => ({
      tms_customer_id: data.id,
      name: name.trim(),
      phone: contactPhones[i]?.trim() || null,
      email: contactEmails[i]?.trim() || null,
    }))
    .filter((c) => c.name.length > 0);

  if (contactsToInsert.length > 0) {
    await supabase.from("tms_customer_contacts").insert(contactsToInsert);
  }

  revalidatePath("/tms-customers");
  redirect(`/tms-customers/${data.id}`);
}

export async function updateTmsCustomer(customerId: string, formData: FormData) {
  const supabase = createClient();
  const payload = buildPayload(formData);

  const { error } = await supabase.from("tms_customers").update(payload).eq("id", customerId);

  if (error) {
    redirect(`/tms-customers/${customerId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  const contactNames = formData.getAll("accounting_contact_name").map(String);
  const contactPhones = formData.getAll("accounting_contact_phone").map(String);
  const contactEmails = formData.getAll("accounting_contact_email").map(String);

  await supabase.from("tms_customer_contacts").delete().eq("tms_customer_id", customerId);
  const contactsToInsert = contactNames
    .map((name, i) => ({
      tms_customer_id: customerId,
      name: name.trim(),
      phone: contactPhones[i]?.trim() || null,
      email: contactEmails[i]?.trim() || null,
    }))
    .filter((c) => c.name.length > 0);
  if (contactsToInsert.length > 0) {
    await supabase.from("tms_customer_contacts").insert(contactsToInsert);
  }

  revalidatePath("/tms-customers");
  revalidatePath(`/tms-customers/${customerId}`);
  redirect(`/tms-customers/${customerId}`);
}

export async function deleteTmsCustomer(customerId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("tms_customers").delete().eq("id", customerId);
  if (error) {
    redirect(`/tms-customers/${customerId}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/tms-customers");
  redirect("/tms-customers");
}

/** Searches CRM companies by name, for the "Import from CRM" flow on the
 * Add TMS Customer page — keeps the CRM's full company list out of the
 * TMS customer picker entirely; this is the only place they connect. */
export async function searchCrmCompaniesForImport(query: string): Promise<
  { id: string; name: string; phone: string | null; email: string | null; address: string | null; city: string | null; state: string | null; zip: string | null }[]
> {
  const q = query.trim();
  if (!q) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("companies")
    .select("id, name, phone, email, address, city, state, zip")
    .ilike("name", `%${q}%`)
    .order("name")
    .limit(10);
  return data ?? [];
}
