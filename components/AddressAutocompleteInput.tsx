"use client";

import { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    google?: typeof google;
    [key: string]: unknown;
  }
}

let loadPromise: Promise<typeof google> | null = null;

function loadGoogleMapsPlaces(apiKey: string): Promise<typeof google> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.google?.maps?.places) return Promise.resolve(window.google);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const callbackName = "__paragonNexusAutocompleteReady";
    window[callbackName] = () => resolve(window.google as typeof google);

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&libraries=places&callback=${callbackName}&loading=async`;
    script.async = true;
    script.onerror = () => reject(new Error("Failed to load Google Maps address autocomplete."));
    document.head.appendChild(script);
  });

  return loadPromise;
}

export interface AutocompleteAddress {
  address: string;
  city: string;
  state: string;
  zip: string;
  latitude: number | null;
  longitude: number | null;
  google_place_id: string | null;
}

/**
 * A plain text input that becomes a live, as-you-type Google address
 * autocomplete once the Maps JS API's places library loads — same API key
 * already used for Territory Map and the Places search elsewhere in the
 * app, just a different Google API surface (the Maps JS "places" library,
 * not the server-side Places API (New) REST search used by the
 * search-and-pick flow on Add Company/Add Location).
 */
export default function AddressAutocompleteInput({
  apiKey,
  name,
  defaultValue,
  onSelect,
  placeholder = "Start typing an address…",
}: {
  apiKey: string;
  name: string;
  defaultValue?: string;
  onSelect: (addr: AutocompleteAddress) => void;
  placeholder?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiKey || !inputRef.current) return;
    let cancelled = false;

    loadGoogleMapsPlaces(apiKey)
      .then((g) => {
        if (cancelled || !inputRef.current) return;
        const autocomplete = new g.maps.places.Autocomplete(inputRef.current, {
          types: ["address"],
          fields: ["address_components", "geometry", "place_id"],
        });

        autocomplete.addListener("place_changed", () => {
          const place = autocomplete.getPlace();
          const components = place.address_components ?? [];
          const find = (type: string) => components.find((c) => c.types.includes(type));

          const streetNumber = find("street_number")?.long_name ?? "";
          const route = find("route")?.long_name ?? "";
          const city =
            find("locality")?.long_name ?? find("sublocality")?.long_name ?? find("postal_town")?.long_name ?? "";
          const state = find("administrative_area_level_1")?.short_name ?? "";
          const zip = find("postal_code")?.long_name ?? "";

          onSelect({
            address: [streetNumber, route].filter(Boolean).join(" "),
            city,
            state,
            zip,
            latitude: place.geometry?.location?.lat() ?? null,
            longitude: place.geometry?.location?.lng() ?? null,
            google_place_id: place.place_id ?? null,
          });
        });
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Couldn't load address autocomplete.");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  return (
    <div>
      <input
        ref={inputRef}
        name={name}
        defaultValue={defaultValue}
        placeholder={placeholder}
        className="field-input"
        autoComplete="off"
      />
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
