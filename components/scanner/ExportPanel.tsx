"use client";

import { useState } from "react";
import { DOCUMENT_TYPES, buildFileName, type DocumentType, type ExportSettings, type PageSizeOption, type ScannerPage } from "@/lib/scanner/types";
import { buildScannedPdf, downloadBlob } from "@/lib/scanner/pdf-export";
import type { ScannerWorkerClient } from "@/lib/scanner/worker-client";

export default function ExportPanel({
  worker,
  ready,
  pages,
}: {
  worker: ScannerWorkerClient | null;
  ready: boolean;
  pages: ScannerPage[];
}) {
  const [loadNumber, setLoadNumber] = useState("");
  const [documentType, setDocumentType] = useState<DocumentType>("BOL");
  const [pageSize, setPageSize] = useState<PageSizeOption>("auto");
  const [quality, setQuality] = useState(0.75);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<{ blob: Blob; fileName: string; byteSize: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const settings: ExportSettings = { loadNumber, documentType, pageSize, quality };
  const previewFileName = buildFileName(settings);

  async function handleGenerate() {
    if (pages.length === 0) return;
    setError(null);
    setResult(null);
    setIsGenerating(true);
    try {
      if (!worker || !ready) throw new Error("The image-processing engine is still loading — try again in a moment.");
      const built = await buildScannedPdf(worker, pages, settings);
      setResult(built);
      downloadBlob(built.blob, built.fileName);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to generate PDF.");
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="panel p-5">
      <h2 className="font-display text-lg font-medium text-manifest-navy-800 mb-4">Export</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="field-label" htmlFor="load_number">
            Load number
          </label>
          <input
            id="load_number"
            value={loadNumber}
            onChange={(e) => setLoadNumber(e.target.value)}
            placeholder="e.g. 48213"
            className="field-input"
          />
        </div>
        <div>
          <label className="field-label" htmlFor="document_type">
            Document type
          </label>
          <select
            id="document_type"
            value={documentType}
            onChange={(e) => setDocumentType(e.target.value as DocumentType)}
            className="field-input"
          >
            {DOCUMENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label" htmlFor="page_size">
            Page size
          </label>
          <select
            id="page_size"
            value={pageSize}
            onChange={(e) => setPageSize(e.target.value as PageSizeOption)}
            className="field-input"
          >
            <option value="auto">Automatic (matches each photo)</option>
            <option value="a4">A4</option>
            <option value="letter">US Letter</option>
          </select>
        </div>
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="field-label mb-0">Compression</label>
            <span className="text-xs font-mono text-manifest-navy-400">
              {quality >= 0.85 ? "Highest quality" : quality >= 0.65 ? "Balanced" : "Smallest file"}
            </span>
          </div>
          <input
            type="range"
            min={0.4}
            max={0.95}
            step={0.05}
            value={quality}
            onChange={(e) => setQuality(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>

      <p className="text-xs text-manifest-navy-400 mb-4">
        Will save as <span className="font-mono text-manifest-navy-600">{previewFileName}</span>
      </p>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      {result && !error && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          Generated {result.fileName} ({(result.byteSize / 1024 / 1024).toFixed(2)} MB, {pages.length}{" "}
          page{pages.length === 1 ? "" : "s"}) — download should have started automatically.
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleGenerate}
          disabled={pages.length === 0 || isGenerating || !ready}
          title={!ready ? "Waiting for the image-processing engine to finish loading" : undefined}
          className="btn-primary"
        >
          {isGenerating ? "Generating…" : ready ? "Generate & download PDF" : "Waiting for engine…"}
        </button>
        {result && (
          <button
            type="button"
            onClick={() => downloadBlob(result.blob, result.fileName)}
            className="btn-secondary"
          >
            Download again
          </button>
        )}
        <button
          type="button"
          disabled
          title="Coming soon — will attach the PDF directly to a load record once the TMS module exists"
          className="btn-secondary opacity-50 cursor-not-allowed"
        >
          Save to Storage (coming soon)
        </button>
      </div>
    </div>
  );
}
