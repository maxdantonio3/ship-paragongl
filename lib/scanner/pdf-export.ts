import { PDFDocument } from "pdf-lib";
import type { ExportSettings, ScannerPage } from "@/lib/scanner/types";
import { buildFileName } from "@/lib/scanner/types";
import type { ScannerWorkerClient } from "@/lib/scanner/worker-client";
import { urlToImageBitmap, blobToArrayBuffer } from "@/lib/scanner/image-utils";

const A4: [number, number] = [595.28, 841.89];
const LETTER: [number, number] = [612, 792];

export interface BuildPdfResult {
  blob: Blob;
  fileName: string;
  pageCount: number;
  byteSize: number;
}

/**
 * Re-renders every page at the export-selected JPEG quality (rather than
 * reusing the on-screen preview, which uses a fixed preview quality), then
 * assembles them into one PDF sized per the chosen page-size option.
 */
export async function buildScannedPdf(
  worker: ScannerWorkerClient,
  pages: ScannerPage[],
  settings: ExportSettings
): Promise<BuildPdfResult> {
  const pdfDoc = await PDFDocument.create();
  const fileName = buildFileName(settings);
  pdfDoc.setTitle(fileName.replace(/\.pdf$/, ""));
  pdfDoc.setProducer("Paragon Nexus Document Scanner");
  pdfDoc.setCreationDate(new Date());

  for (const page of pages) {
    const bitmap = await urlToImageBitmap(page.workingDataUrl);
    const { blob: finalBlob, width: imgW, height: imgH } = await worker.process(
      bitmap,
      {
        corners: null,
        rotation: page.rotation,
        filterMode: page.filterMode,
        brightness: page.brightness,
        contrast: page.contrast,
      },
      settings.quality
    );

    const bytes = new Uint8Array(await blobToArrayBuffer(finalBlob));
    const image = await pdfDoc.embedJpg(bytes);
    const isLandscape = imgW > imgH;

    let pageWidth: number;
    let pageHeight: number;
    let margin: number;

    if (settings.pageSize === "auto") {
      const dpi = 150;
      pageWidth = (imgW / dpi) * 72;
      pageHeight = (imgH / dpi) * 72;
      margin = 0;
    } else {
      const base = settings.pageSize === "a4" ? A4 : LETTER;
      [pageWidth, pageHeight] = isLandscape ? [base[1], base[0]] : [base[0], base[1]];
      margin = 24;
    }

    const pdfPage = pdfDoc.addPage([pageWidth, pageHeight]);
    const maxW = pageWidth - margin * 2;
    const maxH = pageHeight - margin * 2;
    const scale = Math.min(maxW / imgW, maxH / imgH);
    const drawW = imgW * scale;
    const drawH = imgH * scale;

    pdfPage.drawImage(image, {
      x: (pageWidth - drawW) / 2,
      y: (pageHeight - drawH) / 2,
      width: drawW,
      height: drawH,
    });
  }

  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes as unknown as BlobPart], { type: "application/pdf" });

  return { blob, fileName, pageCount: pages.length, byteSize: blob.size };
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
