"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function createPieceType(formData: FormData) {
  const name = (formData.get("name") ?? "").toString().trim();
  if (!name) return;

  const supabase = createClient();
  const { error } = await supabase.from("piece_types").insert({ name });

  if (error) {
    redirect(`/settings?pieceTypeError=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/settings");
  revalidatePath("/loads/new");
  revalidatePath("/loads");
}

export async function deletePieceType(pieceTypeId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("piece_types").delete().eq("id", pieceTypeId);
  if (error) throw new Error(error.message);

  revalidatePath("/settings");
  revalidatePath("/loads/new");
  revalidatePath("/loads");
}
