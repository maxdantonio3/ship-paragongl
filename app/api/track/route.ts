import { NextRequest, NextResponse } from "next/server";

// ── TruckerTools credentials — stored as Vercel env vars ──
const PARTNER_ID  = process.env.TT_PARTNER_ID!;   // 152
const ACCOUNT_ID  = process.env.TT_ACCOUNT_ID!;   // 7jlmaLrkj5eq4NN/PHa9uQ==

// TruckerTools Pull Load Track Updates endpoint
const TT_BASE = "https://developer.truckertools.com/apis/getloadtrackupdates";

export async function POST(req: NextRequest) {
  try {
    const { loadNumber } = await req.json();

    if (!loadNumber || typeof loadNumber !== "string") {
      return NextResponse.json(
        { error: "Load number is required." },
        { status: 400 }
      );
    }

    // Call TruckerTools API
    const ttRes = await fetch(`${TT_BASE}/loadnumbers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        partnerId:  PARTNER_ID,
        accountId:  ACCOUNT_ID,
        loadNumbers: [loadNumber.trim().toUpperCase()],
      }),
    });

    if (!ttRes.ok) {
      const errText = await ttRes.text();
      console.error("TruckerTools error:", ttRes.status, errText);
      return NextResponse.json(
        { error: "Tracking service unavailable. Please try again shortly." },
        { status: 502 }
      );
    }

    const data = await ttRes.json();

    // TruckerTools returns an array; grab first match
    const loads = Array.isArray(data) ? data : data?.loads ?? [];
    const load  = loads[0] ?? null;

    if (!load) {
      return NextResponse.json(
        { error: "No shipment found for that load number. Please check the number and try again." },
        { status: 404 }
      );
    }

    // Normalise the response into our own shape
    // so the frontend never depends on TruckerTools' field names
    const result = {
      loadNumber:    load.loadNumber   ?? loadNumber,
      shipperLoadId: load.shipperLoadId ?? null,
      status:        load.latestStatus  ?? load.status ?? "Unknown",
      lastUpdated:   load.lastUpdated   ?? null,
      lastLocation:  load.lastLocation  ?? null,
      stops: (load.stops ?? []).map((s: TruckerStop) => ({
        sequence:     s.stopSequence ?? s.sequence,
        type:         s.stopType     ?? s.type,       // PICKUP | DELIVERY
        address:      s.address,
        city:         s.city,
        state:        s.state,
        zip:          s.zip,
        scheduledAt:  s.scheduledArrival ?? s.scheduledAt,
        arrivedAt:    s.actualArrival    ?? s.arrivedAt,
        departedAt:   s.actualDeparture  ?? s.departedAt,
      })),
      events: (load.events ?? load.allEvents ?? []).map((e: TruckerEvent) => ({
        description: e.eventDescription ?? e.description,
        timestamp:   e.eventTime        ?? e.timestamp,
        lat:         e.latitude  ?? null,
        lng:         e.longitude ?? null,
      })),
      // Pass through raw pings for the map
      pings: load.pings ?? load.locationHistory ?? [],
    };

    return NextResponse.json(result);
  } catch (err) {
    console.error("Track API error:", err);
    return NextResponse.json(
      { error: "An unexpected error occurred. Please try again." },
      { status: 500 }
    );
  }
}

// ── Lightweight TruckerTools type hints ──
interface TruckerStop {
  stopSequence?: number; sequence?: number;
  stopType?: string;     type?: string;
  address?: string; city?: string; state?: string; zip?: string;
  scheduledArrival?: string; scheduledAt?: string;
  actualArrival?: string;    arrivedAt?: string;
  actualDeparture?: string;  departedAt?: string;
}

interface TruckerEvent {
  eventDescription?: string; description?: string;
  eventTime?: string;        timestamp?: string;
  latitude?: number; longitude?: number;
}
