"use client";

import { useRef, useState } from "react";
import { COMPANY_STATUSES, ACTIVITY_TYPES, type Company, type Branch } from "@/lib/types";
import GoogleMapsImport, { type ImportedPlace } from "@/components/GoogleMapsImport";
import AddressAutocompleteInput, { type AutocompleteAddress } from "@/components/AddressAutocompleteInput";

function nowLocalInputValue() {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

export default function CompanyForm({
  action,
  defaultValues,
  submitLabel = "Save company",
  showImport = true,
  branches = [],
  googleMapsApiKey = "",
}: {
  action: (formData: FormData) => void;
  defaultValues?: Partial<Company>;
  submitLabel?: string;
  showImport?: boolean;
  branches?: Branch[];
  googleMapsApiKey?: string;
}) {
  const nameRef = useRef<HTMLInputElement>(null);
  const phoneRef = useRef<HTMLInputElement>(null);
  const websiteRef = useRef<HTMLInputElement>(null);
  const mapsLinkRef = useRef<HTMLInputElement>(null);
  const [logActivity, setLogActivity] = useState(false);

  const [address, setAddress] = useState(defaultValues?.address ?? "");
  const [city, setCity] = useState(defaultValues?.city ?? "");
  const [state, setState] = useState(defaultValues?.state ?? "");
  const [zip, setZip] = useState(defaultValues?.zip ?? "");
  const [latitude, setLatitude] = useState(defaultValues?.latitude ?? null);
  const [longitude, setLongitude] = useState(defaultValues?.longitude ?? null);
  const [googlePlaceId, setGooglePlaceId] = useState(defaultValues?.google_place_id ?? "");

  function handleImport(place: ImportedPlace) {
    if (nameRef.current && place.name) nameRef.current.value = place.name;
    if (place.address) setAddress(place.address);
    if (place.city) setCity(place.city);
    if (place.state) setState(place.state);
    if (place.zip) setZip(place.zip);
    if (phoneRef.current && place.phone) phoneRef.current.value = place.phone;
    if (websiteRef.current && place.website) websiteRef.current.value = place.website;
    if (mapsLinkRef.current && place.google_maps_link)
      mapsLinkRef.current.value = place.google_maps_link;
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

  return (
    <form action={action} className="space-y-6">
      {showImport && <GoogleMapsImport onImport={handleImport} />}

      <input type="hidden" name="google_place_id" value={googlePlaceId ?? ""} readOnly />
      <input type="hidden" name="latitude" value={latitude ?? ""} readOnly />
      <input type="hidden" name="longitude" value={longitude ?? ""} readOnly />
      {/* Industry isn't shown in the form right now, but preserved untouched if a company already has one set. */}
      <input type="hidden" name="industry" defaultValue={defaultValues?.industry ?? ""} />

      <div className="panel p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="name">
            Company name
          </label>
          <input
            id="name"
            name="name"
            ref={nameRef}
            required
            defaultValue={defaultValues?.name}
            className="field-input"
            placeholder="Acme Freight Co."
          />
        </div>

        <div>
          <label className="field-label" htmlFor="status">
            Status
          </label>
          <select
            id="status"
            name="status"
            defaultValue={defaultValues?.status ?? "Cold"}
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
            <label className="field-label" htmlFor="branch_id">
              Branch
            </label>
            <select
              id="branch_id"
              name="branch_id"
              defaultValue={defaultValues?.branch_id ?? ""}
              className="field-input"
            >
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
          <label className="field-label" htmlFor="phone">
            Phone number
          </label>
          <input
            id="phone"
            name="phone"
            ref={phoneRef}
            defaultValue={defaultValues?.phone ?? ""}
            className="field-input"
            placeholder="(407) 555-0100"
          />
        </div>

        <div>
          <label className="field-label" htmlFor="email">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            defaultValue={defaultValues?.email ?? ""}
            className="field-input"
            placeholder="ops@company.com"
          />
        </div>

        <div>
          <label className="field-label" htmlFor="website">
            Website
          </label>
          <input
            id="website"
            name="website"
            ref={websiteRef}
            defaultValue={defaultValues?.website ?? ""}
            className="field-input"
            placeholder="https://company.com"
          />
        </div>

        <div>
          <label className="field-label" htmlFor="google_maps_link">
            Google Maps link
          </label>
          <input
            id="google_maps_link"
            name="google_maps_link"
            ref={mapsLinkRef}
            defaultValue={defaultValues?.google_maps_link ?? ""}
            className="field-input"
            placeholder="https://maps.google.com/…"
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
            placeholder="123 Main St"
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

        <div className="sm:col-span-2">
          <label className="field-label" htmlFor="notes_summary">
            Notes summary
          </label>
          <textarea
            id="notes_summary"
            name="notes_summary"
            rows={3}
            defaultValue={defaultValues?.notes_summary ?? ""}
            className="field-input"
            placeholder="Short summary shown at a glance on the profile…"
          />
        </div>
      </div>
      </div>

      {showImport && (
        <div className="panel p-5">
          <label className="flex items-center gap-2 text-sm font-medium text-manifest-navy-700 mb-1 cursor-pointer">
            <input
              type="checkbox"
              checked={logActivity}
              onChange={(e) => setLogActivity(e.target.checked)}
              className="rounded border-manifest-line"
            />
            Log an activity now
          </label>
          <p className="text-xs text-manifest-navy-400 mb-4">
            If you're adding them right as you make a call or stop by in person, log it here —
            saves a separate trip back to their profile, and sets their last-contacted and
            follow-up dates immediately instead of leaving them blank.
          </p>

          {logActivity && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="field-label">Activity type</label>
                <select name="activity_type" className="field-input" defaultValue="Call">
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
              <div className="sm:col-span-2">
                <label className="field-label">Notes</label>
                <textarea
                  name="activity_notes"
                  rows={2}
                  className="field-input"
                  placeholder="What happened, what was discussed…"
                />
              </div>
              <div>
                <label className="field-label">Follow-up date (optional)</label>
                <input type="date" name="activity_follow_up_date" className="field-input" />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
