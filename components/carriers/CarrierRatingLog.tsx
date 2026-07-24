"use client";

import { useState } from "react";
import { format } from "date-fns";
import type { CarrierRating } from "@/lib/types";
import StarRating from "@/components/StarRating";
import DeleteButton from "@/components/DeleteButton";
import { deleteCarrierRating, updateCarrierRating } from "@/actions/carrier-ratings";

export default function CarrierRatingLog({
  carrierId,
  ratings,
  loadNumberById,
}: {
  carrierId: string;
  ratings: CarrierRating[];
  loadNumberById: Record<string, number>;
}) {
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="panel p-5">
      <h2 className="font-display text-lg font-medium text-manifest-navy-800 mb-4">
        Rating activity{" "}
        <span className="text-manifest-navy-400 font-body text-sm font-normal">({ratings.length})</span>
      </h2>

      <div className="space-y-3">
        {ratings.length === 0 && <p className="text-sm text-manifest-navy-400">No ratings yet.</p>}
        {ratings.map((r) =>
          editingId === r.id ? (
            <EditRatingRow
              key={r.id}
              carrierId={carrierId}
              rating={r}
              onDone={() => setEditingId(null)}
              onCancel={() => setEditingId(null)}
            />
          ) : (
            <div key={r.id} className="flex items-start justify-between gap-4 border border-manifest-line rounded-md p-3.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-yellow-400 text-sm">
                    {"★".repeat(r.stars)}
                    <span className="text-manifest-navy-200">{"★".repeat(5 - r.stars)}</span>
                  </span>
                  <span className="text-xs font-mono text-manifest-navy-400">
                    {format(new Date(r.created_at), "MMM d, yyyy · h:mm a")}
                  </span>
                  {r.load_id && loadNumberById[r.load_id] && (
                    <span className="text-xs text-manifest-navy-500">Load #{loadNumberById[r.load_id]}</span>
                  )}
                </div>
                {r.note && <p className="mt-1.5 text-sm text-manifest-navy-700">{r.note}</p>}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  className="text-xs text-manifest-navy-400 hover:text-manifest-navy-700 hover:underline"
                  onClick={() => setEditingId(r.id)}
                >
                  Edit
                </button>
                <DeleteButton action={() => deleteCarrierRating(carrierId, r.id)} confirmMessage="Delete this rating?" />
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function EditRatingRow({
  carrierId,
  rating,
  onDone,
  onCancel,
}: {
  carrierId: string;
  rating: CarrierRating;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [stars, setStars] = useState(rating.stars);
  const [note, setNote] = useState(rating.note ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    await updateCarrierRating(carrierId, rating.id, stars, note);
    setSaving(false);
    onDone();
  }

  return (
    <div className="border border-manifest-line rounded-md p-3.5 bg-manifest-navy-50/30">
      <StarRating value={stars} onChange={setStars} size="sm" />
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="Quick note (optional)"
        className="field-input mt-2 text-sm"
      />
      <div className="flex gap-2 mt-2">
        <button type="button" onClick={handleSave} disabled={saving} className="btn-primary text-xs px-3 py-1.5">
          {saving ? "Saving…" : "Save"}
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary text-xs px-3 py-1.5">
          Cancel
        </button>
      </div>
    </div>
  );
}
