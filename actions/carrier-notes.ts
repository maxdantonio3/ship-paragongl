"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function createCarrierNote(carrierId: string, formData: FormData) {
  const content = (formData.get("content") ?? "").toString().trim();
  if (!content) return;

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase.from("carrier_notes").insert({
    carrier_id: carrierId,
    content,
    created_by: user?.id ?? null,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/carriers/${carrierId}`);
}

export async function deleteCarrierNote(carrierId: string, noteId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("carrier_notes").delete().eq("id", noteId);
  if (error) throw new Error(error.message);

  revalidatePath(`/carriers/${carrierId}`);
}
