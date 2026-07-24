"use client";

import { useState } from "react";
import { TMS_BILLING_CYCLES, TMS_PAYMENT_METHODS, type TmsCustomer } from "@/lib/types";
import { searchCrmCompaniesForImport } from "@/actions/tms-customers";
import GoogleMapsImport, { type ImportedPlace } from "@/components/GoogleMapsImport";
import AddressAutocompleteInput, { type AutocompleteAddress } from "@/components/AddressAutocompleteInput";

type CrmSearchResult = {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
};

interface DraftContact {
  key: string;
  name: string;
  phone: string;
  email: string;
}
function newContact(): DraftContact {
  return { key: crypto.randomUUID(), name: "", phone: "", email: "" };
}

export default function TmsCustomerForm({
  action,
  defaultValues,
  submitLabel = "Save customer",
  showImport = true,
  googleMapsApiKey,
  defaultContacts = [],
}: {
  action: (formData: FormData) => void;
  defaultValues?: Partial<TmsCustomer>;
  submitLabel?: string;
  showImport?: boolean;
  googleMapsApiKey: string;
  defaultContacts?: { id: string; name: string; phone: string | null; email: string | null }[];
}) {
  const [name, setName] = useState(defaultValues?.name ?? "");
  const [address, setAddress] = useState(defaultValues?.address ?? "");
  const [city, setCity] = useState(defaultValues?.city ?? "");
  const [state, setState] = useState(defaultValues?.state ?? "");
  const [zip, setZip] = useState(defaultValues?.zip ?? "");
  const [phone, setPhone] = useState(defaultValues?.phone ?? "");
  const [email, setEmail] = useState(defaultValues?.email ?? "");
  const [importedFromId, setImportedFromId] = useState(defaultValues?.imported_from_company_id ?? "");

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<CrmSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const [contacts, setContacts] = useState<DraftContact[]>(
    defaultContacts.length > 0
      ? defaultContacts.map((c) => ({ key: c.id, name: c.name, phone: c.phone ?? "", email: c.email ?? "" }))
      : showImport
      ? [newContact()]
      : []
  );

  async function handleSearch() {
    setSearching(true);
    const found = await searchCrmCompaniesForImport(query);
    setResults(found);
    setSearching(false);
  }

  function applyImport(c: CrmSearchResult) {
    setName(c.name);
    setPhone(c.phone ?? "");
    setEmail(c.email ?? "");
    setAddress(c.address ?? "");
    setCity(c.city ?? "");
    setState(c.state ?? "");
    setZip(c.zip ?? "");
    setImportedFromId(c.id);
    setResults([]);
    setShowSearch(false);
  }

  function handleGoogleImport(place: ImportedPlace) {
    if (place.name) setName(place.name);
    if (place.address) setAddress(place.address);
    if (place.city) setCity(place.city);
    if (place.state) setState(place.state);
    if (place.zip) setZip(place.zip);
    if (place.phone) setPhone(place.phone);
  }

  function handleAddressSelect(addr: AutocompleteAddress) {
    setAddress(addr.address);
    setCity(addr.city);
    setState(addr.state);
    setZip(addr.zip);
  }

  function updateContact(key: string, field: "name" | "phone" | "email", value: string) {
    setContacts((prev) => prev.map((c) => (c.key === key ? { ...c, [field]: value } : c)));
  }
  function removeContact(key: string) {
    setContacts((prev) => prev.filter((c) => c.key !== key));
  }

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="imported_from_company_id" value={importedFromId ?? ""} />

      {showImport && (
        <div className="panel p-4">
          {!showSearch ? (
            <button type="button" onClick={() => setShowSearch(true)} className="btn-secondary text-sm">
              Import from CRM
            </button>
          ) : (
            <div>
              <label className="field-label">Search CRM companies by name</label>
              <div className="flex gap-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
                  className="field-input"
                  placeholder="Start typing a company name…"
                />
                <button type="button" onClick={handleSearch} disabled={searching} className="btn-secondary shrink-0">
                  {searching ? "Searching…" : "Search"}
                </button>
              </div>
              {results.length > 0 && (
                <ul className="mt-2 divide-y divide-manifest-line border border-manifest-line rounded-md">
                  {results.map((c) => (
                    <li key={c.id} className="flex items-center justify-between px-3 py-2">
                      <span className="text-sm text-manifest-navy-700">{c.name}</span>
                      <button type="button" onClick={() => applyImport(c)} className="text-xs text-manifest-signal hover:underline">
                        Use this
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {showImport && <GoogleMapsImport onImport={handleGoogleImport} />}

      <div className="panel p-5">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="name">
              Customer name
            </label>
            <input id="name" name="name" required value={name} onChange={(e) => setName(e.target.value)} className="field-input" placeholder="Acme Distribution Inc." />
          </div>

          <div>
            <label className="field-label" htmlFor="phone">
              Phone
            </label>
            <input id="phone" name="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label" htmlFor="email">
              Email
            </label>
            <input id="email" name="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="field-input" />
          </div>

          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="address">
              Address
            </label>
            <AddressAutocompleteInput apiKey={googleMapsApiKey} name="address" defaultValue={address} onSelect={handleAddressSelect} placeholder="Start typing an address…" />
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
              <input id="state" name="state" value={state} onChange={(e) => setState(e.target.value)} className="field-input" placeholder="FL" />
            </div>
            <div>
              <label className="field-label" htmlFor="zip">
                Zip
              </label>
              <input id="zip" name="zip" value={zip} onChange={(e) => setZip(e.target.value)} className="field-input" placeholder="32801" />
            </div>
          </div>
        </div>
      </div>

      <div className="panel p-5">
        <h2 className="font-display text-lg font-medium text-manifest-navy-800 mb-1">Billing</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label" htmlFor="billing_cycle">
              Billing cycle
            </label>
            <select id="billing_cycle" name="billing_cycle" defaultValue={defaultValues?.billing_cycle ?? ""} className="field-input">
              <option value="">— Select —</option>
              {TMS_BILLING_CYCLES.map((bc) => (
                <option key={bc} value={bc}>
                  {bc}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="payment_method">
              Payment method
            </label>
            <select id="payment_method" name="payment_method" defaultValue={defaultValues?.payment_method ?? ""} className="field-input">
              <option value="">— Select —</option>
              {TMS_PAYMENT_METHODS.map((pm) => (
                <option key={pm} value={pm}>
                  {pm}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="credit_limit">
              Credit limit ($)
            </label>
            <input id="credit_limit" name="credit_limit" type="number" step="0.01" defaultValue={defaultValues?.credit_limit ?? ""} className="field-input" />
          </div>
        </div>
      </div>

      <div className="panel p-5">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display text-lg font-medium text-manifest-navy-800">Accounting contacts</h2>
          <button type="button" onClick={() => setContacts((prev) => [...prev, newContact()])} className="btn-secondary text-xs px-3 py-1.5">
            + Add contact
          </button>
        </div>
        <p className="text-xs text-manifest-navy-400 mb-4">For invoicing once this customer is active.</p>
        <div className="space-y-3">
          {contacts.map((c, i) => (
            <div key={c.key} className="grid grid-cols-1 sm:grid-cols-3 gap-3 border border-manifest-line rounded-md p-4 bg-manifest-navy-50/30">
              <div>
                <label className="field-label">Name</label>
                <input name="accounting_contact_name" value={c.name} onChange={(e) => updateContact(c.key, "name", e.target.value)} className="field-input" />
              </div>
              <div>
                <label className="field-label">Phone</label>
                <input name="accounting_contact_phone" value={c.phone} onChange={(e) => updateContact(c.key, "phone", e.target.value)} className="field-input" />
              </div>
              <div>
                <label className="field-label">Email</label>
                <input name="accounting_contact_email" type="email" value={c.email} onChange={(e) => updateContact(c.key, "email", e.target.value)} className="field-input" />
              </div>
              {contacts.length > 1 && (
                <button type="button" onClick={() => removeContact(c.key)} className="sm:col-span-3 text-xs text-manifest-navy-400 hover:text-red-500 text-left">
                  Remove contact {i + 1}
                </button>
              )}
            </div>
          ))}
          {contacts.length === 0 && <p className="text-sm text-manifest-navy-400">No accounting contacts yet.</p>}
        </div>
      </div>

      <div className="panel p-5">
        <label className="field-label" htmlFor="notes">
          Notes
        </label>
        <textarea id="notes" name="notes" rows={3} defaultValue={defaultValues?.notes ?? ""} className="field-input" />
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}
