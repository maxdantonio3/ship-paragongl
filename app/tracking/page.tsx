"use client";

import { useState, useRef } from "react";
import Image from "next/image";

// ── Types ──────────────────────────────────────────────
interface Stop {
  sequence: number;
  type: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  scheduledAt?: string;
  arrivedAt?: string;
  departedAt?: string;
}

interface TrackEvent {
  description: string;
  timestamp: string;
  lat?: number;
  lng?: number;
  code?: string;
  stopNumber?: number;
}

interface LocationPing {
  lat: string;
  lng: string;
  timestamp?: string;
}

interface TrackResult {
  loadNumber: string;
  shipperLoadId?: string;
  status: string;
  lastUpdated?: string;
  lastLocation?: string;
  lat?: string | null;
  lng?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  pings?: any[];
  locationPings?: LocationPing[];
  stops: Stop[];
  events: TrackEvent[];
}

// ── Helpers ──────────────────────────────────────────────
function formatTs(ts?: string | null) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit", timeZoneName: "short",
    });
  } catch { return ts; }
}

function statusColor(status: string) {
  const s = status.toLowerCase();
  if (s.includes("delivered") || s.includes("complete")) return "bg-green-100 text-green-700 border-green-200";
  if (s.includes("transit") || s.includes("pickup"))     return "bg-blue-100 text-blue-700 border-blue-200";
  if (s.includes("delay") || s.includes("issue"))        return "bg-red-100 text-red-700 border-red-200";
  return "bg-orange-100 text-orange-700 border-orange-200";
}

