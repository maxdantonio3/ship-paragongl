"use client";

import clsx from "clsx";
import type { FilterMode } from "@/lib/scanner/types";

const FILTERS: { value: FilterMode; label: string; description: string }[] = [
  { value: "original", label: "Original", description: "No filtering" },
  { value: "enhanced", label: "Enhanced Color", description: "Boosted color & contrast" },
  { value: "grayscale", label: "Grayscale", description: "Full grayscale" },
  { value: "bw", label: "B&W Scanner", description: "High-contrast scan look" },
];

export default function FilterControls({
  filterMode,
  brightness,
  contrast,
  onFilterChange,
  onBrightnessChange,
  onContrastChange,
}: {
  filterMode: FilterMode;
  brightness: number;
  contrast: number;
  onFilterChange: (mode: FilterMode) => void;
  onBrightnessChange: (value: number) => void;
  onContrastChange: (value: number) => void;
}) {
  return (
    <div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => onFilterChange(f.value)}
            className={clsx(
              "rounded-md border px-3 py-2 text-left transition",
              filterMode === f.value
                ? "border-manifest-signal bg-manifest-signal-50/40"
                : "border-manifest-line bg-white hover:bg-manifest-navy-50/40"
            )}
          >
            <div
              className={clsx(
                "text-xs font-semibold",
                filterMode === f.value ? "text-manifest-signal-600" : "text-manifest-navy-700"
              )}
            >
              {f.label}
            </div>
            <div className="text-[11px] text-manifest-navy-400 mt-0.5">{f.description}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="field-label mb-0">Brightness</label>
            <span className="text-xs font-mono text-manifest-navy-400">{brightness}</span>
          </div>
          <input
            type="range"
            min={-100}
            max={100}
            value={brightness}
            onChange={(e) => onBrightnessChange(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="field-label mb-0">Contrast</label>
            <span className="text-xs font-mono text-manifest-navy-400">{contrast}</span>
          </div>
          <input
            type="range"
            min={-100}
            max={100}
            value={contrast}
            onChange={(e) => onContrastChange(Number(e.target.value))}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
}
