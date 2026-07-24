"use client";

import { useState } from "react";
import type { Contact } from "@/lib/types";
import DeleteButton from "@/components/DeleteButton";

export default function ContactList({
  companyId,
  contacts,
  createContact,
  updateContact,
  deleteContact,
}: {
  companyId: string;
  contacts: Contact[];
  createContact: (formData: FormData) => Promise<void>;
  updateContact: (contactId: string, formData: FormData) => Promise<void>;
  deleteContact: (contactId: string) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-medium text-manifest-navy-800">
          Contacts <span className="text-manifest-navy-400 font-body text-sm font-normal">({contacts.length})</span>
        </h2>
        <button className="btn-secondary text-xs px-3 py-1.5" onClick={() => setAdding((v) => !v)}>
          {adding ? "Cancel" : "+ Add contact"}
        </button>
      </div>

      {adding && (
        <form
          action={async (fd) => {
            await createContact(fd);
            setAdding(false);
          }}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 border border-manifest-line rounded-md p-4 bg-manifest-navy-50/30"
        >
          <ContactFields />
          <div className="sm:col-span-2 flex gap-2">
            <button type="submit" className="btn-primary text-sm">
              Save contact
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3">
        {contacts.length === 0 && !adding && (
          <p className="text-sm text-manifest-navy-400">No contacts yet.</p>
        )}
        {contacts.map((contact) =>
          editingId === contact.id ? (
            <form
              key={contact.id}
              action={async (fd) => {
                await updateContact(contact.id, fd);
                setEditingId(null);
              }}
              className="grid grid-cols-1 sm:grid-cols-2 gap-3 border border-manifest-line rounded-md p-4 bg-manifest-navy-50/30"
            >
              <ContactFields contact={contact} />
              <div className="sm:col-span-2 flex gap-2">
                <button type="submit" className="btn-primary text-sm">
                  Save
                </button>
                <button
                  type="button"
                  className="btn-secondary text-sm"
                  onClick={() => setEditingId(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div
              key={contact.id}
              className="flex items-start justify-between gap-4 border border-manifest-line rounded-md p-3.5"
            >
              <div className="min-w-0">
                <div className="font-medium text-manifest-navy-800">
                  {contact.first_name} {contact.last_name}
                  {contact.job_title && (
                    <span className="ml-2 text-xs font-normal text-manifest-navy-400">
                      {contact.job_title}
                    </span>
                  )}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-manifest-navy-500">
                  {contact.email && <span>{contact.email}</span>}
                  {contact.phone && <span className="font-mono">{contact.phone}</span>}
                  {contact.linkedin_url && (
                    <a
                      href={contact.linkedin_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-manifest-signal hover:underline"
                    >
                      LinkedIn ↗
                    </a>
                  )}
                </div>
                {contact.notes && (
                  <p className="mt-1.5 text-xs text-manifest-navy-400">{contact.notes}</p>
                )}
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  className="text-xs text-manifest-navy-400 hover:text-manifest-navy-700 hover:underline"
                  onClick={() => setEditingId(contact.id)}
                >
                  Edit
                </button>
                <DeleteButton
                  action={() => deleteContact(contact.id)}
                  confirmMessage={`Delete ${contact.first_name}?`}
                />
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function ContactFields({ contact }: { contact?: Contact }) {
  return (
    <>
      <div>
        <label className="field-label">First name</label>
        <input name="first_name" required defaultValue={contact?.first_name} className="field-input" />
      </div>
      <div>
        <label className="field-label">Last name</label>
        <input name="last_name" defaultValue={contact?.last_name ?? ""} className="field-input" />
      </div>
      <div>
        <label className="field-label">Job title</label>
        <input name="job_title" defaultValue={contact?.job_title ?? ""} className="field-input" />
      </div>
      <div>
        <label className="field-label">Email</label>
        <input name="email" type="email" defaultValue={contact?.email ?? ""} className="field-input" />
      </div>
      <div>
        <label className="field-label">Phone</label>
        <input name="phone" defaultValue={contact?.phone ?? ""} className="field-input" />
      </div>
      <div>
        <label className="field-label">LinkedIn / profile link</label>
        <input name="linkedin_url" defaultValue={contact?.linkedin_url ?? ""} className="field-input" />
      </div>
      <div className="sm:col-span-2">
        <label className="field-label">Notes</label>
        <textarea name="notes" rows={2} defaultValue={contact?.notes ?? ""} className="field-input" />
      </div>
    </>
  );
}
