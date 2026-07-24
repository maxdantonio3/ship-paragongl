"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createFactoringCompany(formData: FormData) {
  const name = (formData.get("name") ?? "").toString().trim();
  if (!name) return;

  const supabase = createClient();
  const { error } = await supabase.from("factoring_companies").insert({ name });

  if (error) {
    redirect(`/settings?factoringCompanyError=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/settings");
  revalidatePath("/carriers/new");
  revalidatePath("/carriers");
}

export async function deleteFactoringCompany(factoringCompanyId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("factoring_companies").delete().eq("id", factoringCompanyId);
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
  revalidatePath("/carriers/new");
  revalidatePath("/carriers");
}
