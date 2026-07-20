import { NextRequest, NextResponse } from "next/server";

const PARTNER_ID = process.env.TT_PARTNER_ID!;
const ACCOUNT_ID = process.env.TT_ACCOUNT_ID!;
const TT_BASE = "https://developer.truckertools.com/apis/getloadtrackupdates";

export async function POST(req: NextRequest) {
  try {
    const { loadNumber } = await req.json();

    if (!loadNumber || typeof loadNumber !== "string") {
      return NextResponse.json({ error: "Load number is required." }, { status: 400 });
    }

    const id = loadNumber.trim();

    // Try external ID endpoint first (matches TruckerTools Load# field)
    const payload = {
      partnerId: PARTNER_ID,
      accountId: ACCOUNT_ID,
      externalIds: [id],
    };

    console.log("[track] Request payload:", JSON.stringify(payload));

    const ttRes = await fetch(`${TT_BASE}/externalid`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const rawText = await ttRes.text();
    console.log("[track] TruckerTools status:", ttRes.status);
    console.log("[track] TruckerTools response:", rawText);

    // Surface the real error to the client so we can debug
    if (!ttRes.ok) {
      return NextResponse.json(
        { error: `Tracking API error (${ttRes.status}): ${rawText}` },
        { status: 502 }
      );
    }

    let data: unknown;
    try {
      data = JSON.parse(rawText);
    } catch {
      return NextResponse.json(
        { error: `Unexpected response: ${rawText}` },
        { status: 502 }
      );
    }

    const loads = Array.isArray(data) ? data : (data as Record<string, unknown>)?.loads ?? [];
    const load = (loads as TruckerLoad[])[0] ?? null;

    if (!load) {
      return NextResponse.json(
        { error: `No shipment found for load number "${id}". Raw response: ${rawText}` },
        { status: 404 }
      );
    }

    const result = {
      loadNumber:    load.loadNumber   ?? load.externalId ?? id,
      shipperLoadId: load.shipperLoadId ?? null,
      status:        load.latestStatus  ?? load.status ?? "Unknown",
      lastUpdated:   load.lastUpdated   ?? null,
      lastLocation:  load.lastLocation  ?? null,
      stops: (load.stops ?? []).map((s: TruckerStop) => ({
        sequence:    s.stopSequence ?? s.sequence,
        type:        s.stopType     ?? s.type,
        address:     s.address,
        city:        s.city,
        state:       s.state,
        zip:         s.zip,
        scheduledAt: s.scheduledArrival ?? s.scheduledAt,
        arrivedAt:   s.actualArrival    ?? s.arrivedAt,
        departedAt:  s.actualDeparture  ?? s.departedAt,
      })),
      events: (load.events ?? load.allEvents ?? []).map((e: TruckerEvent) => ({
        description: e.eventDescription ?? e.description,
        timestamp:   e.eventTime        ?? e.timestamp,
        lat:         e.latitude  ?? null,
        lng:         e.longitude ?? null,
      })),
      pings: load.pings ?? load.locationHistory ?? [],
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("[track] Unexpected error:", err);
    return NextResponse.json(
      { error: `Server error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}

// ── Types ──
interface TruckerLoad {
  loadNumber?: string; externalId?: string; shipperLoadId?: string;
  latestStatus?: string; status?: string; lastUpdated?: string; lastLocation?: string;
  stops?: TruckerStop[]; events?: TruckerEvent[]; allEvents?: TruckerEvent[];
  pings?: unknown[]; locationHistory?: unknown[];
}
interface TruckerStop {
  stopSequence?: number; sequence?: number; stopType?: string; type?: string;
  address?: string; city?: string; state?: string; zip?: string;
  scheduledArrival?: string; scheduledAt?: string;
  actualArrival?: string; arrivedAt?: string;
  actualDeparture?: string; departedAt?: string;
}
interface TruckerEvent {
  eventDescription?: string; description?: string;
  eventTime?: string; timestamp?: string;
  latitude?: number; longitude?: number;
}
