import { fileToDataUrl } from "@/lib/scanner/image-utils";

/**
 * iPhones default to HEIC, which no browser can render directly in an
 * <img> or <canvas>. heic2any decodes it client-side (libheif compiled to
 * WASM) so the whole pipeline still never sends images anywhere.
 */
export async function convertHeicToDataUrl(file: File): Promise<string> {
  const heic2any = (await import("heic2any")).default;
  const converted = await heic2any({
    blob: file,
    toType: "image/jpeg",
    quality: 0.92,
  });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  return fileToDataUrl(blob as Blob);
}
