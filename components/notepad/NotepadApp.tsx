"use client";

import { useRef, useState, useTransition } from "react";
import { format } from "date-fns";
import { createNote, toggleNoteDone, deleteNote, saveFreeform } from "@/actions/notepad";
import type { NotepadEntry } from "@/lib/types";
import clsx from "clsx";

type Tab = "quick" | "freeform";

export default function NotepadApp({
  initialEntries,
  initialFreeform,
}: {
  initialEntries: NotepadEntry[];
  initialFreeform: string;
}) {
  const [tab, setTab] = useState<Tab>("quick");
  const [entries, setEntries] = useState(initialEntries);
  const [newNote, setNewNote] = useState("");
  const [, startTransition] = useTransition();

  const [freeform, setFreeform] = useState(initialFreeform);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const freeformDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleAddNote() {
    const content = newNote.trim();
    if (!content) return;
    const optimistic: NotepadEntry = {
      id: `temp-${Date.now()}`,
      content,
      done: false,
      created_at: new Date().toISOString(),
    };
    setEntries((prev) => [optimistic, ...prev]);
    setNewNote("");
    startTransition(async () => {
      await createNote(content);
    });
  }

  function handleToggle(id: string, done: boolean) {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, done } : e)));
    startTransition(async () => {
      await toggleNoteDone(id, done);
    });
  }

  function handleDelete(id: string) {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    startTransition(async () => {
      await deleteNote(id);
    });
  }

  function handleFreeformChange(value: string) {
    setFreeform(value);
    setSaveState("saving");
    if (freeformDebounce.current) clearTimeout(freeformDebounce.current);
    freeformDebounce.current = setTimeout(() => {
      startTransition(async () => {
        await saveFreeform(value);
        setSaveState("saved");
      });
    }, 800);
  }

  return (
    <div>
      <div className="flex gap-1 mb-4 border-b border-manifest-line">
        <button
          type="button"
          onClick={() => setTab("quick")}
          className={clsx(
            "px-1 pb-2 mr-4 text-sm font-medium border-b-2 -mb-px transition",
            tab === "quick"
              ? "text-manifest-navy-800 border-manifest-signal"
              : "text-manifest-navy-400 border-transparent hover:text-manifest-navy-600"
          )}
        >
          Quick Notes
        </button>
        <button
          type="button"
          onClick={() => setTab("freeform")}
          className={clsx(
            "px-1 pb-2 text-sm font-medium border-b-2 -mb-px transition",
            tab === "freeform"
              ? "text-manifest-navy-800 border-manifest-signal"
              : "text-manifest-navy-400 border-transparent hover:text-manifest-navy-600"
          )}
        >
          Freeform
        </button>
      </div>

      {tab === "quick" && (
        <div>
          <div className="panel p-4 mb-4">
            <textarea
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleAddNote();
                }
              }}
              rows={2}
              placeholder="Add a note…"
              className="w-full text-sm border-none outline-none resize-none bg-transparent"
            />
            <div className="flex justify-end mt-2">
              <button type="button" onClick={handleAddNote} disabled={!newNote.trim()} className="btn-primary text-sm">
                Add note
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {entries.length === 0 && (
              <p className="text-sm text-manifest-navy-400 text-center py-8">
                Nothing here yet — add your first note above.
              </p>
            )}
            {entries.map((entry) => (
              <div
                key={entry.id}
                className={clsx(
                  "flex items-start gap-3 rounded-md border p-3",
                  entry.done
                    ? "bg-status-customer/10 border-status-customer/30"
                    : "bg-white border-manifest-line"
                )}
              >
                <button
                  type="button"
                  onClick={() => handleToggle(entry.id, !entry.done)}
                  aria-label={entry.done ? "Mark as not done" : "Mark as done"}
                  className={clsx(
                    "w-[18px] h-[18px] rounded-full border-[1.5px] flex items-center justify-center shrink-0 mt-0.5 transition",
                    entry.done ? "bg-status-customer border-status-customer" : "border-manifest-navy-200 bg-white"
                  )}
                >
                  {entry.done && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth={3} className="w-2.5 h-2.5">
                      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </button>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-mono text-manifest-navy-400 mb-0.5">
                    {format(new Date(entry.created_at), "MMM d, yyyy · h:mm a")}
                  </div>
                  <div className={clsx("text-sm", entry.done ? "text-status-customer" : "text-manifest-navy-700")}>
                    {entry.content}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDelete(entry.id)}
                  aria-label="Delete note"
                  className="text-manifest-navy-300 hover:text-red-500 shrink-0"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "freeform" && (
        <div>
          <div className="panel p-4">
            <textarea
              value={freeform}
              onChange={(e) => handleFreeformChange(e.target.value)}
              placeholder="Write anything — this sheet is just one continuous page, like a plain text editor. Nothing structured, nothing timestamped, just space to think."
              className="w-full h-[50vh] min-h-[360px] text-sm font-mono text-manifest-navy-700 border-none outline-none resize-none bg-transparent leading-relaxed"
            />
          </div>
          <p className="text-xs text-manifest-navy-400 text-right mt-2">
            {saveState === "saving" && "Saving…"}
            {saveState === "saved" && "Saved automatically"}
            {saveState === "idle" && "Autosaves as you type"}
          </p>
        </div>
      )}
    </div>
  );
}
