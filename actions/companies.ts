"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CompanyStatus } from "@/lib/types";

function str(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
}

function num(v: FormDataEntryValue | null): number | null {
  const s = (v ?? "").toString().trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export async function createCompany(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload = {
    name: str(formData.get("name")) ?? "Untitled company",
    status: (str(formData.get("status")) as CompanyStatus) ?? "Cold",
    industry: str(formData.get("industry")),
    address: str(formData.get("address")),
    city: str(formData.get("city")),
    state: str(formData.get("state")),
    zip: str(formData.get("zip")),
    phone: str(formData.get("phone")),
    email: str(formData.get("email")),
    website: str(formData.get("website")),
    google_maps_link: str(formData.get("google_maps_link")),
    google_place_id: str(formData.get("google_place_id")),
    latitude: num(formData.get("latitude")),
    longitude: num(formData.get("longitude")),
    notes_summary: str(formData.get("notes_summary")),
    branch_id: str(formData.get("branch_id")),
    created_by: user?.id ?? null,
  };

  const { data, error } = await supabase
    .from("companies")
    .insert(payload)
    .select("id")
    .single();

  if (error) {
    redirect(`/companies/new?error=${encodeURIComponent(error.message)}`);
  }

  const activityType = str(formData.get("activity_type"));
  if (activityType) {
    const activityDateRaw = str(formData.get("activity_date"));
    await supabase.from("activities").insert({
      company_id: data.id,
      activity_type: activityType,
      activity_date: activityDateRaw ? new Date(activityDateRaw).toISOString() : new Date().toISOString(),
      notes: str(formData.get("activity_notes")),
      follow_up_date: str(formData.get("activity_follow_up_date")),
      created_by: user?.id ?? null,
    });
  }

  revalidatePath("/dashboard");
  redirect(`/companies/${data.id}`);
}

export async function updateCompany(companyId: string, formData: FormData) {
  const supabase = createClient();

  const payload = {
    name: str(formData.get("name")) ?? "Untitled company",
    status: (str(formData.get("status")) as CompanyStatus) ?? "Cold",
    industry: str(formData.get("industry")),
    address: str(formData.get("address")),
    city: str(formData.get("city")),
    state: str(formData.get("state")),
    zip: str(formData.get("zip")),
    phone: str(formData.get("phone")),
    email: str(formData.get("email")),
    website: str(formData.get("website")),
    google_maps_link: str(formData.get("google_maps_link")),
    notes_summary: str(formData.get("notes_summary")),
    branch_id: str(formData.get("branch_id")),
    latitude: num(formData.get("latitude")),
    longitude: num(formData.get("longitude")),
  };

  const { error } = await supabase.from("companies").update(payload).eq("id", companyId);

  if (error) {
    redirect(`/companies/${companyId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/dashboard");
  revalidatePath(`/companies/${companyId}`);
  redirect(`/companies/${companyId}`);
}

export async function updateCompanyStatus(companyId: string, status: CompanyStatus) {
  const supabase = createClient();
  const { error } = await supabase.from("companies").update({ status }).eq("id", companyId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath(`/companies/${companyId}`);
}

export async function updateNextFollowUp(companyId: string, date: string | null) {
  const supabase = createClient();
  const { error } = await supabase
    .from("companies")
    .update({ next_follow_up_date: date })
    .eq("id", companyId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/analytics");
}

export interface BulkUpdateRow {
  id: string;
  status?: CompanyStatus;
  branch_id?: string | null;
}

export async function bulkUpdateCompanies(
  updates: BulkUpdateRow[]
): Promise<{ ok: true; updated: number } | { ok: false; error: string }> {
  const supabase = createClient();

  for (const row of updates) {
    const payload: Record<string, unknown> = {};
    if (row.status !== undefined) payload.status = row.status;
    if (row.branch_id !== undefined) payload.branch_id = row.branch_id;
    if (Object.keys(payload).length === 0) continue;

    const { error } = await supabase.from("companies").update(payload).eq("id", row.id);
    if (error) {
      return { ok: false, error: `${error.message} (company ${row.id})` };
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/companies/bulk-edit");
  revalidatePath("/analytics");
  return { ok: true, updated: updates.length };
}

export async function deleteCompany(companyId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("companies").delete().eq("id", companyId);
  if (error) {
    redirect(`/companies/${companyId}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/dashboard");
  redirect("/dashboard");
}
