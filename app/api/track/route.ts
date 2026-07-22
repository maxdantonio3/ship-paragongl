// ship.paragongl.com — tracking API — 2026-07-22-v15
import { NextRequest, NextResponse } from "next/server";

const PARTNER_ID = process.env.TT_PARTNER_ID!;
const ACCOUNT_ID = process.env.TT_ACCOUNT_ID!;

const BY_LOAD_NUMBER = "https://loadtracking.truckertools.com/loadtrackservice/getLoadTrackDetailsServiceByLoadNumber";

export async function POST(req: NextRequest) {
  try {
    const { loadNumber } = await req.json();

    if (!loadNumber || typeof loadNumber !== "string") {
      return NextResponse.json({ error: "Load number is required." }, { status: 400 });
    }

    const id = loadNumber.trim();

    const body = {
      partnerId:        Number(PARTNER_ID),   // int64 per docs
      accountId:        ACCOUNT_ID,
      loadNumbers:      [id],
      sendNewData:      "no",                 // "no" = return ALL updates
      includeLocations: true,
      includeEvents:    true,
      includeDocuments: true,
      includeComments:  true,
    };

    console.log("[track] POST", BY_LOAD_NUMBER, JSON.stringify(body));

    const res = await fetch(BY_LOAD_NUMBER, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await res.text();
    console.log("[track] status:", res.status, "body:", text.slice(0, 600));

    let data: TTResponse;
    try {
      data = JSON.parse(text);
    } catch {
      return NextResponse.json(
        { error: `Invalid response from tracking service: ${text.slice(0, 300)}` },
        { status: 502 }
      );
    }

    if (!data.status) {
      return NextResponse.json(
        { error: data.message ?? "Tracking service returned an error." },
        { status: 502 }
      );
    }

    const load = data.details?.[0];
    if (!load) {
      return NextResponse.json(
        { error: `No shipment found for load number "${id}".` },
        { status: 404 }
      );
    }


    const loc = load.latestLocation;
    const lastLocation = loc ? [loc.city, loc.state].filter(Boolean).join(", ") : null;
    const lastUpdated  = loc?.timestamp ?? null;

    const status =
      load.latestStatus?.status ??
      load.latestStatus?.description ??
      load.status ??
      "In Transit";

    const rawStops = load.stops ?? load.stopDetails ?? load.stopList ?? [];
    const stops = rawStops.map((s: TTStop, idx: number) => ({
      sequence:    s.orderNumber ?? s.stopSequence ?? s.sequence ?? s.stopNumber ?? idx,
      type:        s.stopType ?? s.type ?? (idx === 0 ? "PICKUP" : "DELIVERY"),
      address:     s.address ?? s.streetAddress ?? s.location,
      city:        s.city    ?? s.stopCity,
      state:       s.state   ?? s.stopState,
      zip:         s.zipcode ?? s.zip ?? s.stopZip ?? s.postalCode,
      scheduledAt: s.datetime ?? s.scheduledArrival ?? s.scheduledAt
                ?? s.appointmentTime ?? s.scheduledTime ?? s.apptTime,
      arrivedAt:   s.actualArrival  ?? s.arrivedAt  ?? s.enteredAt,
      departedAt:  s.datetimeExit   ?? s.actualDeparture ?? s.departedAt ?? s.leftAt,
    }));

    // Extract location pings from events — must declare rawEvents first
    const rawEvents = load.events ?? load.allEvents ?? load.trackingEvents ?? load.eventList ?? [];

    // TruckerTools stores pings in multiple places — try them all
    // 1. Dedicated locations/pings array on the load
    const rawPings: TTLocationPing[] =
      load.locations ?? load.pings ?? load.locationHistory ?? load.locationPings ?? [];

    // 2. Extract from events that carry a location
    const eventPings: TTLocationPing[] = rawEvents
      .filter((e: TTEvent) => e.status?.location?.lat && e.status?.location?.lon)
      .map((e: TTEvent) => ({
        lat:       e.status!.location!.lat!,
        lon:       e.status!.location!.lon!,
        timestamp: e.status?.timestampSec ?? e.status?.timestamp,
      }));

    // Merge and deduplicate by timestamp, sort chronologically
    const allPings: TTLocationPing[] = [...rawPings, ...eventPings];
    const seen = new Set<string>();
    const locationPings = allPings
      .filter(p => {
        if (!p.lat || !p.lon) return false;
        const key = `${p.lat},${p.lon}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => {
        const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return ta - tb;
      })
      .map(p => ({ lat: String(p.lat), lng: String(p.lon ?? p.lng), timestamp: p.timestamp }));

    const events = rawEvents.map((e: TTEvent) => ({
      // status.name is the human-readable event description per TT docs
      description: e.status?.name ?? e.status?.code
                ?? e.eventType ?? e.eventDescription ?? e.eventName
                ?? e.description ?? e.event ?? e.name
                ?? e.action ?? "(no description)",
      timestamp:   e.status?.timestamp ?? e.status?.timestampSec
                ?? e.eventTime ?? e.eventTimestamp ?? e.eventDate
                ?? e.timestamp ?? e.time ?? e.createdAt ?? e.dateTime,
      lat:         e.status?.location?.lat ?? e.latitude ?? e.lat ?? null,
      lng:         e.status?.location?.lon ?? e.longitude ?? e.lon ?? null,
      stopNumber:  e.status?.stopOrderNumber ?? null,
      code:        e.status?.code ?? null,
    }));

    // Validate we have enough real data to show a results page
    // A load with no status, no location, no stops and no events
    // is not trackable — treat it as not found
    const hasRealData = status !== "Unknown"
      || lastLocation
      || stops.length > 0
      || events.length > 0
      || locationPings.length > 0;

    if (!hasRealData) {
      return NextResponse.json(
        { error: `No tracking data found for load number "${id}". The load may not be set up for tracking yet, or the tracking link has expired.` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      _raw_keys: Object.keys(load),
      _raw_stops: (load as Record<string,unknown>).stops,
      _raw_stop_details: (load as Record<string,unknown>).stopDetails,
      _raw_stop_list: (load as Record<string,unknown>).stopList,
      _raw_locations: (load as Record<string,unknown>).locations,
      loadNumber:    load.loadNumber          ?? id,
      shipperLoadId: load.shipperLoadNumber   ?? load.shipperLoadId ?? null,
      status,
      lastUpdated,
      lastLocation,
      lat:    loc?.lat ?? null,
      lng:    loc?.lon ?? null,
      driver: loc?.driver ?? null,
      stops,
      events,
      pings:  load.pings ?? load.locationHistory ?? [],
      locationPings,
    });

  } catch (err) {
    console.error("[track] error:", err);
    return NextResponse.json(
      { error: `Server error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}

interface TTResponse {
  status:     boolean;
  message?:   string;
  timestamp?: string;
  details?:   TTLoad[];
}
interface TTLocationPing {
  lat?: string | number;
  lon?: string | number;
  lng?: string | number;
  timestamp?: string;
  timestampSec?: string;
  accuracy?: number;
}

interface TTLoad {
  loadNumber?: string; shipperLoadNumber?: string; shipperLoadId?: string;
  status?: string;
  latestStatus?: { status?: string; description?: string; timestamp?: string };
  latestLocation?: {
    lat?: string; lon?: string; accuracy?: number;
    timestamp?: string; timestampSec?: string; timestampUTC?: string;
    city?: string; state?: string; country?: string;
    driver?: { name?: string | null; phoneNumber?: string };
  };
  stops?: TTStop[]; stopDetails?: TTStop[]; stopList?: TTStop[];
  events?: TTEvent[]; allEvents?: TTEvent[]; trackingEvents?: TTEvent[]; eventList?: TTEvent[];
  locations?: TTLocationPing[]; pings?: TTLocationPing[];
  locationHistory?: TTLocationPing[]; locationPings?: TTLocationPing[];
}
interface TTStop {
  orderNumber?: number; stopSequence?: number; sequence?: number; stopNumber?: number;
  stopType?: string; type?: string;
  locationName?: string; locationId?: string;
  address?: string; streetAddress?: string; location?: string;
  city?: string; stopCity?: string;
  state?: string; stopState?: string;
  zipcode?: string; zip?: string; stopZip?: string; postalCode?: string;
  lat?: number; lon?: number;
  datetime?: string; datetimeExit?: string; stopGMTDiff?: string;
  scheduledArrival?: string; scheduledAt?: string; appointmentTime?: string;
  scheduledTime?: string; apptTime?: string;
  actualArrival?: string; arrivedAt?: string; enteredAt?: string;
  actualDeparture?: string; departedAt?: string; leftAt?: string;
}
interface TTEventStatus {
  id?: number;
  name?: string;
  code?: string;
  timestamp?: string;
  timestampSec?: string;
  timestampUTC?: string;
  stopOrderNumber?: number;
  stopExternalId?: string;
  location?: { lat?: string; lon?: string; accuracy?: number };
  extras?: { n?: string; v?: string };
}
interface TTEvent {
  status?: TTEventStatus;
  eventType?: string; eventName?: string; eventDescription?: string;
  description?: string; event?: string; name?: string; action?: string;
  eventTime?: string; eventTimestamp?: string; eventDate?: string;
  timestamp?: string; time?: string; createdAt?: string; dateTime?: string;
  latitude?: number; lat?: number; longitude?: number; lon?: number;
}
