"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

export async function createNote(content: string) {
  const trimmed = content.trim();
  if (!trimmed) return;

  const { supabase, user } = await requireUser();
  const { error } = await supabase.from("notepad_entries").insert({
    user_id: user.id,
    content: trimmed,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/notepad");
}

export async function toggleNoteDone(id: string, done: boolean) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("notepad_entries").update({ done }).eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/notepad");
}

export async function deleteNote(id: string) {
  const { supabase } = await requireUser();
  const { error } = await supabase.from("notepad_entries").delete().eq("id", id);
  if (error) throw new Error(error.message);

  revalidatePath("/notepad");
}

export async function saveFreeform(content: string) {
  const { supabase, user } = await requireUser();
  const { error } = await supabase
    .from("notepad_freeform")
    .upsert({ user_id: user.id, content }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);

  revalidatePath("/notepad");
}
