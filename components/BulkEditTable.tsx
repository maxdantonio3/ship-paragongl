"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { bulkUpdateCompanies } from "@/actions/companies";
import { COMPANY_STATUSES, type Branch, type Company, type CompanyStatus } from "@/lib/types";

interface EditableRow {
  id: string;
  name: string;
  status: CompanyStatus;
  branch_id: string | null;
}

export default function BulkEditTable({
  companies,
  branches,
}: {
  companies: Company[];
  branches: Branch[];
}) {
  const router = useRouter();
  const hasBranches = branches.length > 0;

  const initial: EditableRow[] = companies.map((c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    branch_id: c.branch_id,
  }));

  const [rows, setRows] = useState<EditableRow[]>(initial);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [bulkStatus, setBulkStatus] = useState<CompanyStatus>("Cold");
  const [bulkBranch, setBulkBranch] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const originalById = useMemo(() => {
    const m = new Map<string, EditableRow>();
    initial.forEach((r) => m.set(r.id, r));
    return m;
  }, [companies]);

  const dirtyIds = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => {
      const orig = originalById.get(r.id);
      if (!orig) return;
      if (orig.status !== r.status || orig.branch_id !== r.branch_id) s.add(r.id);
    });
    return s;
  }, [rows, originalById]);

  const filteredRows = rows.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()));

  function updateRow(id: string, patch: Partial<EditableRow>) {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)));
  }

  function toggleSelected(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    if (selected.size === filteredRows.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredRows.map((r) => r.id)));
    }
  }

  function applyBulkStatus() {
    setRows((prev) => prev.map((r) => (selected.has(r.id) ? { ...r, status: bulkStatus } : r)));
  }

  function applyBulkBranch() {
    setRows((prev) =>
      prev.map((r) => (selected.has(r.id) ? { ...r, branch_id: bulkBranch || null } : r))
    );
  }

  function handleSave() {
    const updates = Array.from(dirtyIds).map((id) => {
      const r = rows.find((row) => row.id === id)!;
      return { id: r.id, status: r.status, branch_id: r.branch_id };
    });
    if (updates.length === 0) {
      setMessage({ type: "error", text: "No changes to save." });
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const result = await bulkUpdateCompanies(updates);
      if (result.ok) {
        setMessage({ type: "success", text: `Saved changes to ${result.updated} compan${result.updated === 1 ? "y" : "ies"}.` });
        router.refresh();
      } else {
        setMessage({ type: "error", text: result.error });
      }
    });
  }

  return (
    <div>
      <div className="panel p-4 mb-5 flex flex-wrap items-end gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="field-label">Filter by name</label>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type to filter…"
            className="field-input"
          />
        </div>

        <div className="flex items-end gap-2">
          <div>
            <label className="field-label">Set status for selected</label>
            <select
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value as CompanyStatus)}
              className="field-input"
            >
              {COMPANY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <button
            type="button"
            onClick={applyBulkStatus}
            disabled={selected.size === 0}
            className="btn-secondary"
          >
            Apply
          </button>
        </div>

        {hasBranches && (
          <div className="flex items-end gap-2">
            <div>
              <label className="field-label">Set branch for selected</label>
              <select
                value={bulkBranch}
                onChange={(e) => setBulkBranch(e.target.value)}
                className="field-input"
              >
                <option value="">No branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={applyBulkBranch}
              disabled={selected.size === 0}
              className="btn-secondary"
            >
              Apply
            </button>
          </div>
        )}

        <div className="text-xs text-manifest-navy-400 pb-2">
          {selected.size} selected · {dirtyIds.size} changed
        </div>
      </div>

      {message && (
        <div
          className={`mb-4 rounded-md border px-3 py-2 text-sm ${
            message.type === "success"
              ? "border-green-200 bg-green-50 text-green-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="panel overflow-hidden mb-5">
        <div className="overflow-x-auto max-h-[60vh] overflow-y-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-manifest-bg z-10">
              <tr className="border-b border-manifest-line bg-manifest-navy-50/80 text-left">
                <th className="px-4 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={filteredRows.length > 0 && selected.size === filteredRows.length}
                    onChange={toggleSelectAll}
                    className="rounded border-manifest-line"
                  />
                </th>
                <th className="px-4 py-3 font-semibold">Company</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                {hasBranches && <th className="px-4 py-3 font-semibold">Branch</th>}
              </tr>
            </thead>
            <tbody>
              {filteredRows.map((r) => {
                const dirty = dirtyIds.has(r.id);
                return (
                  <tr
                    key={r.id}
                    className={`border-b border-manifest-line last:border-0 ${
                      dirty ? "bg-manifest-signal-50/40" : ""
                    }`}
                  >
                    <td className="px-4 py-2.5">
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggleSelected(r.id)}
                        className="rounded border-manifest-line"
                      />
                    </td>
                    <td className="px-4 py-2.5">
                      <Link
                        href={`/companies/${r.id}`}
                        className="font-medium text-manifest-navy-800 hover:text-manifest-signal"
                      >
                        {r.name}
                      </Link>
                      {dirty && (
                        <span className="ml-2 text-[10px] font-semibold uppercase tracking-wide text-manifest-signal-600">
                          Changed
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <select
                        value={r.status}
                        onChange={(e) => updateRow(r.id, { status: e.target.value as CompanyStatus })}
                        className="field-input py-1 text-sm"
                      >
                        {COMPANY_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </td>
                    {hasBranches && (
                      <td className="px-4 py-2.5">
                        <select
                          value={r.branch_id ?? ""}
                          onChange={(e) => updateRow(r.id, { branch_id: e.target.value || null })}
                          className="field-input py-1 text-sm"
                        >
                          <option value="">No branch</option>
                          {branches.map((b) => (
                            <option key={b.id} value={b.id}>
                              {b.name}
                            </option>
                          ))}
                        </select>
                      </td>
                    )}
                  </tr>
                );
              })}
              {filteredRows.length === 0 && (
                <tr>
                  <td colSpan={hasBranches ? 4 : 3} className="px-4 py-10 text-center text-manifest-navy-400">
                    No companies match "{search}".
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending || dirtyIds.size === 0}
        className="btn-primary"
      >
        {isPending ? "Saving…" : `Save changes${dirtyIds.size > 0 ? ` (${dirtyIds.size})` : ""}`}
      </button>
    </div>
  );
}
