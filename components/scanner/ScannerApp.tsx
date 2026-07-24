"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useScannerWorker } from "@/lib/scanner/worker-client";
import { downscaleDataUrl, fileToDataUrl, generateId, isHeicFile, loadImage, urlToImageBitmap } from "@/lib/scanner/image-utils";
import { convertHeicToDataUrl } from "@/lib/scanner/heic";
import type { FilterMode, Point, ScannerPage } from "@/lib/scanner/types";
import UploadDropzone from "@/components/scanner/UploadDropzone";
import PageThumbnailGrid from "@/components/scanner/PageThumbnailGrid";
import CropEditor from "@/components/scanner/CropEditor";
import FilterControls from "@/components/scanner/FilterControls";
import ExportPanel from "@/components/scanner/ExportPanel";

export default function ScannerApp() {
  const { client: worker, ready: workerReady, error: workerError, retry: retryWorker } = useScannerWorker();
  const [pages, setPages] = useState<ScannerPage[]>([]);
  const [activePageId, setActivePageId] = useState<string | null>(null);
  const [cropMode, setCropMode] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const processedOnLoadRef = useRef<Set<string>>(new Set());

  const activePage = pages.find((p) => p.id === activePageId) ?? null;

  const reprocessPage = useCallback(
    async (pageId: string, overrides?: Partial<Pick<ScannerPage, "rotation" | "filterMode" | "brightness" | "contrast">>) => {
      if (!worker) return;
      setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, isProcessing: true } : p)));

      setPages((prevAll) => {
        const target = prevAll.find((p) => p.id === pageId);
        if (!target) return prevAll;
        const merged = { ...target, ...overrides };

        (async () => {
          try {
            const bitmap = await urlToImageBitmap(merged.workingDataUrl);
            const result = await worker.process(bitmap, {
              corners: null,
              rotation: merged.rotation,
              filterMode: merged.filterMode,
              brightness: merged.brightness,
              contrast: merged.contrast,
            });
            const newUrl = URL.createObjectURL(result.blob);
            setPages((prev) =>
              prev.map((p) => {
                if (p.id !== pageId) return p;
                if (p.previewDataUrl.startsWith("blob:")) URL.revokeObjectURL(p.previewDataUrl);
                return { ...p, ...overrides, previewDataUrl: newUrl, isProcessing: false };
              })
            );
          } catch {
            setPages((prev) => prev.map((p) => (p.id === pageId ? { ...p, isProcessing: false } : p)));
          }
        })();

        return prevAll;
      });
    },
    [worker]
  );

  // Process any page that arrived before the OpenCV worker finished loading.
  useEffect(() => {
    if (!worker || !workerReady) return;
    pages.forEach((p) => {
      if (!processedOnLoadRef.current.has(p.id)) {
        processedOnLoadRef.current.add(p.id);
        reprocessPage(p.id);
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worker, workerReady, pages.length]);

  async function handleFilesSelected(files: File[]) {
    setImportError(null);
    for (const file of files) {
      try {
        const rawDataUrl = isHeicFile(file) ? await convertHeicToDataUrl(file) : await fileToDataUrl(file);
        const dataUrl = await downscaleDataUrl(rawDataUrl, 2200);
        const img = await loadImage(dataUrl);

        const id = generateId();
        const newPage: ScannerPage = {
          id,
          fileName: file.name,
          workingDataUrl: dataUrl,
          naturalWidth: img.naturalWidth,
          naturalHeight: img.naturalHeight,
          rotation: 0,
          filterMode: "original",
          brightness: 0,
          contrast: 0,
          previewDataUrl: dataUrl,
          isProcessing: false,
        };

        setPages((prev) => [...prev, newPage]);
        setActivePageId((prev) => prev ?? id);
      } catch (e) {
        setImportError(
          `Couldn't read "${file.name}" — ${e instanceof Error ? e.message : "unknown error"}.`
        );
      }
    }
  }

  function handleReorder(fromIndex: number, toIndex: number) {
    setPages((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  }

  function handleRotate(id: string) {
    const page = pages.find((p) => p.id === id);
    if (!page) return;
    const nextRotation = ((page.rotation + 90) % 360) as 0 | 90 | 180 | 270;
    reprocessPage(id, { rotation: nextRotation });
  }

  function handleDelete(id: string) {
    setPages((prev) => prev.filter((p) => p.id !== id));
    if (activePageId === id) {
      setActivePageId(null);
      setCropMode(false);
    }
  }

  function handleFilterChange(mode: FilterMode) {
    if (!activePage) return;
    reprocessPage(activePage.id, { filterMode: mode });
  }

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  function handleBrightnessChange(value: number) {
    if (!activePage) return;
    setPages((prev) => prev.map((p) => (p.id === activePage.id ? { ...p, brightness: value } : p)));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => reprocessPage(activePage.id, { brightness: value }), 250);
  }
  function handleContrastChange(value: number) {
    if (!activePage) return;
    setPages((prev) => prev.map((p) => (p.id === activePage.id ? { ...p, contrast: value } : p)));
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => reprocessPage(activePage.id, { contrast: value }), 250);
  }

  async function handleApplyCrop(naturalCorners: Point[]) {
    if (!activePage || !worker) return;
    const bitmap = await urlToImageBitmap(activePage.workingDataUrl);
    const result = await worker.commitCrop(bitmap, naturalCorners, activePage.rotation);
    const newWorkingUrl = URL.createObjectURL(result.blob);

    setPages((prev) =>
      prev.map((p) => {
        if (p.id !== activePage.id) return p;
        if (p.workingDataUrl.startsWith("blob:")) URL.revokeObjectURL(p.workingDataUrl);
        return {
          ...p,
          workingDataUrl: newWorkingUrl,
          naturalWidth: result.width,
          naturalHeight: result.height,
          rotation: 0,
        };
      })
    );
    setCropMode(false);
    reprocessPage(activePage.id, { rotation: 0 });
  }

  return (
    <div className="space-y-6">
      {workerError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-start justify-between gap-3 flex-wrap">
          <span>
            {workerError} Uploading, reordering, and deleting pages will still work, but cropping and
            filters need this to load.
          </span>
          <button type="button" onClick={retryWorker} className="btn-secondary text-xs px-2.5 py-1.5 shrink-0">
            Retry
          </button>
        </div>
      )}
      {!workerReady && !workerError && (
        <div className="rounded-md border border-manifest-line bg-manifest-navy-50/60 px-4 py-3 text-sm text-manifest-navy-500">
          Starting the image-processing worker — this only takes a moment.
        </div>
      )}
      {importError && (
        <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {importError}
        </div>
      )}

      <UploadDropzone onFilesSelected={handleFilesSelected} compact={pages.length > 0} />

      {pages.length > 0 && (
        <>
          <div>
            <h2 className="font-display text-lg font-medium text-manifest-navy-800 mb-3">
              Pages ({pages.length})
            </h2>
            <PageThumbnailGrid
              pages={pages}
              activePageId={activePageId}
              onSelect={(id) => {
                setActivePageId(id);
                setCropMode(false);
              }}
              onReorder={handleReorder}
              onRotate={handleRotate}
              onDelete={handleDelete}
            />
          </div>

          {activePage && (
            <div className="panel p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-display text-lg font-medium text-manifest-navy-800">Edit page</h2>
                {!cropMode && (
                  <button
                    type="button"
                    onClick={() => setCropMode(true)}
                    disabled={!workerReady}
                    className="btn-secondary text-sm disabled:opacity-50"
                  >
                    Crop this page
                  </button>
                )}
              </div>

              {cropMode ? (
                <CropEditor
                  imageUrl={activePage.workingDataUrl}
                  onApplyCrop={handleApplyCrop}
                  onCancel={() => setCropMode(false)}
                />
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-manifest-navy-50 rounded-md flex items-center justify-center p-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={activePage.previewDataUrl}
                      alt="Selected page preview"
                      className="max-h-[420px] w-auto rounded"
                    />
                  </div>
                  <FilterControls
                    filterMode={activePage.filterMode}
                    brightness={activePage.brightness}
                    contrast={activePage.contrast}
                    onFilterChange={handleFilterChange}
                    onBrightnessChange={handleBrightnessChange}
                    onContrastChange={handleContrastChange}
                  />
                </div>
              )}
            </div>
          )}

          <ExportPanel worker={worker} ready={workerReady} pages={pages} />
        </>
      )}
    </div>
  );
}
