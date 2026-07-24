"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createLoadNote(loadId: string, formData: FormData) {
  const content = (formData.get("content") ?? "").toString().trim();
  if (!content) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("load_notes").insert({
    load_id: loadId,
    content,
    created_by: user?.id ?? null,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/loads/${loadId}`);
}

export async function deleteLoadNote(loadId: string, noteId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("load_notes").delete().eq("id", noteId);
  if (error) throw new Error(error.message);

  revalidatePath(`/loads/${loadId}`);
}
