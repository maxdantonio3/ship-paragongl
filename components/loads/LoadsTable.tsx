"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import type { PayStatus, LoadStatus } from "@/lib/types";
import LoadStatusSelect from "@/components/loads/LoadStatusSelect";
import RateCarrierButton from "@/components/loads/RateCarrierButton";
import PayStatusSelect from "@/components/loads/PayStatusSelect";
import ClickToCopy from "@/components/ClickToCopy";
import CopyableText from "@/components/CopyableText";
import ClickableTableRow from "@/components/ClickableTableRow";
import DeleteButton from "@/components/DeleteButton";
import { updateCarrierPayStatus, updatePglPayStatus, duplicateLoad, deleteLoad } from "@/actions/loads";
import { uploadLoadDocument, getLoadDocumentUrl } from "@/actions/load-documents";

export interface LoadRow {
  id: string;
  load_number: number;
  status: LoadStatus;
  customerName: string;
  carrierId: string | null;
  carrierName: string;
  carrierMcNumber: string | null;
  ratingStars: number | null;
  ratingNote: string | null;
  pickupCityState: string;
  pickupFullAddress: string;
  deliveryCityState: string;
  deliveryFullAddress: string;
  carrierPayment: string;
  driverName: string;
  driverPhone: string;
  revenue: number | null;
  expense: number | null;
  margin: number | null;
  marginPct: number | null;
  carrierPayStatus: PayStatus | null;
  pglPayStatus: PayStatus | null;
  podDocument: { file_name: string; file_path: string } | null;
}

const ALL_COLUMNS = [
  { key: "status", label: "Status" },
  { key: "load_number", label: "Load #" },
  { key: "customer", label: "Customer" },
  { key: "pickup", label: "Pickup" },
  { key: "delivery", label: "Delivery" },
  { key: "carrier", label: "Carrier" },
  { key: "carrier_rating", label: "Carrier Rating" },
  { key: "carrier_payment", label: "Carrier Payment" },
  { key: "driver", label: "Driver" },
  { key: "revenue", label: "Revenue" },
  { key: "expense", label: "Expense" },
  { key: "margin", label: "Margin" },
  { key: "pod", label: "POD" },
  { key: "margin_pct", label: "Margin %" },
  { key: "carrier_pay_status", label: "Carrier Pay Status" },
  { key: "pgl_pay_status", label: "PGL Pay Status" },
] as const;

type ColumnKey = (typeof ALL_COLUMNS)[number]["key"];
type ColumnConfig = { key: ColumnKey; visible: boolean };

const STORAGE_KEY = "paragon-nexus-loads-columns-v1";

function defaultColumns(): ColumnConfig[] {
  return ALL_COLUMNS.map((c) => ({ key: c.key, visible: true }));
}

function fmtMoney(v: number | null) {
  return v != null ? `$${v.toFixed(2)}` : "—";
}

