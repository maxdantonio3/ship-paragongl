"use client";

import { useState } from "react";
import { format } from "date-fns";
import type { Activity, Contact } from "@/lib/types";
import { ACTIVITY_TYPES } from "@/lib/types";
import DeleteButton from "@/components/DeleteButton";
import clsx from "clsx";

const TYPE_STYLES: Record<string, string> = {
  Email: "bg-blue-50 text-blue-700 border-blue-200",
  Call: "bg-emerald-50 text-emerald-700 border-emerald-200",
  "In-Person Visit": "bg-manifest-signal-50 text-manifest-signal-600 border-manifest-signal-100",
  Quoted: "bg-purple-50 text-purple-700 border-purple-200",
  "Work Received": "bg-status-customer/10 text-status-customer border-status-customer/30",
  Other: "bg-manifest-navy-50 text-manifest-navy-600 border-manifest-line",
};

function nowLocalInputValue() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

function toLocalInputValue(isoString: string) {
  const d = new Date(isoString);
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function ActivityLog({
  contacts,
  activities,
  createActivity,
  updateActivity,
  deleteActivity,
}: {
  contacts: Contact[];
  activities: Activity[];
  createActivity: (formData: FormData) => Promise<void>;
  updateActivity: (activityId: string, formData: FormData) => Promise<void>;
  deleteActivity: (activityId: string) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const contactName = (id: string | null) => {
    if (!id) return null;
    const c = contacts.find((c) => c.id === id);
    return c ? `${c.first_name} ${c.last_name ?? ""}`.trim() : null;
  };

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-medium text-manifest-navy-800">
          Activity log{" "}
          <span className="text-manifest-navy-400 font-body text-sm font-normal">
            ({activities.length})
          </span>
        </h2>
        <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => setAdding((v) => !v)}>
          {adding ? "Cancel" : "+ Log activity"}
        </button>
      </div>

      {adding && (
        <form
          action={async (fd) => {
            await createActivity(fd);
            setAdding(false);
          }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 border border-manifest-line rounded-md p-4 bg-manifest-navy-50/30"
        >
          <ActivityFields contacts={contacts} defaultDate={nowLocalInputValue()} />
          <div className="sm:col-span-2">
            <button type="submit" className="btn-primary text-sm">
              Save activity
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {activities.length === 0 && !adding && (
          <p className="text-sm text-manifest-navy-400">No activity logged yet.</p>
        )}
        {activities.map((a) =>
          editingId === a.id ? (
            <form
              key={a.id}
              action={async (fd) => {
                await updateActivity(a.id, fd);
                setEditingId(null);
              }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 border border-manifest-line rounded-md p-4 bg-manifest-navy-50/30"
            >
              <ActivityFields contacts={contacts} activity={a} defaultDate={toLocalInputValue(a.activity_date)} />
              <div className="sm:col-span-2 flex gap-2">
                <button type="submit" className="btn-primary text-sm">
                  Save
                </button>
                <button type="button" className="btn-secondary text-sm" onClick={() => setEditingId(null)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div key={a.id} className="flex items-start justify-between gap-4 border border-manifest-line rounded-md p-3.5">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={clsx(
                      "inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold",
                      TYPE_STYLES[a.activity_type]
                    )}
                  >
                    {a.activity_type}
                  </span>
                  <span className="text-xs font-mono text-manifest-navy-400">
                    {format(new Date(a.activity_date), "MMM d, yyyy · h:mm a")}
                  </span>
                  {contactName(a.contact_id) && (
                    <span className="text-xs text-manifest-navy-500">
                      with <span className="font-medium">{contactName(a.contact_id)}</span>
                    </span>
                  )}
                </div>
                {a.notes && <p className="mt-1.5 text-sm text-manifest-navy-700">{a.notes}</p>}
                {a.follow_up_date && (
                  <p className="mt-1 text-xs text-manifest-signal-600 font-medium">
                    Follow up by {format(new Date(a.follow_up_date), "MMM d, yyyy")}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  className="text-xs text-manifest-navy-400 hover:text-manifest-navy-700 hover:underline"
                  onClick={() => setEditingId(a.id)}
                >
                  Edit
                </button>
                <DeleteButton action={() => deleteActivity(a.id)} confirmMessage="Delete this activity entry?" />
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function ActivityFields({
  contacts,
  activity,
  defaultDate,
}: {
  contacts: Contact[];
  activity?: Activity;
  defaultDate: string;
}) {
  return (
    <>
      <div>
        <label className="field-label">Activity type</label>
        <select name="activity_type" required className="field-input" defaultValue={activity?.activity_type ?? "Email"}>
          {ACTIVITY_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">Date / time</label>
        <input type="datetime-local" name="activity_date" defaultValue={defaultDate} className="field-input" />
      </div>
      <div>
        <label className="field-label">Contact person (optional)</label>
        <select name="contact_id" className="field-input" defaultValue={activity?.contact_id ?? ""}>
          <option value="">— None —</option>
          {contacts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.first_name} {c.last_name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">Follow-up date (optional)</label>
        <input type="date" name="follow_up_date" defaultValue={activity?.follow_up_date ?? ""} className="field-input" />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label">Notes / details</label>
        <textarea
          name="notes"
          rows={2}
          defaultValue={activity?.notes ?? ""}
          className="field-input"
          placeholder="What happened, what was discussed…"
        />
      </div>
    </>
  );
}
