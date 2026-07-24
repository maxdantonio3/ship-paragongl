"use client";

import { useEffect, useRef, useState } from "react";
import { useTransition } from "react";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import type { Branch, CompanyStatus } from "@/lib/types";
import { COMPANY_STATUSES } from "@/lib/types";
import { searchGoogleMapsAction, getPlaceDetailsAction } from "@/actions/places";
import type { GooglePlaceResult } from "@/lib/google-places";
import AddProspectModal from "@/components/territory/AddProspectModal";

export interface TerritoryCompany {
  id: string;
  name: string;
  status: CompanyStatus;
  city: string | null;
  state: string | null;
  phone: string | null;
  last_contacted_date: string | null;
  latitude: number;
  longitude: number;
  total_contacts: number;
}

const STATUS_COLORS: Record<CompanyStatus, string> = {
  Cold: "#DC2626", // red
  Warm: "#FACC15", // yellow
  Quoting: "#3B82F6", // blue
  Customer: "#22C55E", // green
};

declare global {
  interface Window {
    google?: typeof google;
    [key: string]: unknown;
  }
}

let loadPromise: Promise<typeof google> | null = null;

function loadGoogleMaps(apiKey: string): Promise<typeof google> {
  if (typeof window === "undefined") return Promise.reject(new Error("No window"));
  if (window.google?.maps) return Promise.resolve(window.google);
  if (loadPromise) return loadPromise;

  loadPromise = new Promise((resolve, reject) => {
    const callbackName = "__paragonNexusGoogleMapsReady";
    window[callbackName] = () => resolve(window.google as typeof google);

    const script = document.createElement("script");
    script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(
      apiKey
    )}&callback=${callbackName}&loading=async`;
    script.async = true;
    script.onerror = () =>
      reject(new Error("Failed to load Google Maps. Check the API key and that Maps JavaScript API is enabled."));
    document.head.appendChild(script);
  });

  return loadPromise;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

function buildInfoContent(c: TerritoryCompany): string {
  const lastContact = c.last_contacted_date
    ? new Date(c.last_contacted_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
    : "Never";
  const cityState = [c.city, c.state].filter(Boolean).join(", ") || "—";
  const color = STATUS_COLORS[c.status];

  return `
    <div style="font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;min-width:220px;padding:2px;">
      <div style="font-weight:700;font-size:14px;color:#152238;margin-bottom:6px;">${escapeHtml(c.name)}</div>
      <div style="display:inline-block;font-size:11px;font-weight:700;color:${color};background:${color}22;border-radius:999px;padding:2px 9px;margin-bottom:8px;">
        ${escapeHtml(c.status)}
      </div>
      <div style="font-size:12px;color:#5B7290;margin-bottom:3px;">${escapeHtml(cityState)}</div>
      <div style="font-size:12px;color:#5B7290;margin-bottom:3px;font-family:'SF Mono',Consolas,monospace;">${
        c.phone ? escapeHtml(c.phone) : "—"
      }</div>
      <div style="font-size:12px;color:#5B7290;margin-bottom:3px;">Last contact: ${lastContact}</div>
      <div style="font-size:12px;color:#5B7290;margin-bottom:10px;">${c.total_contacts} ${
        c.total_contacts === 1 ? "activity" : "activities"
      } logged</div>
      <a href="/companies/${c.id}" style="display:inline-block;background:#E0862E;color:#ffffff;font-size:12px;font-weight:600;padding:6px 12px;border-radius:6px;text-decoration:none;">
        View profile →
      </a>
    </div>
  `;
}

/** Built as a real DOM node (not an HTML string) so we can attach a native
 * click listener to the "+ Add to CRM" button — that button needs to call
 * back into React state (to open the modal), which a plain string InfoWindow
 * has no clean way to do. */
const COPY_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" width="13" height="13"><rect x="9" y="9" width="12" height="12" rx="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>';
const CHECK_ICON_SVG =
  '<svg viewBox="0 0 24 24" fill="none" stroke="#22C55E" stroke-width="2" width="13" height="13"><path d="M20 6L9 17l-5-5" stroke-linecap="round" stroke-linejoin="round"></path></svg>';

/** A text row with a small copy-to-clipboard button — same idea as the
 * dashboard's copyable email cell, built as plain DOM since this lives
 * inside a Google Maps InfoWindow rather than React. */
function createCopyableRow(value: string, monospace: boolean): HTMLElement {
  const row = document.createElement("div");
  row.style.cssText = `display:flex;align-items:center;gap:6px;font-size:12px;color:#5B7290;margin-bottom:3px;${
    monospace ? "font-family:'SF Mono',Consolas,monospace;" : ""
  }`;

  const text = document.createElement("span");
  text.textContent = value;
  text.style.cssText = "overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:180px;";
  row.appendChild(text);

  const btn = document.createElement("button");
  btn.type = "button";
  btn.innerHTML = COPY_ICON_SVG;
  btn.title = "Copy";
  btn.style.cssText =
    "border:none;background:transparent;cursor:pointer;color:#9CA9BB;padding:0;display:flex;align-items:center;flex-shrink:0;";
  btn.addEventListener("click", (e) => {
    e.stopPropagation();
    navigator.clipboard
      .writeText(value)
      .then(() => {
        btn.innerHTML = CHECK_ICON_SVG;
        setTimeout(() => {
          btn.innerHTML = COPY_ICON_SVG;
        }, 1500);
      })
      .catch(() => {
        // clipboard API unavailable — text is still visible/selectable
      });
  });
  row.appendChild(btn);

  return row;
}

function buildProspectInfoNode(place: GooglePlaceResult, onAdd: (p: GooglePlaceResult) => void): HTMLElement {
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;min-width:230px;padding:2px;";

  const nameEl = document.createElement("div");
  nameEl.style.cssText = "font-weight:700;font-size:14px;color:#152238;margin-bottom:4px;";
  nameEl.textContent = place.name;
  wrapper.appendChild(nameEl);

  const badge = document.createElement("div");
  badge.style.cssText =
    "display:inline-block;font-size:11px;font-weight:700;color:#5B7290;background:#5B729022;border-radius:999px;padding:2px 9px;margin-bottom:8px;";
  badge.textContent = "Not in CRM yet";
  wrapper.appendChild(badge);

  const addrEl = document.createElement("div");
  addrEl.style.cssText = "font-size:12px;color:#5B7290;margin-bottom:3px;";
  addrEl.textContent = [place.address, place.city, place.state].filter(Boolean).join(", ") || "No address on file";
  wrapper.appendChild(addrEl);

  if (place.phone) wrapper.appendChild(createCopyableRow(place.phone, true));
  if (place.website) wrapper.appendChild(createCopyableRow(place.website, false));

  const buttonRow = document.createElement("div");
  buttonRow.style.cssText = "display:flex;gap:8px;margin-top:8px;";

  const addBtn = document.createElement("button");
  addBtn.type = "button";
  addBtn.textContent = "+ Add to CRM";
  addBtn.style.cssText =
    "background:#E0862E;color:#ffffff;font-size:12px;font-weight:600;padding:6px 12px;border-radius:6px;border:none;cursor:pointer;";
  addBtn.addEventListener("click", () => onAdd(place));
  buttonRow.appendChild(addBtn);

  if (place.googleMapsLink) {
    const mapsBtn = document.createElement("button");
    mapsBtn.type = "button";
    mapsBtn.textContent = "View on Google Maps";
    mapsBtn.style.cssText =
      "background:#ffffff;color:#152238;font-size:12px;font-weight:600;padding:6px 12px;border-radius:6px;border:1px solid #E3E7ED;cursor:pointer;";
    mapsBtn.addEventListener("click", () => window.open(place.googleMapsLink, "_blank", "noopener,noreferrer"));
    buttonRow.appendChild(mapsBtn);
  }

  wrapper.appendChild(buttonRow);

  return wrapper;
}

type StatusFilter = "all" | CompanyStatus;

export default function TerritoryMap({
  companies,
  apiKey,
  branches,
}: {
  companies: TerritoryCompany[];
  apiKey: string;
  branches: Branch[];
}) {
  const mapDivRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const clustererRef = useRef<MarkerClusterer | null>(null);
  const infoWindowRef = useRef<google.maps.InfoWindow | null>(null);
  const prospectMarkersRef = useRef<google.maps.Marker[]>([]);

  const [mapsReady, setMapsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<GooglePlaceResult[] | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [isSearching, startSearch] = useTransition();
  const [addModalPlace, setAddModalPlace] = useState<GooglePlaceResult | null>(null);

  // Load the Maps JS API once and initialize the map.
  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;

    loadGoogleMaps(apiKey)
      .then((g) => {
        if (cancelled || !mapDivRef.current) return;
        mapRef.current = new g.maps.Map(mapDivRef.current, {
          center: { lat: 39.8283, lng: -98.5795 }, // center of the continental US as a sane default
          zoom: 4,
          mapTypeControl: false,
          streetViewControl: false,
          fullscreenControl: true,
        });
        infoWindowRef.current = new g.maps.InfoWindow();

        // Google's map tiles come with their own built-in business labels
        // ("POIs") baked in — clicking one normally opens Google's own
        // default popup. Intercept that so it shows our own card (with the
        // same "+ Add to CRM" button as search results) instead.
        mapRef.current.addListener("click", (e: google.maps.MapMouseEvent) => {
          const iconEvent = e as google.maps.IconMouseEvent;
          if (!iconEvent.placeId || !infoWindowRef.current || !mapRef.current) return;
          iconEvent.stop();

          const map = mapRef.current;
          const iw = infoWindowRef.current;
          const loadingNode = document.createElement("div");
          loadingNode.style.cssText = "font-family:-apple-system,sans-serif;font-size:13px;color:#5B7290;padding:4px;";
          loadingNode.textContent = "Looking up this place…";
          iw.setContent(loadingNode);
          if (iconEvent.latLng) iw.setPosition(iconEvent.latLng);
          iw.open({ map });

          getPlaceDetailsAction(iconEvent.placeId).then(({ place, error: lookupError }) => {
            if (place) {
              iw.setContent(buildProspectInfoNode(place, setAddModalPlace));
            } else {
              const errNode = document.createElement("div");
              errNode.style.cssText = "font-family:-apple-system,sans-serif;font-size:12px;color:#DC2626;padding:4px;max-width:220px;";
              errNode.textContent = lookupError || "Couldn't look up this place.";
              iw.setContent(errNode);
            }
          });
        });

        setMapsReady(true);
      })
      .catch((e) => {
        if (!cancelled) setLoadError(e instanceof Error ? e.message : "Failed to load Google Maps.");
      });

    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  // Rebuild CRM markers whenever the map is ready, the filter changes, or
  // the underlying company list changes. Never triggers a new Places API
  // call — it only ever re-renders markers from coordinates already passed
  // in as props.
  useEffect(() => {
    if (!mapsReady || !mapRef.current || !window.google) return;
    const g = window.google;
    const map = mapRef.current;

    try {
      markersRef.current.forEach((m) => m.setMap(null));
      clustererRef.current?.clearMarkers();
      markersRef.current = [];

      const filtered = statusFilter === "all" ? companies : companies.filter((c) => c.status === statusFilter);
      const valid = filtered.filter((c) => Number.isFinite(c.latitude) && Number.isFinite(c.longitude));

      const markers = valid.map((c) => {
        const marker = new g.maps.Marker({
          position: { lat: c.latitude, lng: c.longitude },
          icon: {
            path: g.maps.SymbolPath.CIRCLE,
            fillColor: STATUS_COLORS[c.status],
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
            scale: 9,
          },
          title: c.name,
        });

        marker.addListener("click", () => {
          if (!infoWindowRef.current) return;
          infoWindowRef.current.setContent(buildInfoContent(c));
          infoWindowRef.current.open({ map, anchor: marker });
        });

        return marker;
      });

      markersRef.current = markers;
      clustererRef.current = new MarkerClusterer({ map, markers });

      if (markers.length === 1) {
        map.setCenter(markers[0].getPosition()!);
        map.setZoom(12);
      } else if (markers.length > 1) {
        const bounds = new g.maps.LatLngBounds();
        markers.forEach((m) => bounds.extend(m.getPosition()!));
        map.fitBounds(bounds);
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[territory] failed to build markers:", e);
      setLoadError(e instanceof Error ? e.message : "Failed to plot companies on the map.");
    }
  }, [mapsReady, companies, statusFilter]);

  // Render prospect markers (search results not yet in the CRM) whenever
  // the search results change. This is the one place that does make a real
  // Places API call — only when the user explicitly searches, never on
  // page load or filter changes.
  useEffect(() => {
    if (!mapsReady || !mapRef.current || !window.google) return;
    const g = window.google;
    const map = mapRef.current;

    prospectMarkersRef.current.forEach((m) => m.setMap(null));
    prospectMarkersRef.current = [];

    const results = (searchResults ?? []).filter((p) => p.latitude != null && p.longitude != null);
    if (results.length === 0) return;

    const markers = results.map((place) => {
      // Default (un-colored) pin — deliberately different from the colored
      // circles used for existing CRM companies, so it reads as "found, not
      // yet added" at a glance.
      const marker = new g.maps.Marker({
        position: { lat: place.latitude as number, lng: place.longitude as number },
        map,
        title: place.name,
      });

      marker.addListener("click", () => {
        if (!infoWindowRef.current) return;
        infoWindowRef.current.setContent(buildProspectInfoNode(place, setAddModalPlace));
        infoWindowRef.current.open({ map, anchor: marker });
      });

      return marker;
    });

    prospectMarkersRef.current = markers;

    if (markers.length === 1) {
      map.setCenter(markers[0].getPosition()!);
      map.setZoom(14);
    } else if (markers.length > 1) {
      const bounds = new g.maps.LatLngBounds();
      markers.forEach((m) => bounds.extend(m.getPosition()!));
      map.fitBounds(bounds);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapsReady, searchResults]);

  function runSearch() {
    if (!searchQuery.trim()) return;
    setSearchError(null);
    startSearch(async () => {
      const { results, error } = await searchGoogleMapsAction(searchQuery);
      setSearchResults(results);
      setSearchError(error);
    });
  }

  function clearSearch() {
    setSearchQuery("");
    setSearchResults(null);
    setSearchError(null);
  }

  const counts: Record<StatusFilter, number> = {
    all: companies.length,
    Cold: 0,
    Warm: 0,
    Quoting: 0,
    Customer: 0,
  };
  companies.forEach((c) => {
    counts[c.status] += 1;
  });

  const filterOptions: { key: StatusFilter; label: string; color?: string }[] = [
    { key: "all", label: "All" },
    ...COMPANY_STATUSES.map((s) => ({ key: s, label: s, color: STATUS_COLORS[s] })),
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {filterOptions.map((opt) => (
          <button
            key={opt.key}
            type="button"
            onClick={() => setStatusFilter(opt.key)}
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              statusFilter === opt.key
                ? "border-manifest-navy-800 bg-manifest-navy-800 text-white"
                : "border-manifest-line bg-white text-manifest-navy-600 hover:bg-manifest-navy-50"
            }`}
          >
            {opt.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />}
            {opt.label}
            <span className={statusFilter === opt.key ? "text-white/70" : "text-manifest-navy-400"}>
              {counts[opt.key]}
            </span>
          </button>
        ))}
      </div>

      {loadError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {loadError}
        </div>
      )}

      <div className="panel overflow-hidden relative">
        {/* Floating search box, overlaid on the map itself */}
        <div className="absolute top-3 left-3 right-3 z-10 sm:right-auto sm:w-96">
          <div className="bg-white rounded-lg shadow-panel border border-manifest-line p-2 flex gap-2">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  runSearch();
                }
              }}
              placeholder="Search for a business to find & import…"
              className="flex-1 text-sm px-2 py-1.5 outline-none"
            />
            <button
              type="button"
              onClick={runSearch}
              disabled={isSearching || !searchQuery.trim()}
              className="btn-secondary text-xs px-3 py-1.5 shrink-0"
            >
              {isSearching ? "…" : "Search"}
            </button>
            {(searchResults || searchQuery) && (
              <button
                type="button"
                onClick={clearSearch}
                className="text-manifest-navy-400 hover:text-manifest-navy-700 shrink-0 px-1"
                aria-label="Clear search"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {searchError && (
            <div className="mt-2 bg-white rounded-lg shadow-panel border border-red-200 p-3 text-xs text-red-700">
              {searchError}
            </div>
          )}

          {searchResults && searchResults.length > 0 && (
            <div className="mt-2 bg-white rounded-lg shadow-panel border border-manifest-line overflow-hidden max-h-64 overflow-y-auto">
              {searchResults.map((place) => (
                <div
                  key={place.id}
                  className="flex items-center justify-between gap-2 px-3 py-2 border-b border-manifest-line last:border-0"
                >
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-manifest-navy-800 truncate">{place.name}</div>
                    <div className="text-xs text-manifest-navy-400 truncate">
                      {[place.address, place.city, place.state].filter(Boolean).join(", ") || "No address"}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAddModalPlace(place)}
                    className="shrink-0 w-7 h-7 rounded-md border border-manifest-line bg-white text-manifest-signal hover:bg-manifest-signal-50 flex items-center justify-center font-bold"
                    title="Add to CRM"
                  >
                    +
                  </button>
                </div>
              ))}
            </div>
          )}

          {searchResults && searchResults.length === 0 && !searchError && (
            <div className="mt-2 bg-white rounded-lg shadow-panel border border-manifest-line p-3 text-xs text-manifest-navy-400">
              No matches found.
            </div>
          )}
        </div>

        <div ref={mapDivRef} className="w-full" style={{ height: "70vh", minHeight: 480 }} />
        {!mapsReady && !loadError && (
          <div className="absolute inset-0 flex items-center justify-center text-sm text-manifest-navy-400 bg-manifest-bg pointer-events-none">
            Loading map…
          </div>
        )}
      </div>

      {addModalPlace && (
        <AddProspectModal
          place={addModalPlace}
          branches={branches}
          onClose={() => setAddModalPlace(null)}
        />
      )}
    </div>
  );
}
