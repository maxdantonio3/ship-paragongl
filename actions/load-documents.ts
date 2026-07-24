"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { LoadDocumentType } from "@/lib/types";

// Reuses the same private bucket already set up for Carrier Documents —
// no second Storage bucket to create. Load files just live under their
// own "loads/" prefix within it.
const BUCKET = "carrier-documents";

export async function uploadLoadDocument(
  loadId: string,
  formData: FormData
): Promise<{ ok: true; file_name: string; file_path: string } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const file = formData.get("file");
  const documentType = (formData.get("document_type") ?? "Other").toString() as LoadDocumentType;
  const description = (formData.get("description") ?? "").toString().trim() || null;

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file selected." };
  }

  const path = `loads/${loadId}/${Date.now()}-${file.name}`;

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
    upsert: false,
  });

  if (uploadError) {
    return {
      ok: false,
      error:
        uploadError.message.includes("Bucket not found")
          ? `The "${BUCKET}" storage bucket doesn't exist yet — create it in Supabase Storage first (see README).`
          : uploadError.message,
    };
  }

  const { error: insertError } = await supabase.from("load_documents").insert({
    load_id: loadId,
    document_type: documentType,
    description,
    file_name: file.name,
    file_path: path,
    uploaded_by: user?.id ?? null,
  });

  if (insertError) {
    await supabase.storage.from(BUCKET).remove([path]);
    return { ok: false, error: insertError.message };
  }

  revalidatePath(`/loads/${loadId}`);
  revalidatePath("/loads");
  return { ok: true, file_name: file.name, file_path: path };
}

export async function getLoadDocumentUrl(filePath: string, download = false): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 60, download ? { download: true } : undefined);
  if (error) return null;
  return data.signedUrl;
}

export async function deleteLoadDocument(loadId: string, documentId: string, filePath: string) {
  const supabase = createClient();

  await supabase.storage.from(BUCKET).remove([filePath]);
  const { error } = await supabase.from("load_documents").delete().eq("id", documentId);
  if (error) throw new Error(error.message);

  revalidatePath(`/loads/${loadId}`);
  revalidatePath("/loads");
}

/** For the dashboard's POD column — one lightweight query per page load
 * to know which loads already have a POD on file. */
export async function getPodDocumentsForLoads(
  loadIds: string[]
): Promise<Record<string, { file_name: string; file_path: string }>> {
  if (loadIds.length === 0) return {};
  const supabase = createClient();
  const { data } = await supabase
    .from("load_documents")
    .select("load_id, file_name, file_path, uploaded_at")
    .eq("document_type", "POD")
    .in("load_id", loadIds)
    .order("uploaded_at", { ascending: false });

  const result: Record<string, { file_name: string; file_path: string }> = {};
  (data ?? []).forEach((d) => {
    if (!result[d.load_id]) result[d.load_id] = { file_name: d.file_name, file_path: d.file_path };
  });
  return result;
}
