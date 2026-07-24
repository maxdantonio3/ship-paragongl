import clsx from "clsx";
import type { LoadStatus } from "@/lib/types";

const STATUS_STYLES: Record<LoadStatus, string> = {
  Quoted: "bg-manifest-navy-100 text-manifest-navy-500 border-manifest-navy-200",
  Ordered: "bg-amber-50 text-amber-700 border-amber-200",
  "Pickup Scheduled": "bg-orange-50 text-orange-600 border-orange-200",
  "Picked Up": "bg-blue-50 text-blue-600 border-blue-200",
  "Delivery Scheduled": "bg-teal-50 text-teal-600 border-teal-200",
  Delivered: "bg-status-customer/10 text-status-customer border-status-customer/30",
  Cancelled: "bg-red-50 text-red-600 border-red-200",
};

export default function LoadStatusBadge({ status }: { status: LoadStatus }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap",
        STATUS_STYLES[status]
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
