"use client";

import { useState } from "react";
import { format } from "date-fns";
import type { Note } from "@/lib/types";
import DeleteButton from "@/components/DeleteButton";

export default function NotesLog({
  notes,
  createNote,
  deleteNote,
}: {
  notes: Note[];
  createNote: (formData: FormData) => Promise<void>;
  deleteNote: (noteId: string) => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const sorted = [...notes].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  return (
    <div className="panel p-5">
      <h2 className="font-display text-lg font-medium text-manifest-navy-800 mb-4">
        Notes <span className="text-manifest-navy-400 font-body text-sm font-normal">({notes.length})</span>
      </h2>

      <form
        action={async (fd) => {
          setPending(true);
          await createNote(fd);
          setPending(false);
          const el = document.getElementById("note-content") as HTMLTextAreaElement | null;
          if (el) el.value = "";
        }}
        className="mb-5"
      >
        <textarea
          id="note-content"
          name="content"
          rows={3}
          required
          placeholder="Add a note…"
          className="field-input"
        />
        <button type="submit" disabled={pending} className="btn-primary text-sm mt-2">
          {pending ? "Saving…" : "Add note"}
        </button>
      </form>

      <div className="space-y-3">
        {sorted.length === 0 && <p className="text-sm text-manifest-navy-400">No notes yet.</p>}
        {sorted.map((n) => (
          <div key={n.id} className="border border-manifest-line rounded-md p-3.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-mono text-manifest-navy-400">
                {format(new Date(n.created_at), "MMM d, yyyy · h:mm a")}
              </span>
              <DeleteButton action={() => deleteNote(n.id)} confirmMessage="Delete this note?" />
            </div>
            <p className="text-sm text-manifest-navy-700 whitespace-pre-wrap">{n.content}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
