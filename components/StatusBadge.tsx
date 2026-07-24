import clsx from "clsx";
import type { CompanyStatus } from "@/lib/types";

const STATUS_STYLES: Record<CompanyStatus, string> = {
  Cold: "bg-status-cold/10 text-status-cold border-status-cold/30",
  Warm: "bg-status-warm/10 text-status-warm border-status-warm/30",
  Quoting: "bg-status-quoting/10 text-status-quoting border-status-quoting/30",
  Customer: "bg-status-customer/10 text-status-customer border-status-customer/30",
};

export default function StatusBadge({ status }: { status: CompanyStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        STATUS_STYLES[status]
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
