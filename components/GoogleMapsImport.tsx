"use client";

import { useState, useTransition } from "react";
import { searchGoogleMapsAction } from "@/actions/places";
import type { GooglePlaceResult } from "@/lib/google-places";

export interface ImportedPlace {
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  phone?: string;
  website?: string;
  google_maps_link?: string;
  google_place_id?: string;
  latitude?: number | null;
  longitude?: number | null;
}

export default function GoogleMapsImport({
  onImport,
}: {
  onImport: (place: ImportedPlace) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GooglePlaceResult[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [importedId, setImportedId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function runSearch() {
    if (!query.trim()) return;
    setError(null);
    setImportedId(null);
    startTransition(async () => {
      const { results, error } = await searchGoogleMapsAction(query);
      setResults(results);
      setError(error);
    });
  }

  function handleSelect(place: GooglePlaceResult) {
    onImport({
      name: place.name,
      address: place.address,
      city: place.city,
      state: place.state,
      zip: place.zip,
      phone: place.phone,
      website: place.website,
      google_maps_link: place.googleMapsLink,
      google_place_id: place.id,
      latitude: place.latitude,
      longitude: place.longitude,
    });
    setImportedId(place.id);
  }

  return (
    <div className="panel p-4 mb-6">
      <h3 className="text-sm font-semibold text-manifest-navy-800 mb-1">
        Import from Google Maps
      </h3>
      <p className="text-xs text-manifest-navy-400 max-w-md mb-3">
        Search for the business, then click a result to fill in the fields below. You can still
        edit anything afterward.
      </p>

      <div className="flex gap-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              runSearch();
            }
          }}
          placeholder="Business name, e.g. Milestone Cabinetry Orlando FL"
          className="field-input"
        />
        <button
          type="button"
          onClick={runSearch}
          disabled={isPending || !query.trim()}
          className="btn-secondary shrink-0"
        >
          {isPending ? "Searching…" : "Search"}
        </button>
      </div>

      {error && (
        <div className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      {results && results.length === 0 && !error && (
        <p className="mt-3 text-xs text-manifest-navy-400">
          No matches. Try a more specific search, or just fill in the fields manually below.
        </p>
      )}

      {results && results.length > 0 && (
        <ul className="mt-3 space-y-2">
          {results.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                onClick={() => handleSelect(place)}
                className="w-full text-left rounded-md border border-manifest-line bg-white hover:bg-manifest-navy-50/60 px-3 py-2 transition"
              >
                <div className="text-sm font-medium text-manifest-navy-800">{place.name}</div>
                <div className="text-xs text-manifest-navy-400">
                  {[place.address, place.city, place.state, place.zip].filter(Boolean).join(", ") ||
                    "No address on file"}
                </div>
                {place.phone && (
                  <div className="text-xs text-manifest-navy-400 font-mono">{place.phone}</div>
                )}
                {importedId === place.id && (
                  <div className="mt-1 text-xs font-semibold text-status-customer">
                    ✓ Imported into the form below
                  </div>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
