import clsx from "clsx";
import type { CarrierStatus } from "@/lib/types";

const STATUS_STYLES: Record<CarrierStatus, string> = {
  Active: "bg-status-customer/10 text-status-customer border-status-customer/30",
  Inactive: "bg-manifest-navy-100 text-manifest-navy-400 border-manifest-navy-200",
  "Do Not Use": "bg-red-50 text-red-600 border-red-200",
};

export default function CarrierStatusBadge({ status }: { status: CarrierStatus }) {
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
