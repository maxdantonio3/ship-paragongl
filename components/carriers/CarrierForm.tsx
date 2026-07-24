"use client";

import { useState } from "react";
import {
  CARRIER_STATUSES,
  CARRIER_CONTACT_POSITIONS,
  CARRIER_DOCUMENT_TYPES,
  CARRIER_PAYMENT_METHODS,
  type Carrier,
  type CarrierContactPosition,
  type CarrierDocumentType,
  type EquipmentType,
  type FactoringCompany,
} from "@/lib/types";
import AddressAutocompleteInput, { type AutocompleteAddress } from "@/components/AddressAutocompleteInput";
import EquipmentTypeChips from "@/components/carriers/EquipmentTypeChips";
import { uploadDraftCarrierDocument, deleteDraftCarrierDocument, getCarrierDocumentUrl } from "@/actions/carrier-documents";

interface DraftContact {
  key: string;
  name: string;
  phone: string;
  email: string;
  position: CarrierContactPosition;
  phoneTouched: boolean;
  emailTouched: boolean;
}

function newDraftContact(): DraftContact {
  return {
    key: crypto.randomUUID(),
    name: "",
    phone: "",
    email: "",
    position: "Owner",
    phoneTouched: false,
    emailTouched: false,
  };
}

interface DraftDocument {
  key: string;
  document_type: CarrierDocumentType;
  description: string | null;
  file_name: string;
  file_path: string;
}

