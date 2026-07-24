"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createBranch(formData: FormData) {
  const name = (formData.get("name") ?? "").toString().trim();
  if (!name) return;

  const supabase = createClient();
  const { error } = await supabase.from("branches").insert({ name });

  if (error) {
    redirect(`/settings?branchError=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  revalidatePath("/companies/new");
}

export async function deleteBranch(branchId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("branches").delete().eq("id", branchId);
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  revalidatePath("/companies/new");
}
