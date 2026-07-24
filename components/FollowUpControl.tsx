"use client";

import { useState, useTransition } from "react";
import { format, addDays } from "date-fns";
import clsx from "clsx";
import { updateNextFollowUp } from "@/actions/companies";

function toDateInputValue(d: Date) {
  return format(d, "yyyy-MM-dd");
}

export default function FollowUpControl({
  companyId,
  nextFollowUpDate,
  defaultDays,
}: {
  companyId: string;
  nextFollowUpDate: string | null;
  defaultDays: number;
}) {
  const [isPending, startTransition] = useTransition();
  const [value, setValue] = useState(nextFollowUpDate ? nextFollowUpDate.slice(0, 10) : "");

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const parsed = value ? new Date(value + "T00:00:00") : null;
  const daysUntil = parsed ? Math.round((parsed.getTime() - today.getTime()) / 86400000) : null;

  let statusLabel = "Not set";
  let statusClass = "text-manifest-navy-400 bg-manifest-navy-50 border-manifest-line";
  if (daysUntil !== null) {
    if (daysUntil < 0) {
      statusLabel = `Overdue by ${Math.abs(daysUntil)}d`;
      statusClass = "text-red-600 bg-red-50 border-red-200";
    } else if (daysUntil === 0) {
      statusLabel = "Due today";
      statusClass = "text-manifest-signal-600 bg-manifest-signal-50 border-manifest-signal-100";
    } else {
      statusLabel = `In ${daysUntil}d`;
      statusClass = "text-status-customer bg-status-customer/10 border-status-customer/30";
    }
  }

  function save(next: string | null) {
    setValue(next ?? "");
    startTransition(() => {
      updateNextFollowUp(companyId, next);
    });
  }

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display text-lg font-medium text-manifest-navy-800">Next follow-up</h2>
        <span className={clsx("rounded-full border px-2.5 py-0.5 text-xs font-semibold", statusClass)}>
          {statusLabel}
        </span>
      </div>

      <input
        type="date"
        value={value}
        disabled={isPending}
        onChange={(e) => save(e.target.value || null)}
        className="field-input mb-3"
      />

      <div className="flex flex-wrap gap-2">
        <QuickButton label="+7d" onClick={() => save(toDateInputValue(addDays(new Date(), 7)))} />
        <QuickButton label="+14d" onClick={() => save(toDateInputValue(addDays(new Date(), 14)))} />
        <QuickButton label="+30d" onClick={() => save(toDateInputValue(addDays(new Date(), 30)))} />
        {value && (
          <button
            type="button"
            disabled={isPending}
            onClick={() => save(null)}
            className="text-xs text-manifest-navy-400 hover:text-red-500 hover:underline px-1"
          >
            Clear
          </button>
        )}
      </div>

      <p className="mt-3 text-xs text-manifest-navy-400">
        Auto-set to {defaultDays} day{defaultDays === 1 ? "" : "s"} after each new activity you log,
        unless you set a specific follow-up date on that activity or override it here.{" "}
        <a href="/settings" className="text-manifest-signal hover:underline">
          Change the default
        </a>
        .
      </p>
    </div>
  );
}

function QuickButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-xs font-medium rounded-md border border-manifest-line bg-white px-2.5 py-1 text-manifest-navy-600 hover:bg-manifest-navy-50"
    >
      {label}
    </button>
  );
}
