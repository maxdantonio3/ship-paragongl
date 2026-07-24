"use client";

import { useState } from "react";
import type { ScannerPage } from "@/lib/scanner/types";
import clsx from "clsx";

export default function PageThumbnailGrid({
  pages,
  activePageId,
  onSelect,
  onReorder,
  onRotate,
  onDelete,
}: {
  pages: ScannerPage[];
  activePageId: string | null;
  onSelect: (id: string) => void;
  onReorder: (fromIndex: number, toIndex: number) => void;
  onRotate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  if (pages.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {pages.map((page, index) => {
        const isActive = page.id === activePageId;
        const isDragOver = overIndex === index && dragIndex !== null && dragIndex !== index;

        return (
          <div
            key={page.id}
            draggable
            onDragStart={() => setDragIndex(index)}
            onDragOver={(e) => {
              e.preventDefault();
              setOverIndex(index);
            }}
            onDragEnd={() => {
              setDragIndex(null);
              setOverIndex(null);
            }}
            onDrop={(e) => {
              e.preventDefault();
              if (dragIndex !== null && dragIndex !== index) onReorder(dragIndex, index);
              setDragIndex(null);
              setOverIndex(null);
            }}
            onClick={() => onSelect(page.id)}
            className={clsx(
              "relative rounded-md border-2 bg-white cursor-pointer overflow-hidden transition group",
              isActive ? "border-manifest-signal" : "border-manifest-line hover:border-manifest-navy-200",
              isDragOver && "ring-2 ring-manifest-signal-100"
            )}
          >
            <div className="aspect-[3/4] bg-manifest-navy-50 flex items-center justify-center overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={page.previewDataUrl || page.workingDataUrl}
                alt={`Page ${index + 1}`}
                className="w-full h-full object-contain"
              />
              {page.isProcessing && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                  <span className="text-xs text-manifest-navy-400">Processing…</span>
                </div>
              )}
            </div>

            <div className="absolute top-1.5 left-1.5 bg-manifest-navy-800/80 text-white text-[10px] font-semibold rounded-full w-5 h-5 flex items-center justify-center">
              {index + 1}
            </div>

            <div className="absolute top-1.5 right-1.5 flex gap-1 opacity-0 group-hover:opacity-100 transition">
              <button
                type="button"
                title="Rotate"
                onClick={(e) => {
                  e.stopPropagation();
                  onRotate(page.id);
                }}
                className="w-6 h-6 rounded-md bg-white/90 border border-manifest-line flex items-center justify-center text-manifest-navy-600 hover:text-manifest-signal"
              >
                <RotateIcon />
              </button>
              <button
                type="button"
                title="Delete"
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(page.id);
                }}
                className="w-6 h-6 rounded-md bg-white/90 border border-manifest-line flex items-center justify-center text-manifest-navy-600 hover:text-red-500"
              >
                <TrashIcon />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RotateIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
      <path d="M21 12a9 9 0 11-3-6.7" strokeLinecap="round" />
      <path d="M21 3v6h-6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-3.5 h-3.5">
      <path d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2m3 0v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6h14z" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
