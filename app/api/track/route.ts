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

    const stops = (load.stops ?? []).map((s: TTStop) => ({
      sequence:    s.stopSequence ?? s.sequence,
      type:        s.stopType     ?? s.type ?? "STOP",
      address:     s.address,
      city:        s.city,
      state:       s.state,
      zip:         s.zip,
      scheduledAt: s.scheduledArrival ?? s.scheduledAt ?? s.appointmentTime,
      arrivedAt:   s.actualArrival    ?? s.arrivedAt,
      departedAt:  s.actualDeparture  ?? s.departedAt,
    }));

    const rawEvents = load.events ?? load.allEvents ?? load.trackingEvents ?? [];
    const events = rawEvents.map((e: TTEvent) => ({
      description: e.eventDescription ?? e.eventType ?? e.description ?? e.event ?? e.status ?? e.statusDescription ?? "(no description)",
      timestamp:   e.eventTime ?? e.eventTimestamp ?? e.timestamp ?? e.time ?? e.createdAt,
      lat:         e.latitude  ?? e.lat  ?? null,
      lng:         e.longitude ?? e.lon  ?? null,
    }));

    return NextResponse.json({
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
  stops?: TTStop[]; events?: TTEvent[]; allEvents?: TTEvent[];
  trackingEvents?: TTEvent[]; pings?: unknown[]; locationHistory?: unknown[];
}
interface TTStop {
  stopSequence?: number; sequence?: number; stopType?: string; type?: string;
  address?: string; city?: string; state?: string; zip?: string;
  scheduledArrival?: string; scheduledAt?: string; appointmentTime?: string;
  actualArrival?: string; arrivedAt?: string;
  actualDeparture?: string; departedAt?: string;
}
interface TTEvent {
  eventDescription?: string; eventType?: string; description?: string;
  event?: string; status?: string; statusDescription?: string;
  eventTime?: string; eventTimestamp?: string; timestamp?: string;
  time?: string; createdAt?: string;
  latitude?: number; lat?: number; longitude?: number; lon?: number;
}
