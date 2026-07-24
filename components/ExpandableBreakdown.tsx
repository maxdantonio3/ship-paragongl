"use client";

import { useState } from "react";

export interface BreakdownRow {
  label: string;
  color: string;
  values: number[]; // one per column, same order as `columns`
}

export default function ExpandableBreakdown({
  columns,
  rows,
  toggleLabel = "Show breakdown",
}: {
  columns: string[];
  rows: BreakdownRow[];
  toggleLabel?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-xs font-medium text-manifest-signal hover:underline"
      >
        {open ? "Hide breakdown" : toggleLabel}
      </button>

      {open && (
        <div className="panel p-4 mt-2 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left border-b border-manifest-line">
                <th className="pb-2 pr-4 font-semibold text-manifest-navy-600">&nbsp;</th>
                {columns.map((col) => (
                  <th key={col} className="pb-2 px-3 font-semibold text-manifest-navy-600 text-right whitespace-nowrap">
                    {col}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="border-b border-manifest-line last:border-0">
                  <td className="py-2 pr-4">
                    <span className="inline-flex items-center gap-1.5 text-manifest-navy-700">
                      <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                      {row.label}
                    </span>
                  </td>
                  {row.values.map((v, i) => (
                    <td key={i} className="py-2 px-3 text-right font-mono text-manifest-navy-600">
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