export default function LoadsTable({ rows }: { rows: LoadRow[] }) {
  const [columns, setColumns] = useState<ColumnConfig[]>(defaultColumns());
  const [showCustomize, setShowCustomize] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed: ColumnConfig[] = JSON.parse(saved);
        // Guard against a stale saved config missing newer columns.
        const knownKeys = new Set(parsed.map((c) => c.key));
        const merged = [...parsed, ...defaultColumns().filter((c) => !knownKeys.has(c.key))];
        setColumns(merged);
      }
    } catch {
      // Ignore — fall back to defaults.
    }
    setLoaded(true);
  }, []);

  function persist(next: ColumnConfig[]) {
    setColumns(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Storage might be unavailable (private browsing, etc.) — the
      // in-memory state still works for this session.
    }
  }

  function toggleVisible(key: ColumnKey) {
    persist(columns.map((c) => (c.key === key ? { ...c, visible: !c.visible } : c)));
  }
  function move(key: ColumnKey, dir: -1 | 1) {
    const idx = columns.findIndex((c) => c.key === key);
    const swapIdx = idx + dir;
    if (swapIdx < 0 || swapIdx >= columns.length) return;
    const next = [...columns];
    [next[idx], next[swapIdx]] = [next[swapIdx], next[idx]];
    persist(next);
  }
  function resetColumns() {
    persist(defaultColumns());
  }

  const visibleColumns = columns.filter((c) => c.visible);
  const labelFor = (key: ColumnKey) => ALL_COLUMNS.find((c) => c.key === key)?.label ?? key;

  function renderCell(row: LoadRow, key: ColumnKey) {
    switch (key) {
      case "status":
        return (
          <LoadStatusSelect
            loadId={row.id}
            status={row.status}
            compact
            carrierId={row.carrierId}
            carrierName={row.carrierName}
            carrierMcNumber={row.carrierMcNumber}
          />
        );
      case "load_number":
        return (
          <Link href={`/loads/${row.id}`} className="font-mono font-medium text-manifest-navy-800 hover:text-manifest-signal">
            #{row.load_number}
          </Link>
        );
      case "customer":
        return row.customerName;
      case "pickup":
        return row.pickupFullAddress ? (
          <ClickToCopy value={row.pickupFullAddress} display={row.pickupCityState || "—"} className="text-xs" />
        ) : (
          row.pickupCityState || "—"
        );
      case "delivery":
        return row.deliveryFullAddress ? (
          <ClickToCopy value={row.deliveryFullAddress} display={row.deliveryCityState || "—"} className="text-xs" />
        ) : (
          row.deliveryCityState || "—"
        );
      case "carrier":
        return row.carrierName;
      case "carrier_rating":
        return row.carrierId ? (
          <RateCarrierButton
            loadId={row.id}
            carrierId={row.carrierId}
            carrierName={row.carrierName}
            carrierMcNumber={row.carrierMcNumber}
            existingStars={row.ratingStars}
            existingNote={row.ratingNote}
          />
        ) : (
          "—"
        );
      case "carrier_payment":
        return row.carrierPayment;
      case "driver":
        return row.driverName ? (
          <div>
            <div>{row.driverName}</div>
            {row.driverPhone && (
              <CopyableText value={row.driverPhone} label="Copy driver phone" />
            )}
          </div>
        ) : (
          "—"
        );
      case "revenue":
        return <span className="font-mono text-status-customer">{fmtMoney(row.revenue)}</span>;
      case "expense":
        return <span className="font-mono text-manifest-navy-700">{fmtMoney(row.expense)}</span>;
      case "margin":
        return (
          <span className={clsx("font-mono", (row.margin ?? 0) < 0 ? "text-red-600" : "text-status-customer")}>
            {fmtMoney(row.margin)}
          </span>
        );
      case "pod":
        return <PodCell loadId={row.id} document={row.podDocument} />;
      case "margin_pct":
        return (
          <span className={clsx("font-mono", (row.marginPct ?? 0) < 0 ? "text-red-600" : "text-status-customer")}>
            {row.marginPct != null ? `${row.marginPct.toFixed(1)}%` : "—"}
          </span>
        );
      case "carrier_pay_status":
        return <PayStatusSelect value={row.carrierPayStatus} onChange={(next) => updateCarrierPayStatus(row.id, next)} />;
      case "pgl_pay_status":
        return <PayStatusSelect value={row.pglPayStatus} onChange={(next) => updatePglPayStatus(row.id, next)} />;
    }
  }

  if (!loaded) return null;

  return (
    <div>
      <div className="flex justify-end mb-3">
        <div className="relative">
          <button type="button" onClick={() => setShowCustomize((v) => !v)} className="btn-secondary text-xs px-3 py-1.5">
            Customize columns
          </button>
          {showCustomize && (
            <div className="absolute right-0 mt-2 z-20 w-72 panel p-3 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-manifest-navy-600">Columns</span>
                <button type="button" onClick={resetColumns} className="text-xs text-manifest-signal hover:underline">
                  Reset
                </button>
              </div>
              <div className="max-h-80 overflow-y-auto space-y-1">
                {columns.map((col, i) => (
                  <div key={col.key} className="flex items-center gap-2 text-sm">
                    <input type="checkbox" checked={col.visible} onChange={() => toggleVisible(col.key)} />
                    <span className="flex-1 text-manifest-navy-700">{labelFor(col.key)}</span>
                    <button
                      type="button"
                      onClick={() => move(col.key, -1)}
                      disabled={i === 0}
                      className="text-manifest-navy-400 hover:text-manifest-navy-700 disabled:opacity-30 text-xs px-1"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => move(col.key, 1)}
                      disabled={i === columns.length - 1}
                      className="text-manifest-navy-400 hover:text-manifest-navy-700 disabled:opacity-30 text-xs px-1"
                    >
                      ↓
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="panel overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-manifest-line bg-manifest-navy-50/50 text-left">
                {visibleColumns.map((col) => (
                  <th key={col.key} className="px-2.5 py-2 font-semibold whitespace-nowrap">
                    {labelFor(col.key)}
                  </th>
                ))}
                <th className="px-2.5 py-2 font-semibold whitespace-nowrap">&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <ClickableTableRow
                  key={row.id}
                  href={`/loads/${row.id}`}
                  className="border-b border-manifest-line last:border-0 hover:bg-manifest-navy-50/40 transition"
                >
                  {visibleColumns.map((col) => (
                    <td key={col.key} className="px-2.5 py-1.5 text-manifest-navy-700 whitespace-nowrap">
                      {renderCell(row, col.key)}
                    </td>
                  ))}
                  <td className="px-2.5 py-1.5 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      <Link
                        href={`/loads/${row.id}/edit`}
                        title="Edit"
                        className="btn-secondary text-[11px] px-1.5 py-0.5"
                      >
                        Edit
                      </Link>
                      <form action={duplicateLoad.bind(null, row.id)}>
                        <button type="submit" title="Copy" className="btn-secondary text-[11px] px-1.5 py-0.5">
                          Copy
                        </button>
                      </form>
                      <DeleteButton
                        action={deleteLoad.bind(null, row.id)}
                        confirmMessage={`Delete Load #${row.load_number}? This cannot be undone.`}
                        className="btn-danger text-[11px] px-1.5 py-0.5"
                      />
                    </div>
                  </td>
                </ClickableTableRow>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="px-4 py-12 text-center text-manifest-navy-400">
                    No loads match this view.{" "}
                    <Link href="/loads/new" className="text-manifest-signal hover:underline">
                      Add one
                    </Link>
                    .
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function PodCell({
  loadId,
  document,
}: {
  loadId: string;
  document: { file_name: string; file_path: string } | null;
}) {
  const [current, setCurrent] = useState(document);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    formData.set("document_type", "POD");
    const result = await uploadLoadDocument(loadId, formData);
    setUploading(false);
    if (result.ok) {
      setCurrent({ file_name: result.file_name, file_path: result.file_path });
    } else {
      setError(result.error);
    }
  }

  async function handleDownload() {
    if (!current) return;
    const url = await getLoadDocumentUrl(current.file_path, true);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <div className="flex items-center gap-1.5">
      {current ? (
        <>
          <span className="text-status-customer" title={current.file_name}>
            ✓
          </span>
          <button type="button" onClick={handleDownload} className="text-xs text-manifest-signal hover:underline">
            Download
          </button>
        </>
      ) : (
        <>
          <span className="text-manifest-navy-300">✕</span>
          <input ref={inputRef} type="file" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="text-xs text-manifest-signal hover:underline"
          >
            {uploading ? "Uploading…" : "Upload"}
          </button>
        </>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
