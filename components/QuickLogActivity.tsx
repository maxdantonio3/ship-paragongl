"use client";

import { useState } from "react";
import { createActivity } from "@/actions/activities";
import { getCompanyContacts } from "@/actions/contacts";
import { ACTIVITY_TYPES, type Contact } from "@/lib/types";

function nowLocalInputValue() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function PlusIconSmall() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5 shrink-0">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  );
}

export default function QuickLogActivity({
  companyId,
  companyName,
}: {
  companyId: string;
  companyName: string;
}) {
  const [open, setOpen] = useState(false);
  const [contacts, setContacts] = useState<Contact[] | null>(null);
  const [saving, setSaving] = useState(false);

  function openModal() {
    setOpen(true);
    if (contacts === null) {
      getCompanyContacts(companyId)
        .then(setContacts)
        .catch(() => setContacts([]));
    }
  }

  async function handleSubmit(formData: FormData) {
    setSaving(true);
    try {
      await createActivity(companyId, formData);
      setOpen(false);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        title="Log activity"
        aria-label={`Log activity for ${companyName}`}
        className="inline-flex items-center justify-center w-7 h-7 rounded-md border border-manifest-line bg-white text-manifest-navy-600 shadow-panel hover:bg-manifest-navy-50 hover:border-manifest-signal-100 hover:text-manifest-signal transition"
      >
        <PlusIconSmall />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
          onClick={() => !saving && setOpen(false)}
        >
          <div
            className="panel w-full max-w-md p-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4 gap-3">
              <h3 className="font-display text-lg font-medium text-manifest-navy-800">
                Log activity
                <span className="block text-sm font-normal text-manifest-navy-400 mt-0.5">
                  {companyName}
                </span>
              </h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-manifest-navy-400 hover:text-manifest-navy-700 shrink-0"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <form action={handleSubmit} className="space-y-3">
              <div>
                <label className="field-label">Activity type</label>
                <select name="activity_type" required className="field-input" defaultValue="Email">
                  {ACTIVITY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Date / time</label>
                <input
                  type="datetime-local"
                  name="activity_date"
                  defaultValue={nowLocalInputValue()}
                  className="field-input"
                />
              </div>
              <div>
                <label className="field-label">Contact person (optional)</label>
                <select name="contact_id" className="field-input" defaultValue="" disabled={contacts === null}>
                  <option value="">
                    {contacts === null ? "Loading contacts…" : "— None —"}
                  </option>
                  {contacts?.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.first_name} {c.last_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="field-label">Follow-up date (optional)</label>
                <input type="date" name="follow_up_date" className="field-input" />
              </div>
              <div>
                <label className="field-label">Notes / details</label>
                <textarea name="notes" rows={2} className="field-input" placeholder="What happened…" />
              </div>
              <div className="flex gap-2 pt-1">
                <button type="submit" disabled={saving} className="btn-primary text-sm">
                  {saving ? "Saving…" : "Save activity"}
                </button>
                <button type="button" onClick={() => setOpen(false)} className="btn-secondary text-sm">
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
