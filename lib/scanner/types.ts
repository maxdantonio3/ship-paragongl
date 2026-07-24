export type FilterMode = "original" | "enhanced" | "grayscale" | "bw";

export type PageSizeOption = "a4" | "letter" | "auto";

export interface Point {
  x: number;
  y: number;
}

export const DOCUMENT_TYPES = [
  "BOL",
  "POD",
  "Rate Confirmation",
  "Invoice",
  "Lumper Receipt",
  "Scale Ticket",
  "Other",
] as const;

export type DocumentType = (typeof DOCUMENT_TYPES)[number];

/**
 * One uploaded/scanned page. `workingDataUrl` is the current source of truth
 * for the page's pixels — it starts as a data: URL from the original
 * upload (HEIC already converted to JPEG/PNG) and gets replaced with a
 * blob: URL (from the OpenCV worker) whenever a crop is committed, so we
 * never have to re-derive a perspective transform on every render. Despite
 * the field name, both `workingDataUrl` and `previewDataUrl` may hold
 * either a data: or blob: URL — anything `<img src>` and `fetch()` accept.
 * Filter/brightness/contrast/rotation are applied on top of
 * `workingDataUrl` live, non-destructively, and cached in `previewDataUrl`.
 */
export interface ScannerPage {
  id: string;
  fileName: string;
  workingDataUrl: string;
  naturalWidth: number;
  naturalHeight: number;
  rotation: 0 | 90 | 180 | 270;
  filterMode: FilterMode;
  brightness: number; // -100..100, 0 = no change
  contrast: number; // -100..100, 0 = no change
  previewDataUrl: string; // last-rendered result shown in the thumbnail + editor
  isProcessing: boolean;
}

export interface ExportSettings {
  loadNumber: string;
  documentType: DocumentType;
  pageSize: PageSizeOption;
  quality: number; // 0.4..0.95, JPEG quality used for compression
}

export function buildFileName(settings: ExportSettings): string {
  const load = settings.loadNumber.trim() || "Unknown";
  const safeLoad = load.replace(/[^a-zA-Z0-9-_]/g, "");
  const safeType = settings.documentType.replace(/[^a-zA-Z0-9-_ ]/g, "").replace(/\s+/g, "-");
  return `Load-${safeLoad}-${safeType}.pdf`;
}
