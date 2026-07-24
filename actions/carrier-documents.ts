"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CarrierDocumentType } from "@/lib/types";

const BUCKET = "carrier-documents";

export async function uploadCarrierDocument(
  carrierId: string,
  formData: FormData
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const file = formData.get("file");
  const documentType = (formData.get("document_type") ?? "Other").toString() as CarrierDocumentType;
  const description = (formData.get("description") ?? "").toString().trim() || null;

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file selected." };
  }

  // Documents can contain sensitive info (SSNs on a W-9, insurance details),
  // so the bucket is private — files live at a per-carrier path and are only
  // ever accessed through short-lived signed URLs, never a public link.
  const path = `${carrierId}/${Date.now()}-${file.name}`;

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

  const { error: insertError } = await supabase.from("carrier_documents").insert({
    carrier_id: carrierId,
    document_type: documentType,
    description,
    file_name: file.name,
    file_path: path,
    uploaded_by: user?.id ?? null,
  });

  if (insertError) {
    // Clean up the uploaded file if we couldn't record it, so storage and
    // the database don't drift out of sync.
    await supabase.storage.from(BUCKET).remove([path]);
    return { ok: false, error: insertError.message };
  }

  revalidatePath(`/carriers/${carrierId}`);
  return { ok: true };
}

/**
 * Same as uploadCarrierDocument, but used on the "Add carrier" page before
 * a real carrier exists — files land in Storage under a temporary
 * client-generated draft ID instead of a real carrier ID. When the carrier
 * is actually created, createCarrier links these already-uploaded files to
 * the new carrier_id; the storage folder itself never needs to be moved or
 * renamed.
 */
export async function uploadDraftCarrierDocument(
  draftId: string,
  formData: FormData
): Promise<
  | { ok: true; file_name: string; file_path: string; description: string | null }
  | { ok: false; error: string }
> {
  const supabase = createClient();

  const file = formData.get("file");
  const description = (formData.get("description") ?? "").toString().trim() || null;
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "No file selected." };
  }

  const path = `${draftId}/${Date.now()}-${file.name}`;

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

  return { ok: true, file_name: file.name, file_path: path, description };
}

/** Removes a draft-uploaded file from Storage if the user deletes it before
 * ever submitting the "Add carrier" form (no database row to clean up,
 * since nothing was recorded until the carrier itself is created). */
export async function deleteDraftCarrierDocument(filePath: string) {
  const supabase = createClient();
  await supabase.storage.from(BUCKET).remove([filePath]);
}

export async function getCarrierDocumentUrl(filePath: string, download = false): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(filePath, 60, download ? { download: true } : undefined);
  if (error) return null;
  return data.signedUrl;
}

export async function deleteCarrierDocument(carrierId: string, documentId: string, filePath: string) {
  const supabase = createClient();

  await supabase.storage.from(BUCKET).remove([filePath]);
  const { error } = await supabase.from("carrier_documents").delete().eq("id", documentId);
  if (error) throw new Error(error.message);

  revalidatePath(`/carriers/${carrierId}`);
}

/** Resolves a list of user IDs to their email addresses, for the "Uploaded
 * by" label on each document. Reuses the same service-role admin client
 * already built for the follow-up digest — there's no public users table
 * to join against otherwise. */
export async function getUploaderEmails(userIds: string[]): Promise<Record<string, string>> {
  const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
  if (uniqueIds.length === 0) return {};

  try {
    const admin = createAdminClient();
    const result: Record<string, string> = {};
    await Promise.all(
      uniqueIds.map(async (id) => {
        const { data } = await admin.auth.admin.getUserById(id);
        if (data?.user?.email) result[id] = data.user.email;
      })
    );
    return result;
  } catch {
    // Admin client isn't configured (SUPABASE_SERVICE_ROLE_KEY missing) —
    // fail quietly, "Uploaded by" just won't show a name.
    return {};
  }
}
