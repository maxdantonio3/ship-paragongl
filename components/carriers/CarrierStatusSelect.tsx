"use client";

import { useTransition } from "react";
import { updateCarrierStatus } from "@/actions/carriers";
import { CARRIER_STATUSES, type CarrierStatus } from "@/lib/types";
import clsx from "clsx";

const STATUS_TEXT: Record<CarrierStatus, string> = {
  Active: "text-status-customer",
  Inactive: "text-manifest-navy-400",
  "Do Not Use": "text-red-600",
};

export default function CarrierStatusSelect({
  carrierId,
  status,
  compact = false,
}: {
  carrierId: string;
  status: CarrierStatus;
  compact?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value as CarrierStatus;
        startTransition(() => {
          updateCarrierStatus(carrierId, next);
        });
      }}
      className={clsx(
        "rounded-full border bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-manifest-signal-400 cursor-pointer",
        compact ? "text-xs px-2.5 py-1" : "text-sm px-3 py-1.5",
        "border-manifest-line",
        STATUS_TEXT[status],
        isPending && "opacity-50"
      )}
    >
      {CARRIER_STATUSES.map((s) => (
        <option key={s} value={s} className="text-manifest-ink">
          {s}
        </option>
      ))}
    </select>
  );
}
