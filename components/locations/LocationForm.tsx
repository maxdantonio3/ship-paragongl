"use client";

import { useState } from "react";
import type { Location, LocationType } from "@/lib/types";
import GoogleMapsImport, { type ImportedPlace } from "@/components/GoogleMapsImport";
import AddressAutocompleteInput, { type AutocompleteAddress } from "@/components/AddressAutocompleteInput";
import LocationTypeButtons from "@/components/locations/LocationTypeButtons";

interface DraftContact {
  key: string;
  name: string;
  phone: string;
  email: string;
}

function newDraftContact(): DraftContact {
  return { key: crypto.randomUUID(), name: "", phone: "", email: "" };
}

export default function LocationForm({
  action,
  defaultValues,
  submitLabel = "Save location",
  showImport = true,
  locationTypes,
  googleMapsApiKey,
}: {
  action: (formData: FormData) => void;
  defaultValues?: Partial<Location>;
  submitLabel?: string;
  showImport?: boolean;
  locationTypes: LocationType[];
  googleMapsApiKey: string;
}) {
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [address, setAddress] = useState(defaultValues?.address ?? "");
  const [city, setCity] = useState(defaultValues?.city ?? "");
  const [state, setState] = useState(defaultValues?.state ?? "");
  const [zip, setZip] = useState(defaultValues?.zip ?? "");
  const [latitude, setLatitude] = useState(defaultValues?.latitude ?? null);
  const [longitude, setLongitude] = useState(defaultValues?.longitude ?? null);
  const [googlePlaceId, setGooglePlaceId] = useState(defaultValues?.google_place_id ?? "");
  const [phone, setPhone] = useState(defaultValues?.contact_phone ?? "");

  const [draftContacts, setDraftContacts] = useState<DraftContact[]>(showImport ? [] : []);

  function handleImport(place: ImportedPlace) {
    if (place.name) setName(place.name);
    if (place.address) setAddress(place.address);
    if (place.city) setCity(place.city);
    if (place.state) setState(place.state);
    if (place.zip) setZip(place.zip);
    if (place.phone) setPhone(place.phone);
    if (place.google_place_id) setGooglePlaceId(place.google_place_id);
    if (place.latitude != null) setLatitude(place.latitude);
    if (place.longitude != null) setLongitude(place.longitude);
  }

  function handleAddressSelect(addr: AutocompleteAddress) {
    setAddress(addr.address);
    setCity(addr.city);
    setState(addr.state);
    setZip(addr.zip);
    setLatitude(addr.latitude);
    setLongitude(addr.longitude);
    setGooglePlaceId(addr.google_place_id ?? "");
  }

  function updateDraft(key: string, field: "name" | "phone" | "email", value: string) {
    setDraftContacts((prev) => prev.map((d) => (d.key === key ? { ...d, [field]: value } : d)));
  }
  function removeDraft(key: string) {
    setDraftContacts((prev) => prev.filter((d) => d.key !== key));
  }

  return (
    <form action={action} className="space-y-6">
      {showImport && <GoogleMapsImport onImport={handleImport} />}

      <input type="hidden" name="google_place_id" value={googlePlaceId ?? ""} readOnly />
      <input type="hidden" name="latitude" value={latitude ?? ""} readOnly />
      <input type="hidden" name="longitude" value={longitude ?? ""} readOnly />

      <div className="panel p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="name">
              Location name
            </label>
            <input
              id="name"
              name="name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="field-input"
              placeholder="Acme Warehouse — Dock 4"
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
              Pick a suggestion to auto-fill city/state/zip below, or type the address and fill those
              in by hand — either works.
            </p>
          </div>

          <div>
            <label className="field-label" htmlFor="city">
              City
            </label>
            <input id="city" name="city" value={city} onChange={(e) => setCity(e.target.value)} className="field-input" />
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
            <label className="field-label" htmlFor="contact_name">
              Contact name
            </label>
            <input
              id="contact_name"
              name="contact_name"
              defaultValue={defaultValues?.contact_name ?? ""}
              className="field-input"
            />
          </div>

          <div>
            <label className="field-label" htmlFor="contact_phone">
              Contact phone
            </label>
            <input
              id="contact_phone"
              name="contact_phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="field-input"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="contact_email">
              Contact email
            </label>
            <input
              id="contact_email"
              name="contact_email"
              type="email"
              defaultValue={defaultValues?.contact_email ?? ""}
              className="field-input"
            />
          </div>
        </div>
      </div>

      <div className="panel p-5">
        <label className="field-label mb-2">Location type</label>
        <LocationTypeButtons locationTypes={locationTypes} defaultSelectedId={defaultValues?.location_type_id} />
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
              + Add contact
            </button>
          </div>
          <p className="text-xs text-manifest-navy-400 mb-4">
            Optional — add as many as you'd like now, or skip this and add them from the location's
            profile after saving.
          </p>

          <div className="space-y-3">
            {draftContacts.map((contact, i) => (
              <div
                key={contact.key}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 border border-manifest-line rounded-md p-4 bg-manifest-navy-50/30"
              >
                <div>
                  <label className="field-label">Name</label>
                  <input
                    name="location_contact_name"
                    value={contact.name}
                    onChange={(e) => updateDraft(contact.key, "name", e.target.value)}
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="field-label">Phone</label>
                  <input
                    name="location_contact_phone"
                    value={contact.phone}
                    onChange={(e) => updateDraft(contact.key, "phone", e.target.value)}
                    className="field-input"
                  />
                </div>
                <div>
                  <label className="field-label">Email</label>
                  <input
                    name="location_contact_email"
                    type="email"
                    value={contact.email}
                    onChange={(e) => updateDraft(contact.key, "email", e.target.value)}
                    className="field-input"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeDraft(contact.key)}
                  className="sm:col-span-3 text-xs text-manifest-navy-400 hover:text-red-500 text-left"
                >
                  Remove contact {i + 1}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="panel p-5">
        <h2 className="font-display text-lg font-medium text-manifest-navy-800 mb-4">Notes</h2>
        <div className="space-y-4">
          <div>
            <label className="field-label" htmlFor="notes">
              General notes
            </label>
            <textarea
              id="notes"
              name="notes"
              rows={2}
              defaultValue={defaultValues?.notes ?? ""}
              className="field-input"
              placeholder="Hours, dock/appointment requirements, anything worth remembering…"
            />
          </div>
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
              placeholder="Intended for BOLs/carrier-facing documents in the future"
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
              placeholder="Internal only"
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
