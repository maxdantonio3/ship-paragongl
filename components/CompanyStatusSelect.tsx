"use client";

import { useTransition } from "react";
import { updateCompanyStatus } from "@/actions/companies";
import { COMPANY_STATUSES, type CompanyStatus } from "@/lib/types";
import clsx from "clsx";

const STATUS_TEXT: Record<CompanyStatus, string> = {
  Cold: "text-status-cold",
  Warm: "text-status-warm",
  Quoting: "text-status-quoting",
  Customer: "text-status-customer",
};

export default function CompanyStatusSelect({
  companyId,
  status,
  compact = false,
}: {
  companyId: string;
  status: CompanyStatus;
  compact?: boolean;
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <select
      defaultValue={status}
      disabled={isPending}
      onChange={(e) => {
        const next = e.target.value as CompanyStatus;
        startTransition(() => {
          updateCompanyStatus(companyId, next);
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
      {COMPANY_STATUSES.map((s) => (
        <option key={s} value={s} className="text-manifest-ink">
          {s}
        </option>
      ))}
    </select>
  );
}
