"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ActivityType } from "@/lib/types";

function str(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
}

export async function createActivity(companyId: string, formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const dateInput = str(formData.get("activity_date"));

  const payload = {
    company_id: companyId,
    contact_id: str(formData.get("contact_id")),
    activity_type: (str(formData.get("activity_type")) as ActivityType) ?? "Other",
    activity_date: dateInput ? new Date(dateInput).toISOString() : new Date().toISOString(),
    notes: str(formData.get("notes")),
    follow_up_date: str(formData.get("follow_up_date")),
    created_by: user?.id ?? null,
  };

  const { error } = await supabase.from("activities").insert(payload);
  if (error) throw new Error(error.message);

  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
}

export async function updateActivity(companyId: string, activityId: string, formData: FormData) {
  const supabase = createClient();

  const dateInput = str(formData.get("activity_date"));

  const payload = {
    contact_id: str(formData.get("contact_id")),
    activity_type: (str(formData.get("activity_type")) as ActivityType) ?? "Other",
    activity_date: dateInput ? new Date(dateInput).toISOString() : new Date().toISOString(),
    notes: str(formData.get("notes")),
    follow_up_date: str(formData.get("follow_up_date")),
  };

  const { error } = await supabase.from("activities").update(payload).eq("id", activityId);
  if (error) throw new Error(error.message);

  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
}

export async function deleteActivity(companyId: string, activityId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("activities").delete().eq("id", activityId);
  if (error) throw new Error(error.message);

  revalidatePath(`/companies/${companyId}`);
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
}
