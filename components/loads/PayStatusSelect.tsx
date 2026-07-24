"use client";

import { useTransition } from "react";
import { PAY_STATUSES, type PayStatus } from "@/lib/types";
import clsx from "clsx";

const STYLES: Record<string, string> = {
  "": "bg-manifest-navy-50 text-manifest-navy-400 border-manifest-line",
  Invoiced: "bg-amber-50 text-amber-700 border-amber-200",
  Paid: "bg-status-customer/10 text-status-customer border-status-customer/30",
  "N/A": "bg-manifest-navy-50 text-manifest-navy-400 border-manifest-line",
};

export default function PayStatusSelect({
  value,
  onChange,
}: {
  value: PayStatus | null;
  onChange: (next: PayStatus | null) => void | Promise<void>;
}) {
  const [isPending, startTransition] = useTransition();
  const current = value ?? "";

  return (
    <select
      defaultValue={current}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value === "" ? null : (e.target.value as PayStatus);
        startTransition(() => {
          onChange(next);
        });
      }}
      className={clsx(
        "rounded-full border text-[11px] font-semibold px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-manifest-signal-400 cursor-pointer",
        STYLES[current],
        isPending && "opacity-50"
      )}
    >
      <option value="" className="text-manifest-ink">
        — Blank —
      </option>
      {PAY_STATUSES.map((s) => (
        <option key={s} value={s} className="text-manifest-ink">
          {s}
        </option>
      ))}
    </select>
  );
}
