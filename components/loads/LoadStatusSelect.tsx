"use client";

import { useState, useTransition } from "react";
import { updateLoadStatus } from "@/actions/loads";
import { LOAD_STATUSES, type LoadStatus } from "@/lib/types";
import DeliveryRatingModal from "@/components/loads/DeliveryRatingModal";
import clsx from "clsx";

export default function LoadStatusSelect({
  loadId,
  status,
  compact = false,
  carrierId = null,
  carrierName = "",
  carrierMcNumber = null,
}: {
  loadId: string;
  status: LoadStatus;
  compact?: boolean;
  carrierId?: string | null;
  carrierName?: string;
  carrierMcNumber?: string | null;
}) {
  const [isPending, startTransition] = useTransition();
  const [currentStatus, setCurrentStatus] = useState(status);
  const [showRatingModal, setShowRatingModal] = useState(false);

  function commitStatus(next: LoadStatus) {
    setCurrentStatus(next);
    startTransition(() => {
      updateLoadStatus(loadId, next);
    });
  }

  function handleChange(next: LoadStatus) {
    // Marking a load Delivered, with a carrier assigned, is the natural
    // moment to prompt for a rating — but never blocks the status change
    // itself; skipping just proceeds immediately, and canceling leaves
    // the status untouched.
    if (next === "Delivered" && carrierId) {
      setShowRatingModal(true);
    } else {
      commitStatus(next);
    }
  }

  return (
    <>
      <select
        value={currentStatus}
        disabled={isPending}
        onChange={(e) => handleChange(e.target.value as LoadStatus)}
        className={clsx(
          "rounded-full border bg-white font-semibold focus:outline-none focus:ring-2 focus:ring-manifest-signal-400 cursor-pointer border-manifest-line text-manifest-navy-700",
          compact ? "text-[11px] px-2 py-0.5" : "text-sm px-3 py-1.5",
          isPending && "opacity-50"
        )}
      >
        {LOAD_STATUSES.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>

      {showRatingModal && carrierId && (
        <DeliveryRatingModal
          loadId={loadId}
          carrierId={carrierId}
          carrierName={carrierName}
          mcNumber={carrierMcNumber}
          onDone={() => {
            setShowRatingModal(false);
            commitStatus("Delivered");
          }}
          onSkip={() => {
            setShowRatingModal(false);
            commitStatus("Delivered");
          }}
          onCancel={() => setShowRatingModal(false)}
        />
      )}
    </>
  );
}
