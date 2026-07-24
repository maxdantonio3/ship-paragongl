"use client";

import { useState } from "react";
import type { CarrierContact } from "@/lib/types";
import { CARRIER_CONTACT_POSITIONS } from "@/lib/types";
import DeleteButton from "@/components/DeleteButton";

export default function CarrierContactList({
  contacts,
  mainPhone,
  mainEmail,
  createContact,
  updateContact,
  deleteContact,
}: {
  contacts: CarrierContact[];
  mainPhone: string | null;
  mainEmail: string | null;
  createContact: (formData: FormData) => Promise<void>;
  updateContact: (contactId: string, formData: FormData) => Promise<void>;
  deleteContact: (contactId: string) => Promise<void>;
}) {
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // The very first contact added is almost always the person the main
  // phone/email already belong to — pre-fill from those so it's not
  // typed twice, still fully editable.
  const isFirstContact = contacts.length === 0;

  return (
    <div className="panel p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display text-lg font-medium text-manifest-navy-800">
          Contacts{" "}
          <span className="text-manifest-navy-400 font-body text-sm font-normal">({contacts.length})</span>
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
          <ContactFields defaultPhone={isFirstContact ? mainPhone ?? "" : ""} defaultEmail={isFirstContact ? mainEmail ?? "" : ""} />
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
                <button type="button" className="btn-secondary text-sm" onClick={() => setEditingId(null)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : (
            <div key={contact.id} className="flex items-start justify-between gap-4 border border-manifest-line rounded-md p-3.5">
              <div className="min-w-0">
                <div className="font-medium text-manifest-navy-800">
                  {contact.name}
                  <span className="ml-2 text-xs font-normal text-manifest-navy-400">{contact.position}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-manifest-navy-500">
                  {contact.email && <span>{contact.email}</span>}
                  {contact.phone && <span className="font-mono">{contact.phone}</span>}
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  className="text-xs text-manifest-navy-400 hover:text-manifest-navy-700 hover:underline"
                  onClick={() => setEditingId(contact.id)}
                >
                  Edit
                </button>
                <DeleteButton action={() => deleteContact(contact.id)} confirmMessage={`Delete ${contact.name}?`} />
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}

function ContactFields({
  contact,
  defaultPhone = "",
  defaultEmail = "",
}: {
  contact?: CarrierContact;
  defaultPhone?: string;
  defaultEmail?: string;
}) {
  return (
    <>
      <div>
        <label className="field-label">Name</label>
        <input name="name" required defaultValue={contact?.name} className="field-input" />
      </div>
      <div>
        <label className="field-label">Position</label>
        <select name="position" defaultValue={contact?.position ?? "Owner"} className="field-input">
          {CARRIER_CONTACT_POSITIONS.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="field-label">Phone</label>
        <input name="phone" defaultValue={contact?.phone ?? defaultPhone} className="field-input" />
      </div>
      <div>
        <label className="field-label">Email</label>
        <input name="email" type="email" defaultValue={contact?.email ?? defaultEmail} className="field-input" />
      </div>
    </>
  );
}
