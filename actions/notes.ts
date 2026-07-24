"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createNote(companyId: string, formData: FormData) {
  const content = (formData.get("content") ?? "").toString().trim();
  if (!content) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("notes").insert({
    company_id: companyId,
    content,
    created_by: user?.id ?? null,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/companies/${companyId}`);
}

export async function deleteNote(companyId: string, noteId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("notes").delete().eq("id", noteId);
  if (error) throw new Error(error.message);

  revalidatePath(`/companies/${companyId}`);
}