export default function CarrierForm({
  action,
  defaultValues,
  submitLabel = "Save carrier",
  showImport = true,
  equipmentTypes,
  defaultEquipmentIds = [],
  googleMapsApiKey,
  factoringCompanies,
}: {
  action: (formData: FormData) => void;
  defaultValues?: Partial<Carrier>;
  submitLabel?: string;
  showImport?: boolean;
  equipmentTypes: EquipmentType[];
  defaultEquipmentIds?: string[];
  googleMapsApiKey: string;
  factoringCompanies: FactoringCompany[];
}) {
  const [address, setAddress] = useState(defaultValues?.address ?? "");
  const [city, setCity] = useState(defaultValues?.city ?? "");
  const [state, setState] = useState(defaultValues?.state ?? "");
  const [zip, setZip] = useState(defaultValues?.zip ?? "");
  const [latitude, setLatitude] = useState(defaultValues?.latitude ?? null);
  const [paymentMethod, setPaymentMethod] = useState(defaultValues?.payment_method ?? "");
  const [factoringCompanyId, setFactoringCompanyId] = useState(defaultValues?.factoring_company_id ?? "");
  const [factoringCompanyName, setFactoringCompanyName] = useState(
    factoringCompanies.find((f) => f.id === defaultValues?.factoring_company_id)?.name ?? ""
  );
  const [longitude, setLongitude] = useState(defaultValues?.longitude ?? null);
  const [googlePlaceId, setGooglePlaceId] = useState(defaultValues?.google_place_id ?? "");

  const [mainPhone, setMainPhone] = useState(defaultValues?.phone ?? "");
  const [mainEmail, setMainEmail] = useState(defaultValues?.email ?? "");

  const [draftContacts, setDraftContacts] = useState<DraftContact[]>(showImport ? [newDraftContact()] : []);

  const [draftId] = useState(() => crypto.randomUUID());
  const [draftDocuments, setDraftDocuments] = useState<DraftDocument[]>([]);
  const [otherSlotKeys, setOtherSlotKeys] = useState<string[]>([crypto.randomUUID()]);
  const [otherDescriptions, setOtherDescriptions] = useState<Record<string, string>>({});
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);

  function handleAddressSelect(addr: AutocompleteAddress) {
    setAddress(addr.address);
    setCity(addr.city);
    setState(addr.state);
    setZip(addr.zip);
    setLatitude(addr.latitude);
    setLongitude(addr.longitude);
    setGooglePlaceId(addr.google_place_id ?? "");
  }

  function updateDraft(key: string, field: "name" | "phone" | "email" | "position", value: string) {
    setDraftContacts((prev) =>
      prev.map((d) => {
        if (d.key !== key) return d;
        if (field === "phone") return { ...d, phone: value, phoneTouched: true };
        if (field === "email") return { ...d, email: value, emailTouched: true };
        return { ...d, [field]: value };
      })
    );
  }
  function removeDraft(key: string) {
    setDraftContacts((prev) => prev.filter((d) => d.key !== key));
  }

  async function handleDocFileChange(
    key: string,
    type: CarrierDocumentType,
    file: File | undefined,
    description?: string
  ) {
    if (!file) return;
    setDocError(null);
    setUploadingKey(key);
    const formData = new FormData();
    formData.set("file", file);
    if (description) formData.set("description", description);
    const result = await uploadDraftCarrierDocument(draftId, formData);
    setUploadingKey(null);
    if (result.ok) {
      setDraftDocuments((prev) => [
        ...prev.filter((d) => d.key !== key),
        { key, document_type: type, description: description ?? null, file_name: result.file_name, file_path: result.file_path },
      ]);
    } else {
      setDocError(result.error);
    }
  }

  async function handleDocRemove(doc: DraftDocument) {
    setDraftDocuments((prev) => prev.filter((d) => d.key !== doc.key));
    await deleteDraftCarrierDocument(doc.file_path);
  }

  async function handleDocView(doc: DraftDocument) {
    const url = await getCarrierDocumentUrl(doc.file_path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="google_place_id" value={googlePlaceId ?? ""} readOnly />
      <input type="hidden" name="latitude" value={latitude ?? ""} readOnly />
      <input type="hidden" name="longitude" value={longitude ?? ""} readOnly />

      <div className="panel p-5">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex-1">
            <label className="field-label" htmlFor="name">
              Carrier name
            </label>
            <input
              id="name"
              name="name"
              required
              defaultValue={defaultValues?.name}
              className="field-input"
              placeholder="Acme Trucking LLC"
            />
          </div>
          <div className="w-44 shrink-0">
            <label className="field-label" htmlFor="status">
              Status
            </label>
            <select id="status" name="status" defaultValue={defaultValues?.status ?? "Active"} className="field-input">
              {CARRIER_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label" htmlFor="mc_number">
              MC number
            </label>
            <input
              id="mc_number"
              name="mc_number"
              defaultValue={defaultValues?.mc_number ?? ""}
              className="field-input"
              placeholder="MC-123456"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="dot_number">
              DOT number
            </label>
            <input
              id="dot_number"
              name="dot_number"
              defaultValue={defaultValues?.dot_number ?? ""}
              className="field-input"
              placeholder="1234567"
            />
          </div>

          <div>
            <label className="field-label" htmlFor="phone">
              Main phone number
            </label>
            <input
              id="phone"
              name="phone"
              value={mainPhone}
              onChange={(e) => setMainPhone(e.target.value)}
              className="field-input"
              placeholder="(407) 555-0100"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="email">
              Main email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={mainEmail}
              onChange={(e) => setMainEmail(e.target.value)}
              className="field-input"
              placeholder="dispatch@carrier.com"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="address">
              Address
            </label>
            <AddressAutocompleteInput
              apiKey={googleMapsApiKey}
              name="address"
              defaultValue={address}
              onSelect={handleAddressSelect}
              placeholder="Start typing an address…"
            />
            <p className="text-xs text-manifest-navy-400 mt-1">
              Pick a suggestion to auto-fill city/state/zip below, or just type the address and fill
              those in by hand — either works.
            </p>
          </div>

          <div>
            <label className="field-label" htmlFor="city">
              City
            </label>
            <input
              id="city"
              name="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="field-input"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="field-label" htmlFor="state">
                State
              </label>
              <input
                id="state"
                name="state"
                value={state}
                onChange={(e) => setState(e.target.value)}
                className="field-input"
                placeholder="FL"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="zip">
                Zip
              </label>
              <input
                id="zip"
                name="zip"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
                className="field-input"
                placeholder="32801"
              />
            </div>
          </div>

          <div>
            <label className="field-label" htmlFor="tax_id">
              Tax ID number (optional)
            </label>
            <input
              id="tax_id"
              name="tax_id"
              defaultValue={defaultValues?.tax_id ?? ""}
              className="field-input"
              placeholder="12-3456789"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="insurance_expiration">
              Insurance expiration
            </label>
            <input
              id="insurance_expiration"
              name="insurance_expiration"
              type="date"
              defaultValue={defaultValues?.insurance_expiration ?? ""}
              className="field-input"
            />
          </div>

          <div>
            <label className="field-label" htmlFor="payment_method">
              Payment method
            </label>
            <select
              id="payment_method"
              name="payment_method"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="field-input"
            >
              <option value="">— Select —</option>
              {CARRIER_PAYMENT_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>
          {paymentMethod === "Factoring" && (
            <div>
              <label className="field-label" htmlFor="factoring_company_name">
                Factoring company
              </label>
              <input
                id="factoring_company_name"
                list="factoring-companies-list"
                value={factoringCompanyName}
                onChange={(e) => {
                  setFactoringCompanyName(e.target.value);
                  const match = factoringCompanies.find((f) => f.name === e.target.value);
                  setFactoringCompanyId(match?.id ?? "");
                }}
                className="field-input"
                placeholder="Start typing or click to see the list"
              />
              <datalist id="factoring-companies-list">
                {factoringCompanies.map((f) => (
                  <option key={f.id} value={f.name} />
                ))}
              </datalist>
              <input type="hidden" name="factoring_company_id" value={factoringCompanyId} />
            </div>
          )}
        </div>
      </div>

      {showImport && (
        <div className="panel p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-display text-lg font-medium text-manifest-navy-800">Contacts</h2>
            <button
              type="button"
              onClick={() => setDraftContacts((prev) => [...prev, newDraftContact()])}
              className="btn-secondary text-xs px-3 py-1.5"
            >
              + Add another contact
            </button>
          </div>
          <p className="text-xs text-manifest-navy-400 mb-4">
            The first contact's phone/email auto-fill from the Main phone/email above until you type
            your own — additional contacts start blank.
          </p>

          <div className="space-y-3">
            {draftContacts.map((contact, i) => (
              <div
                key={contact.key}
                className="grid grid-cols-1 sm:grid-cols-2 gap-3 border border-manifest-line rounded-md p-4 bg-manifest-navy-50/30 relative"
              >
                <div>
                  <label className="field-label">Name</label>
                  <input
                    name="contact_name"
                    value={contact.name}
                    onChange={(e) => updateDraft(contact.key, "name", e.target.value)}
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="field-label">Position</label>
                  <select
                    name="contact_position"
                    value={contact.position}
                    onChange={(e) => updateDraft(contact.key, "position", e.target.value)}
                    className="field-input"
                  >
                    {CARRIER_CONTACT_POSITIONS.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="field-label">Phone</label>
                  <input
                    name="contact_phone"
                    value={i === 0 && !contact.phoneTouched ? mainPhone : contact.phone}
                    onChange={(e) => updateDraft(contact.key, "phone", e.target.value)}
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="field-label">Email</label>
                  <input
                    name="contact_email"
                    type="email"
                    value={i === 0 && !contact.emailTouched ? mainEmail : contact.email}
                    onChange={(e) => updateDraft(contact.key, "email", e.target.value)}
                    className="field-input"
                  />
                </div>
                {draftContacts.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeDraft(contact.key)}
                    className="sm:col-span-2 text-xs text-manifest-navy-400 hover:text-red-500 text-left"
                  >
                    Remove contact {i + 1}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel p-5">
        <label className="field-label mb-2">Equipment types</label>
        <EquipmentTypeChips equipmentTypes={equipmentTypes} defaultSelectedIds={defaultEquipmentIds} />
      </div>

      {showImport && (
        <div className="panel p-5">
          <h2 className="font-display text-lg font-medium text-manifest-navy-800 mb-1">Document Center</h2>
          <p className="text-xs text-manifest-navy-400 mb-4">
            Optional — upload now, or skip and add these from the carrier's profile after saving.
          </p>

          {docError && (
            <div className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
              {docError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {CARRIER_DOCUMENT_TYPES.filter((t) => t !== "Other").map((type) => {
              const doc = draftDocuments.find((d) => d.key === type);
              const uploading = uploadingKey === type;
              return (
                <div key={type} className="border border-manifest-line rounded-md p-3.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-manifest-navy-800">{type}</span>
                    {doc && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-status-customer bg-status-customer/10 border border-status-customer/30 rounded-full px-2 py-0.5">
                        ✓ Uploaded
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-manifest-navy-400 mt-1">
                    {doc ? doc.file_name : "Not uploaded yet"}
                  </div>
                  <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                    <input
                      type="file"
                      id={`draft-doc-${type}`}
                      className="hidden"
                      onChange={(e) => handleDocFileChange(type, type, e.target.files?.[0])}
                    />
                    <label htmlFor={`draft-doc-${type}`} className="btn-secondary text-xs px-2.5 py-1.5 cursor-pointer">
                      {uploading ? "Uploading…" : doc ? "Replace" : "Upload"}
                    </label>
                    {doc && (
                      <>
                        <button type="button" onClick={() => handleDocView(doc)} className="text-xs text-manifest-signal hover:underline">
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDocRemove(doc)}
                          className="text-xs text-manifest-navy-400 hover:text-red-500"
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}

            {otherSlotKeys.map((key, i) => {
              const doc = draftDocuments.find((d) => d.key === key);
              const uploading = uploadingKey === key;
              return (
                <div key={key} className="border border-manifest-line rounded-md p-3.5">
                  {doc ? (
                    <>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-manifest-navy-800">
                          {doc.description || "Other document"}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-status-customer bg-status-customer/10 border border-status-customer/30 rounded-full px-2 py-0.5">
                          ✓ Uploaded
                        </span>
                      </div>
                      <div className="text-xs text-manifest-navy-400 mt-1">{doc.file_name}</div>
                      <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                        <button type="button" onClick={() => handleDocView(doc)} className="text-xs text-manifest-signal hover:underline">
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDocRemove(doc)}
                          className="text-xs text-manifest-navy-400 hover:text-red-500"
                        >
                          Remove
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <span className="text-sm font-medium text-manifest-navy-800">
                        {i === 0 ? "Other document" : `Other document ${i + 1}`}
                      </span>
                      <input
                        type="text"
                        value={otherDescriptions[key] ?? ""}
                        onChange={(e) => setOtherDescriptions((prev) => ({ ...prev, [key]: e.target.value }))}
                        placeholder="e.g. Signed lease agreement"
                        className="field-input text-xs mt-2"
                      />
                      <input
                        type="file"
                        id={`draft-doc-${key}`}
                        className="hidden"
                        onChange={(e) => handleDocFileChange(key, "Other", e.target.files?.[0], otherDescriptions[key])}
                      />
                      <label htmlFor={`draft-doc-${key}`} className="btn-secondary text-xs px-2.5 py-1.5 cursor-pointer inline-block mt-2.5">
                        {uploading ? "Uploading…" : "Upload"}
                      </label>
                      {otherSlotKeys.length > 1 && (
                        <button
                          type="button"
                          onClick={() => {
                            setOtherSlotKeys((prev) => prev.filter((k) => k !== key));
                            setOtherDescriptions((prev) => {
                              const next = { ...prev };
                              delete next[key];
                              return next;
                            });
                          }}
                          className="text-xs text-manifest-navy-400 hover:text-red-500 ml-3"
                        >
                          Remove
                        </button>
                      )}
                    </>
                  )}
                </div>
              );
            })}

            <div className="border border-dashed border-manifest-line rounded-md p-3.5 flex items-center justify-center">
              <button
                type="button"
                onClick={() => setOtherSlotKeys((prev) => [...prev, crypto.randomUUID()])}
                className="text-sm text-manifest-signal hover:underline"
              >
                + Add another document
              </button>
            </div>
          </div>

          {draftDocuments.map((d) => (
            <span key={d.key}>
              <input type="hidden" name="draft_document_type" value={d.document_type} />
              <input type="hidden" name="draft_document_description" value={d.description ?? ""} />
              <input type="hidden" name="draft_document_file_name" value={d.file_name} />
              <input type="hidden" name="draft_document_file_path" value={d.file_path} />
            </span>
          ))}
        </div>
      )}

      <div className="panel p-5">
        <h2 className="font-display text-lg font-medium text-manifest-navy-800 mb-4">Notes</h2>
        <div className="space-y-4">
          <div>
            <label className="field-label" htmlFor="public_notes">
              Public notes
            </label>
            <textarea
              id="public_notes"
              name="public_notes"
              rows={2}
              defaultValue={defaultValues?.public_notes ?? ""}
              className="field-input"
              placeholder="Visible on carrier-facing documents in the future (rate confirmations, etc.)"
            />
          </div>
          <div>
            <label className="field-label" htmlFor="private_notes">
              Private notes
            </label>
            <textarea
              id="private_notes"
              name="private_notes"
              rows={2}
              defaultValue={defaultValues?.private_notes ?? ""}
              className="field-input"
              placeholder="Internal only — never shown to the carrier"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
