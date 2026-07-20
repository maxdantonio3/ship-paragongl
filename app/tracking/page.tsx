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

                {/* Pickup & Delivery cards */}
                {result.stops.length > 0 ? (
                  <div className="px-6 py-5 border-b border-gray-100 space-y-3">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Shipment Route</p>
                    {result.stops.map((stop, idx) => {
                      const isPickup = stop.type?.toLowerCase().includes("pickup") || idx === 0;
                      return (
                        <div key={idx} className={`rounded-lg border p-4 ${isPickup ? "border-blue-100 bg-blue-50" : "border-orange-100 bg-orange-50"}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white ${isPickup ? "bg-[#1a4fa0]" : "bg-[#e07b2b]"}`}>
                              {String.fromCharCode(65 + idx)}
                            </div>
                            <span className={`text-xs font-bold uppercase tracking-wide ${isPickup ? "text-blue-700" : "text-orange-700"}`}>
                              {isPickup ? "Pickup" : "Delivery"}
                            </span>
                          </div>
                          {stop.address && (
                            <p className="text-sm font-semibold text-gray-800">{stop.address}</p>
                          )}
                          <p className="text-sm font-medium text-gray-700">
                            {[stop.city, stop.state, stop.zip].filter(Boolean).join(", ")}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
                            {stop.scheduledAt && (
                              <p className="text-xs text-gray-500">
                                <span className="font-medium">Scheduled:</span> {formatTs(stop.scheduledAt)}
                              </p>
                            )}
                            {stop.arrivedAt && (
                              <p className="text-xs text-gray-500">
                                <span className="font-medium">Arrived:</span> {formatTs(stop.arrivedAt)}
                              </p>
                            )}
                            {stop.departedAt && (
                              <p className="text-xs text-gray-500">
                                <span className="font-medium">Departed:</span> {formatTs(stop.departedAt)}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  /* No stops yet — show location pill */
                  result.lastLocation && (
                    <div className="px-6 py-4 border-b border-gray-100">
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Location</p>
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <svg className="w-4 h-4 text-blue-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
                        </svg>
                        <span className="font-medium">{result.lastLocation}</span>
                      </div>
                    </div>
                  )
                )}

                {/* Events timeline */}
                {result.events.length > 0 && (
                  <div className="px-6 py-5">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-4">All Events</p>
                    <div className="space-y-3">
                      {result.events.map((ev, idx) => (
                        <div key={idx} className="flex gap-3 text-sm">
                          <div className="flex flex-col items-center">
                            <div className="w-2 h-2 rounded-full bg-[#1a4fa0] mt-1.5 flex-shrink-0" />
                            {idx < result.events.length - 1 && (
                              <div className="w-px flex-1 bg-gray-200 my-1 min-h-[12px]" />
                            )}
                          </div>
                          <div className="pb-2 flex-1">
                            <div className="flex items-start gap-2 flex-wrap">
                              <p className="text-gray-700 font-medium leading-snug flex-1">
                                {ev.description !== "(no description)" ? ev.description : "Location Update"}
                              </p>
                              {ev.code && (
                                <span className="text-xs font-semibold text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded flex-shrink-0">
                                  {ev.code}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">{formatTs(ev.timestamp)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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

  // Build query — prefer last known lat/lng, fall back to location name, fall back to stops
  const stops = result.stops;
  const hasStops = stops.length > 0;
  const hasLatLng = result.lat && result.lng;

  let mapSrc = "";

  if (hasKey) {
    if (hasLatLng) {
      // Show current location on map
      mapSrc = `https://www.google.com/maps/embed/v1/place?key=${MAPS_KEY}&q=${result.lat},${result.lng}&zoom=10`;
    } else if (hasStops) {
      const origin      = [stops[0].city, stops[0].state].filter(Boolean).join(", ");
      const destination = [stops[stops.length-1].city, stops[stops.length-1].state].filter(Boolean).join(", ");
      const waypoints   = stops.slice(1,-1).map(s => [s.city,s.state].filter(Boolean).join(", ")).filter(Boolean).join("|");
      mapSrc = `https://www.google.com/maps/embed/v1/directions?key=${MAPS_KEY}&origin=${encodeURIComponent(origin)}&destination=${encodeURIComponent(destination)}${waypoints ? `&waypoints=${encodeURIComponent(waypoints)}` : ""}&mode=driving`;
    } else if (result.lastLocation) {
      mapSrc = `https://www.google.com/maps/embed/v1/place?key=${MAPS_KEY}&q=${encodeURIComponent(result.lastLocation)}&zoom=10`;
    }
  }

  return (
    <div className="absolute inset-0">
      {/* Map header */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-white/95 backdrop-blur-sm border-b border-gray-200 px-4 py-2.5 flex items-center justify-between">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Route Map</span>
        {result.lastLocation && (
          <span className="text-xs text-gray-500">
            Last known: <span className="font-medium text-gray-700">{result.lastLocation}</span>
          </span>
        )}
      </div>

      {mapSrc ? (
        <iframe
          className="absolute inset-0 w-full h-full pt-10"
          style={{ border: 0 }}
          loading="lazy"
          allowFullScreen
          referrerPolicy="no-referrer-when-downgrade"
          src={mapSrc}
          title="Shipment Route Map"
        />
      ) : (
        <div className="absolute inset-0 pt-10 flex flex-col items-center justify-center gap-3 text-gray-400 bg-gray-50">
          <svg className="w-10 h-10 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
          </svg>
          <p className="text-sm font-medium">
            {result.lastLocation ? `Last known: ${result.lastLocation}` : "No location data available"}
          </p>
          {!hasKey && (
            <p className="text-xs text-gray-400 text-center max-w-xs">
              Add a Google Maps API key in Vercel environment variables to enable the route map.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
