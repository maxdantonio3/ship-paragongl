"use client";

import { useState } from "react";
import StarRating from "@/components/StarRating";
import { submitCarrierRating } from "@/actions/carrier-ratings";
import { uploadLoadDocument } from "@/actions/load-documents";

export default function DeliveryRatingModal({
  loadId,
  carrierId,
  carrierName,
  mcNumber,
  defaultStars = 0,
  defaultNote = "",
  showPodUpload = true,
  showSkip = true,
  onDone,
  onSkip,
  onCancel,
}: {
  loadId: string;
  carrierId: string;
  carrierName: string;
  mcNumber: string | null;
  defaultStars?: number;
  defaultNote?: string;
  showPodUpload?: boolean;
  showSkip?: boolean;
  onDone: () => void;
  onSkip?: () => void;
  onCancel: () => void;
}) {
  const [stars, setStars] = useState(defaultStars);
  const [note, setNote] = useState(defaultNote);
  const [markDoNotUse, setMarkDoNotUse] = useState(false);
  const [podFile, setPodFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isEditing = defaultStars > 0;

  async function handleSubmit() {
    if (stars === 0) {
      setError("Pick at least one star, or Cancel if you don't want to rate this one.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await submitCarrierRating(carrierId, loadId, stars, note, markDoNotUse);
      if (podFile) {
        const fd = new FormData();
        fd.set("file", podFile);
        fd.set("document_type", "POD");
        const result = await uploadLoadDocument(loadId, fd);
        if (!result.ok) {
          setError(`Rating saved, but the POD upload failed: ${result.error}`);
          setSubmitting(false);
          return;
        }
      }
      setSubmitting(false);
      onDone();
    } catch (e) {
      setSubmitting(false);
      setError(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6 relative">
        <button
          type="button"
          onClick={onCancel}
          aria-label="Close"
          className="absolute top-3 right-3 text-manifest-navy-300 hover:text-manifest-navy-600 text-xl leading-none"
        >
          ×
        </button>

        <h2 className="font-display text-lg font-medium text-manifest-navy-800 mb-1 pr-6">
          {isEditing ? "Edit carrier rating" : "Rate this carrier"}
        </h2>
        <div className="text-sm text-manifest-navy-700 font-medium">{carrierName}</div>
        {mcNumber && <div className="text-xs text-manifest-navy-400 font-mono mb-4">MC {mcNumber}</div>}

        <div className="flex justify-center my-5">
          <StarRating value={stars} onChange={setStars} />
        </div>

        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          placeholder="Quick note (optional)"
          className="field-input mb-3"
        />

        <label className="flex items-center gap-2 text-sm text-manifest-navy-600 mb-4">
          <input type="checkbox" checked={markDoNotUse} onChange={(e) => setMarkDoNotUse(e.target.checked)} />
          Mark this carrier as Do Not Use
        </label>

        {showPodUpload && (
          <div className="mb-4">
            <label className="field-label">POD (optional)</label>
            <input
              type="file"
              onChange={(e) => setPodFile(e.target.files?.[0] ?? null)}
              className="text-sm text-manifest-navy-600"
            />
          </div>
        )}

        {error && (
          <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{error}</div>
        )}

        <div className="flex items-center justify-end gap-2 mt-5">
          <button type="button" onClick={onCancel} className="btn-secondary text-sm">
            Cancel
          </button>
          {showSkip && (
            <button type="button" onClick={onSkip} className="btn-secondary text-sm">
              Skip for now
            </button>
          )}
          <button type="button" onClick={handleSubmit} disabled={submitting} className="btn-primary text-sm">
            {submitting ? "Saving…" : isEditing ? "Save changes" : "Submit rating"}
          </button>
        </div>
      </div>
    </div>
  );
}
