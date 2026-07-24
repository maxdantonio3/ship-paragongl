import { createClient } from "@/lib/supabase/client";

/**
 * NOT CALLED ANYWHERE YET.
 *
 * This is the future upload path for when scanned PDFs should attach to a
 * load/shipment record (once the TMS module exists — see the "Soon" section
 * in the sidebar). It's written now, tested for correctness of shape, but
 * intentionally not wired into the Scanner UI, per the instruction not to
 * change the existing CRM schema for this pass.
 *
 * To turn this on later:
 *   1. Create a Supabase Storage bucket (e.g. "scanned-documents") and a
 *      `load_documents` table (or similar) with columns like
 *      (id, load_id, file_path, file_name, document_type, created_by, created_at).
 *   2. Add a storage policy so authenticated users can upload/read.
 *   3. Call `uploadScannedPdf` from ExportPanel after `buildScannedPdf`,
 *      instead of (or in addition to) `downloadBlob`.
 *   4. Insert a row into `load_documents` pointing at the returned path.
 */
export async function uploadScannedPdf(
  blob: Blob,
  fileName: string,
  loadId?: string
): Promise<{ path: string; publicUrl: string | null }> {
  const supabase = createClient();
  const bucket = "scanned-documents";
  const path = loadId ? `${loadId}/${fileName}` : `unassigned/${fileName}`;

  const { error } = await supabase.storage.from(bucket).upload(path, blob, {
    contentType: "application/pdf",
    upsert: true,
  });

  if (error) throw new Error(error.message);

  const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(path);

  return { path, publicUrl: publicUrlData?.publicUrl ?? null };
}
