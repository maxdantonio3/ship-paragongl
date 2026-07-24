"use client";

import { useState } from "react";
import DeliveryRatingModal from "@/components/loads/DeliveryRatingModal";

export default function RateCarrierButton({
  loadId,
  carrierId,
  carrierName,
  carrierMcNumber,
  existingStars,
  existingNote = null,
}: {
  loadId: string;
  carrierId: string;
  carrierName: string;
  carrierMcNumber: string | null;
  existingStars: number | null;
  existingNote?: string | null;
}) {
  const [open, setOpen] = useState(false);

  if (existingStars != null) {
    return (
      <>
        <button type="button" onClick={() => setOpen(true)} className="flex items-center gap-1.5 text-left group">
          <span className="text-yellow-400 text-sm" title={existingNote ?? `${existingStars} of 5 stars`}>
            {"★".repeat(existingStars)}
            <span className="text-manifest-navy-200">{"★".repeat(5 - existingStars)}</span>
          </span>
          <span className="text-manifest-navy-300 group-hover:text-manifest-signal text-xs" aria-label="Edit rating">
            ✎
          </span>
        </button>
        {existingNote && <div className="text-[11px] text-manifest-navy-400 mt-0.5 max-w-[120px] truncate">{existingNote}</div>}
        {open && (
          <DeliveryRatingModal
            loadId={loadId}
            carrierId={carrierId}
            carrierName={carrierName}
            mcNumber={carrierMcNumber}
            defaultStars={existingStars}
            defaultNote={existingNote ?? ""}
            showPodUpload={false}
            showSkip={false}
            onDone={() => setOpen(false)}
            onCancel={() => setOpen(false)}
          />
        )}
      </>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-secondary text-xs px-2.5 py-1.5">
        Rate carrier
      </button>
      {open && (
        <DeliveryRatingModal
          loadId={loadId}
          carrierId={carrierId}
          carrierName={carrierName}
          mcNumber={carrierMcNumber}
          showPodUpload={false}
          showSkip={false}
          onDone={() => setOpen(false)}
          onCancel={() => setOpen(false)}
        />
      )}
    </>
  );
}
