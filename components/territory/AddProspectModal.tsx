"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addProspectToCrm } from "@/actions/territory";
import { COMPANY_STATUSES, ACTIVITY_TYPES, type ActivityType, type Branch, type CompanyStatus } from "@/lib/types";
import type { GooglePlaceResult } from "@/lib/google-places";

export default function AddProspectModal({
  place,
  branches,
  onClose,
}: {
  place: GooglePlaceResult;
  branches: Branch[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<CompanyStatus>("Cold");
  const [branchId, setBranchId] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [logActivity, setLogActivity] = useState(false);
  const [activityType, setActivityType] = useState<ActivityType>("In-Person Visit");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const formData = new FormData();
    formData.set("name", place.name);
    formData.set("status", status);
    formData.set("address", place.address);
    formData.set("city", place.city);
    formData.set("state", place.state);
    formData.set("zip", place.zip);
    formData.set("phone", place.phone);
    formData.set("email", email);
    formData.set("website", place.website);
    formData.set("google_maps_link", place.googleMapsLink);
    formData.set("google_place_id", place.id);
    if (notes.trim()) formData.set("notes_summary", notes.trim());
    if (place.latitude != null) formData.set("latitude", String(place.latitude));
    if (place.longitude != null) formData.set("longitude", String(place.longitude));
    if (branchId) formData.set("branch_id", branchId);
    if (logActivity) {
      formData.set("activity_type", activityType);
      if (notes.trim()) formData.set("activity_notes", notes.trim());
    }

    const result = await addProspectToCrm(formData);
    setSaving(false);

    if (result.ok) {
      router.refresh();
      onClose();
    } else {
      setError(result.error);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="panel w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between mb-4 gap-3">
          <div>
            <h3 className="font-display text-lg font-medium text-manifest-navy-800">Add to CRM</h3>
            <p className="text-sm text-manifest-navy-400 mt-0.5">{place.name}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-manifest-navy-400 hover:text-manifest-navy-700 shrink-0"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-manifest-navy-400 mb-4">
          {[place.address, place.city, place.state].filter(Boolean).join(", ") || "No address on file"}
          {place.phone ? ` · ${place.phone}` : ""}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="field-label">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as CompanyStatus)}
              className="field-input"
            >
              {COMPANY_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          {branches.length > 0 && (
            <div>
              <label className="field-label">Branch</label>
              <select value={branchId} onChange={(e) => setBranchId(e.target.value)} className="field-input">
                <option value="">No branch</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="field-label">Email (optional)</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="field-input"
              placeholder="Google Maps doesn't provide this — add it if you have it"
            />
          </div>

          <div>
            <label className="field-label">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="field-input"
              placeholder="First impression, what you noticed driving by, anything worth remembering…"
            />
          </div>

          <div className="border-t border-manifest-line pt-3">
            <label className="flex items-center gap-2 text-sm font-medium text-manifest-navy-700 cursor-pointer">
              <input
                type="checkbox"
                checked={logActivity}
                onChange={(e) => setLogActivity(e.target.checked)}
                className="rounded border-manifest-line"
              />
              Log this as an activity
            </label>
            {logActivity && (
              <select
                value={activityType}
                onChange={(e) => setActivityType(e.target.value as ActivityType)}
                className="field-input mt-2"
              >
                {ACTIVITY_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {error}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button type="submit" disabled={saving} className="btn-primary text-sm">
              {saving ? "Adding…" : "Add company"}
            </button>
            <button type="button" onClick={onClose} className="btn-secondary text-sm">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
