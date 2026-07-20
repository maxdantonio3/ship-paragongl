import { NextRequest, NextResponse } from "next/server";

const PARTNER_ID = process.env.TT_PARTNER_ID!;
const ACCOUNT_ID = process.env.TT_ACCOUNT_ID!;

// Exact URLs from TruckerTools API docs v1.1.2
const TT_BASE = "https://loadtracking.truckertools.com";
const BY_EXTERNAL_ID  = `${TT_BASE}/loadtrackservice/getLoadTrackDetailsServiceV2`;
const BY_LOAD_NUMBER  = `${TT_BASE}/loadtrackservice/getLoadTrackDetailsServiceByLoadNumber`;

export async function POST(req: NextRequest) {
  try {
    const { loadNumber } = await req.json();

    if (!loadNumber || typeof loadNumber !== "string") {
      return NextResponse.json({ error: "Load number is required." }, { status: 400 });
    }

    const id = loadNumber.trim();

    // Try by external ID first, then by load number
    const attempts = [
      {
        url:  BY_EXTERNAL_ID,
        body: { partnerId: PARTNER_ID, accountId: ACCOUNT_ID, externalIds: [id] },
        label: "by external ID",
      },
      {
        url:  BY_LOAD_NUMBER,
        body: { partnerId: PARTNER_ID, accountId: ACCOUNT_ID, loadNumbers: [id] },
        label: "by load number",
      },
    ];

    const debugLines: string[] = [];

    for (const attempt of attempts) {
      console.log(`[track] Trying ${attempt.label}:`, attempt.url);

      const res = await fetch(attempt.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(attempt.body),
      });

      const text = await res.text();
      console.log(`[track] ${attempt.label} → ${res.status}: ${text.slice(0, 300)}`);
      debugLines.push(`${attempt.label} (${res.status}): ${text.slice(0, 400)}`);

      // Only try to parse if it looks like JSON
      const isJson = res.headers.get("content-type")?.includes("json")
        || text.trim().startsWith("{")
        || text.trim().startsWith("[");

      if (!isJson) continue;

      let data: unknown;
      try { data = JSON.parse(text); } catch { continue; }

      // TruckerTools may wrap results in different keys — try all common ones
      const loads: TruckerLoad[] = Array.isArray(data)
        ? data
        : ((data as Record<string, unknown>)?.loadTracks
          ?? (data as Record<string, unknown>)?.loads
          ?? (data as Record<string, unknown>)?.results
          ?? []) as TruckerLoad[];

      const load = loads[0] ?? null;

      // If single object returned directly
      const single = (!Array.isArray(data) && (data as TruckerLoad)?.loadNumber)
        ? data as TruckerLoad
        : null;

      const src = load ?? single;
      if (!src) continue;

      return NextResponse.json({
        loadNumber:    src.loadNumber   ?? src.externalId ?? id,
        shipperLoadId: src.shipperLoadId ?? null,
        status:        src.latestStatus  ?? src.status ?? "Unknown",
        lastUpdated:   src.lastUpdated   ?? null,
        lastLocation:  src.lastLocation  ?? null,
        stops: (src.stops ?? []).map((s: TruckerStop) => ({
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
        events: (src.events ?? src.allEvents ?? []).map((e: TruckerEvent) => ({
          description: e.eventDescription ?? e.description,
          timestamp:   e.eventTime        ?? e.timestamp,
          lat:         e.latitude  ?? null,
          lng:         e.longitude ?? null,
        })),
        pings: src.pings ?? src.locationHistory ?? [],
      });
    }

    return NextResponse.json(
      { error: `No tracking data found for "${id}".\n\nDebug:\n${debugLines.join("\n\n")}` },
      { status: 404 }
    );

  } catch (err) {
    console.error("[track] Error:", err);
    return NextResponse.json(
      { error: `Server error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    );
  }
}

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