// ── Component ──────────────────────────────────────────────
export default function TrackingPage() {
  const [loadNumber, setLoadNumber]   = useState("");
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [result, setResult]           = useState<TrackResult | null>(null);
  const [showAllEvents, setShowAllEvents] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const val = loadNumber.trim();
    if (!val) { inputRef.current?.focus(); return; }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res  = await fetch("/api/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ loadNumber: val }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unknown error");
      setResult(data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function handleReset() {
    setResult(null);
    setError(null);
    setLoadNumber("");
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  return (
    <div className="min-h-screen flex flex-col">

      {/* ── NAV ── */}
      <nav className="bg-[#0d1b2e] border-b border-white/10 h-14 flex items-center px-6 justify-between z-10 relative">
        <div className="flex items-center">
          <Image
            src="/logo-full.png"
            alt="Paragon Global Logistics"
            width={148}
            height={44}
            className="h-9 w-auto"
            priority
          />
        </div>
        <div className="flex items-center gap-5 text-sm text-white/60">
          <a href="tel:4078532923" className="hover:text-white transition-colors">(407) 853-2923</a>
          <a href="https://os.paragongl.com/login" target="_blank" className="hover:text-white transition-colors">Staff Login</a>
        </div>
      </nav>

      {/* ── MAIN ── */}
      <main className="flex-1 relative overflow-hidden bg-[#0d1b2e]">

        {/* Globe watermark — like C.H. Robinson */}
        <div
          className="absolute inset-0 pointer-events-none select-none z-0"
          aria-hidden
        >
          <div
            className="absolute right-[-8%] top-[-10%] w-[65%] aspect-square opacity-[0.07]"
            style={{
              backgroundImage: "url('/globe.png')",
              backgroundSize:  "contain",
              backgroundRepeat:"no-repeat",
              backgroundPosition:"center",
            }}
          />
        </div>

        {/* ── SEARCH STATE ── */}
        {!result && (
          <div className="relative z-10 flex items-center justify-center min-h-[calc(100vh-56px)] px-4">
            <div className="w-full max-w-md">

              {/* Card */}
              <div className="bg-white rounded-2xl shadow-2xl shadow-black/30 p-8 md:p-10">

                {/* Header */}
                <div className="text-center mb-8">
                  <div className="flex items-center justify-center mb-4">
                    <Image
                      src="/logo-full.png"
                      alt="Paragon Global Logistics"
                      width={180}
                      height={53}
                      className="h-10 w-auto"
                    />
                  </div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">
                    Tracking starts here
                  </h1>
                  <p className="text-gray-500 text-sm leading-relaxed">
                    Enter your Paragon load number to get instant real-time shipment tracking.
                  </p>
                </div>

                {/* Form */}
                <form onSubmit={handleSearch} className="space-y-4">
                  <div>
                    <label htmlFor="loadNumber" className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
                      Load Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="loadNumber"
                      ref={inputRef}
                      type="text"
                      value={loadNumber}
                      onChange={e => setLoadNumber(e.target.value.toUpperCase())}
                      placeholder="e.g. PGL-12345"
                      autoComplete="off"
                      autoFocus
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all text-sm"
                    />
                    <p className="text-xs text-gray-400 mt-1.5">
                      Your load number was provided by your Paragon account rep.
                    </p>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
                      {error}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading || !loadNumber.trim()}
                    className="w-full bg-[#1a4fa0] hover:bg-[#2360bf] disabled:bg-gray-200 disabled:text-gray-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors text-sm flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                        </svg>
                        Searching…
                      </>
                    ) : "Track Shipment"}
                  </button>
                </form>

                {/* Need help */}
                <p className="text-center text-xs text-gray-400 mt-6">
                  Need help?{" "}
                  <a href="mailto:info@paragongl.com" className="text-blue-600 hover:underline">
                    Contact your rep
                  </a>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ── RESULTS STATE ── */}
        {result && (
          <div className="relative z-10 min-h-[calc(100vh-56px)] flex flex-col">

            {/* Results top bar */}
            <div className="bg-[#112240] border-b border-white/10 px-6 py-4 flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-4 flex-wrap">
                <button
                  onClick={handleReset}
                  className="text-white/60 hover:text-white text-sm flex items-center gap-1.5 transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7"/>
                  </svg>
                  New Search
                </button>
                <span className="text-white/20">|</span>
                <span className="text-white/60 text-sm">Load #</span>
                <span className="text-white font-bold text-sm">{result.loadNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="live-dot" />
                <span className="text-white/50 text-xs">Live tracking</span>
              </div>
            </div>

            {/* Results body */}
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-5 min-h-0">

              {/* ── LEFT PANEL ── */}
              <div className="lg:col-span-2 bg-white overflow-y-auto">

                {/* Status hero */}
                <div className="px-6 py-5 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Current Status</p>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${statusColor(result.status)}`}>
                        {result.status}
                      </span>
                    </div>
                    {result.shipperLoadId && (
                      <div className="text-right">
                        <p className="text-xs text-gray-400 mb-1">Shipper Load ID</p>
                        <p className="text-sm font-medium text-gray-700">{result.shipperLoadId}</p>
                      </div>
                    )}
                  </div>

                  {result.lastLocation && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                      </svg>
                      <span className="font-medium">{result.lastLocation}</span>
                    </div>
                  )}
                  {result.lastUpdated && (
                    <p className="text-xs text-gray-400 mt-1.5">
                      Last updated: {formatTs(result.lastUpdated)}
                    </p>
                  )}
                </div>

                {/* Stops — Pickup & Delivery */}
                {result.stops.length > 0 && (
                  <div className="border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 pt-5 pb-3">Stops</p>

                    {result.stops.map((stop, idx) => {
                      const isPickup   = stop.type?.toLowerCase().includes("pickup") || idx === 0;
                      const isDelivery = !isPickup;
                      const label      = isPickup ? "Pickup" : "Delivery";
                      const letter     = String.fromCharCode(65 + idx);
                      const hasArrived = !!stop.arrivedAt;

                      return (
                        <div key={idx} className="px-6 pb-5">
                          {/* Stop header */}
                          <div className="flex items-center gap-2 mb-3">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${isPickup ? "bg-[#1a4fa0]" : "bg-[#e07b2b]"}`}>
                              {letter}
                            </div>
                            <div className="flex items-center gap-2 flex-1 min-w-0">
                              <span className={`text-xs font-bold uppercase tracking-wide ${isPickup ? "text-blue-700" : "text-orange-700"}`}>
                                {label}
                              </span>
                              {hasArrived && (
                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isPickup ? "bg-blue-100 text-blue-700" : "bg-green-100 text-green-700"}`}>
                                  Completed
                                </span>
                              )}
                              {!hasArrived && stop.scheduledAt && (
                                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                                  Scheduled
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Address block */}
                          <div className={`rounded-xl border p-4 ${isPickup ? "bg-blue-50 border-blue-100" : isDelivery && hasArrived ? "bg-green-50 border-green-100" : "bg-orange-50 border-orange-100"}`}>
                            {stop.address && (
                              <p className="text-sm font-bold text-gray-900 mb-0.5">{stop.address}</p>
                            )}
                            <p className="text-sm font-semibold text-gray-700">
                              {[stop.city, stop.state].filter(Boolean).join(", ")}
                              {stop.zip && <span className="text-gray-500"> {stop.zip}</span>}
                            </p>

                            {/* Times */}
                            <div className="mt-3 pt-3 border-t border-black/5 space-y-1.5">
                              {stop.scheduledAt && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">Scheduled</span>
                                  <span className="text-xs font-semibold text-gray-700">{formatTs(stop.scheduledAt)}</span>
                                </div>
                              )}
                              {stop.arrivedAt && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">Arrived</span>
                                  <span className="text-xs font-semibold text-gray-700">{formatTs(stop.arrivedAt)}</span>
                                </div>
                              )}
                              {stop.departedAt && (
                                <div className="flex items-center justify-between">
                                  <span className="text-xs text-gray-500">Departed</span>
                                  <span className="text-xs font-semibold text-gray-700">{formatTs(stop.departedAt)}</span>
                                </div>
                              )}
                              {!stop.arrivedAt && !stop.scheduledAt && (
                                <p className="text-xs text-gray-400 italic">No timing data yet</p>
                              )}
                            </div>
                          </div>

                          {/* Connector line between stops */}
                          {idx < result.stops.length - 1 && (
                            <div className="flex justify-center mt-2 mb-1">
                              <div className="flex flex-col items-center gap-1">
                                <div className="w-px h-3 bg-gray-300" />
                                <svg className="w-3 h-3 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7"/>
                                </svg>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Events timeline */}
                {result.events.length > 0 && (() => {
                  // Sort most recent first
                  const sorted = [...result.events].sort((a, b) => {
                    const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
                    const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
                    return tb - ta;
                  });
                  const PREVIEW = 5;
                  const visible = showAllEvents ? sorted : sorted.slice(0, PREVIEW);
                  const hidden  = sorted.length - PREVIEW;

                  return (
                    <div className="px-6 py-5">
                      {/* Header */}
                      <div className="flex items-center justify-between mb-4">
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                          All Events
                          <span className="ml-1.5 text-gray-300 font-normal normal-case tracking-normal">
                            ({result.events.length})
                          </span>
                        </p>
                        {result.events.length > PREVIEW && (
                          <button
                            onClick={() => setShowAllEvents(v => !v)}
                            className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                          >
                            {showAllEvents ? "Show less ↑" : `See all ${result.events.length} ↓`}
                          </button>
                        )}
                      </div>

                      {/* Event list */}
                      <div className="space-y-3">
                        {visible.map((ev, idx) => (
                          <div key={idx} className="flex gap-3 text-sm">
                            <div className="flex flex-col items-center">
                              <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                                idx === 0 ? "bg-[#1a4fa0] w-2.5 h-2.5 ring-2 ring-blue-200" : "bg-gray-300"
                              }`} />
                              {idx < visible.length - 1 && (
                                <div className="w-px flex-1 bg-gray-100 my-1 min-h-[12px]" />
                              )}
                            </div>
                            <div className="pb-2 flex-1">
                              <div className="flex items-start gap-2 flex-wrap">
                                <p className={`leading-snug flex-1 ${idx === 0 ? "text-gray-900 font-semibold" : "text-gray-600 font-medium"}`}>
                                  {ev.description !== "(no description)" ? ev.description : "Location Update"}
                                </p>
                                {ev.code && (
                                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded flex-shrink-0">
                                    {ev.code}
                                  </span>
                                )}
                              </div>
                              <p className={`text-xs mt-0.5 ${idx === 0 ? "text-blue-600 font-medium" : "text-gray-400"}`}>
                                {formatTs(ev.timestamp)}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>

                      {/* Show more / less button at bottom */}
                      {result.events.length > PREVIEW && (
                        <button
                          onClick={() => setShowAllEvents(v => !v)}
                          className="mt-4 w-full py-2.5 rounded-lg border border-gray-200 text-xs font-semibold text-gray-500 hover:text-gray-700 hover:border-gray-300 hover:bg-gray-50 transition-all"
                        >
                          {showAllEvents
                            ? "↑ Show fewer events"
                            : `↓ Show ${hidden} more event${hidden !== 1 ? "s" : ""}`}
                        </button>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* ── RIGHT PANEL — MAP ── */}
              <div className="lg:col-span-3 bg-gray-100 relative min-h-[400px] lg:min-h-0">
                <TrackingMap result={result} />
              </div>

            </div>
          </div>
        )}
      </main>

      {/* ── FOOTER ── */}
      <footer className="bg-[#0d1b2e] border-t border-white/10 px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-white/35 z-10 relative">
        <span>© {new Date().getFullYear()} Paragon Global Logistics. All rights reserved.</span>
        <div className="flex items-center gap-4">
          <a href="https://paragongl.com" target="_blank" className="hover:text-white/60 transition-colors">paragongl.com</a>
          <span>·</span>
          <a href="mailto:info@paragongl.com" className="hover:text-white/60 transition-colors">info@paragongl.com</a>
          <span>·</span>
          <a href="tel:4078532923" className="hover:text-white/60 transition-colors">(407) 853-2923</a>
        </div>
      </footer>

    </div>
  );
}

function TrackingMap({ result }: { result: TrackResult }) {
  const MAPS_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY;
  const hasKey   = MAPS_KEY && MAPS_KEY !== "placeholder" && MAPS_KEY !== "YOUR_GOOGLE_MAPS_KEY";

  const pings   = result.locationPings ?? [];
  const currentLat = result.lat ? parseFloat(result.lat) : null;
  const currentLng = result.lng ? parseFloat(result.lng) : null;

  // Build an HTML page that uses the Maps JS API — interactive, zoomable, pannable
  const buildMapHtml = () => {
    if (!hasKey) return null;

    const center = currentLat && currentLng
      ? { lat: currentLat, lng: currentLng }
      : result.stops[0]?.city
        ? null  // will geocode
        : { lat: 28.5383, lng: -81.3792 }; // Orlando default

    // Build JS arrays for pings and stops
    const pingArray = pings
      .map(p => `{lat:${parseFloat(p.lat)},lng:${parseFloat(p.lng)}}`)
      .join(",");

    const stopA = result.stops[0];
    const stopB = result.stops[result.stops.length - 1];

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    html,body,#map{height:100%;margin:0;padding:0}
    .legend{position:absolute;bottom:28px;left:8px;background:rgba(255,255,255,.92);
      backdrop-filter:blur(4px);border-radius:8px;padding:10px 14px;font-size:12px;
      font-family:sans-serif;box-shadow:0 2px 8px rgba(0,0,0,.15);line-height:1.8;z-index:10}
    .legend-row{display:flex;align-items:center;gap:8px;color:#374151}
    .dot{width:12px;height:12px;border-radius:50%;flex-shrink:0}
  </style>
</head>
<body>
<div id="map"></div>
<div class="legend">
  <div class="legend-row"><div class="dot" style="background:#dc2626"></div> Current location</div>
  <div class="legend-row"><div class="dot" style="background:#1a4fa0"></div> Ping trail</div>
  ${stopA ? `<div class="legend-row"><div class="dot" style="background:#1d4ed8;font-size:8px;color:#fff;display:flex;align-items:center;justify-content:center">A</div> Pickup</div>` : ""}
  ${stopB && result.stops.length > 1 ? `<div class="legend-row"><div class="dot" style="background:#ea580c;font-size:8px;color:#fff;display:flex;align-items:center;justify-content:center">B</div> Delivery</div>` : ""}
</div>
<script>
let map, geocoder;
const pings = [${pingArray}];
const currentPos = ${currentLat && currentLng ? `{lat:${currentLat},lng:${currentLng}}` : 'null'};
const stopA = ${stopA ? JSON.stringify({address: stopA.address, city: stopA.city, state: stopA.state, zip: stopA.zip}) : 'null'};
const stopB = ${stopB && result.stops.length > 1 ? JSON.stringify({address: stopB.address, city: stopB.city, state: stopB.state, zip: stopB.zip}) : 'null'};

function initMap() {
  const center = currentPos ?? (pings.length ? pings[pings.length-1] : {lat:28.5383,lng:-81.3792});
  const zoom   = pings.length > 5 ? 7 : 10;

  map = new google.maps.Map(document.getElementById("map"), {
    center, zoom,
    mapTypeId: "roadmap",
    mapTypeControl: true,
    zoomControl: true,
    streetViewControl: false,
    fullscreenControl: true,
    styles: [{featureType:"poi",elementType:"labels",stylers:[{visibility:"off"}]}]
  });

  // Draw ping trail polyline
  if (pings.length > 1) {
    new google.maps.Polyline({
      path: pings,
      geodesic: true,
      strokeColor: "#1a4fa0",
      strokeOpacity: 0.85,
      strokeWeight: 3,
      map
    });

    // Small dots for each historical ping
    pings.slice(0, -1).forEach(p => {
      new google.maps.Circle({
        center: p,
        radius: 800,
        strokeColor: "#1a4fa0",
        strokeOpacity: 0.6,
        strokeWeight: 1,
        fillColor: "#1a4fa0",
        fillOpacity: 0.5,
        map
      });
    });
  }

  // Current location — large red pin
  if (currentPos) {
    new google.maps.Marker({
      position: currentPos,
      map,
      title: "Current Location",
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        scale: 10,
        fillColor: "#dc2626",
        fillOpacity: 1,
        strokeColor: "#ffffff",
        strokeWeight: 3,
      },
      zIndex: 999
    });

    // Pulse ring around current location
    new google.maps.Circle({
      center: currentPos,
      radius: 2500,
      strokeColor: "#dc2626",
      strokeOpacity: 0.4,
      strokeWeight: 2,
      fillColor: "#dc2626",
      fillOpacity: 0.1,
      map
    });
  }

  // Stop A marker — blue
  if (stopA) {
    const addr = [stopA.address, stopA.city, stopA.state, stopA.zip].filter(Boolean).join(", ");
    geocoder = new google.maps.Geocoder();
    geocoder.geocode({address: addr}, (results, status) => {
      if (status === "OK" && results[0]) {
        new google.maps.Marker({
          position: results[0].geometry.location,
          map,
          label: {text:"A", color:"#fff", fontWeight:"bold", fontSize:"11px"},
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 13,
            fillColor: "#1d4ed8",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
          title: "Pickup: " + addr,
          zIndex: 100
        });
      }
    });
  }

  // Stop B marker — orange
  if (stopB) {
    const addr = [stopB.address, stopB.city, stopB.state, stopB.zip].filter(Boolean).join(", ");
    if (!geocoder) geocoder = new google.maps.Geocoder();
    geocoder.geocode({address: addr}, (results, status) => {
      if (status === "OK" && results[0]) {
        new google.maps.Marker({
          position: results[0].geometry.location,
          map,
          label: {text:"B", color:"#fff", fontWeight:"bold", fontSize:"11px"},
          icon: {
            path: google.maps.SymbolPath.CIRCLE,
            scale: 13,
            fillColor: "#ea580c",
            fillOpacity: 1,
            strokeColor: "#ffffff",
            strokeWeight: 2,
          },
          title: "Delivery: " + addr,
          zIndex: 100
        });
      }
    });
  }

  // Auto-fit bounds to show full route
  if (pings.length > 1) {
    const bounds = new google.maps.LatLngBounds();
    pings.forEach(p => bounds.extend(p));
    if (currentPos) bounds.extend(currentPos);
    map.fitBounds(bounds, {top:20, right:20, bottom:50, left:20});
  }
}
<\/script>
<script src="https://maps.googleapis.com/maps/api/js?key=${MAPS_KEY}&callback=initMap" async defer></script>
</body>
</html>`;
  };

  const mapHtml = buildMapHtml();

  return (
    <div className="absolute inset-0">
      {/* Map header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Route Map</span>
          {pings.length > 0 && (
            <span className="text-xs text-gray-400">{pings.length} pings</span>
          )}
        </div>
        {result.lastLocation && (
          <div className="flex items-center gap-1.5">
            <svg className="w-4 h-4 text-[#1a4fa0]" viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 8h-3V4H3c-1.1 0-2 .9-2 2v11h2c0 1.66 1.34 3 3 3s3-1.34 3-3h6c0 1.66 1.34 3 3 3s3-1.34 3-3h2v-5l-3-4zm-1.5 1.5l1.96 2.5H17V9.5h1.5zM6 18c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm11 0c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"/>
            </svg>
            <span className="text-xs font-semibold text-gray-700">{result.lastLocation}</span>
          </div>
        )}
      </div>

      {mapHtml ? (
        <iframe
          className="absolute inset-0 w-full h-full pt-10"
          style={{ border: 0 }}
          srcDoc={mapHtml}
          title="Shipment Route Map"
          sandbox="allow-scripts allow-same-origin"
        />
      ) : (
        <div className="absolute inset-0 pt-10 flex flex-col items-center justify-center gap-3 bg-gray-50">
          <svg className="w-10 h-10 text-gray-300" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
          </svg>
          <p className="text-sm font-medium text-gray-500">
            {result.lastLocation ? `Last known: ${result.lastLocation}` : "No location data"}
          </p>
          {!hasKey && <p className="text-xs text-gray-400">Add Google Maps API key to enable map</p>}
        </div>
      )}
    </div>
  );
}
