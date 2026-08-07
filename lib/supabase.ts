// ship.paragongl.com — Supabase server client — 2026-07-23-v33
// Read-only access to the SHARED Supabase project that Nexus writes to.
// Used server-side only (from the /api/track route), never in the browser.
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  if (cached) return cached;

  const url = process.env.SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

// One row of the tracking_stops_view (snake_case, as the DB returns it).
export interface StopRow {
  stop_sequence: number | null;
  stop_type:     string | null;
  city:          string | null;
  state:         string | null;
  zip:           string | null;
  scheduled_at:  string | null;
  scheduled_end: string | null;
  arrived_at:    string | null;
  departed_at:   string | null;
}

// Fetch stops for one load from the shared view, mapped into the camelCase
// shape the stop-card UI reads. Returns [] on any failure so the caller can
// treat "no stops" and "stops lookup failed" identically.
export async function getStopsForLoad(loadNumber: string) {
  const sb = getSupabase();
  if (!sb) return [];

  const { data, error } = await sb
    .from("tracking_stops_view")
    .select("stop_sequence, stop_type, city, state, zip, scheduled_at, scheduled_end, arrived_at, departed_at")
    .eq("load_number", loadNumber)
    .order("stop_sequence", { ascending: true });

  if (error) {
    console.error("[track] supabase stops lookup failed:", error.message);
    return [];
  }

  return (data as StopRow[] ?? []).map((r) => ({
    sequence:    r.stop_sequence,
    type:        r.stop_type,
    city:        r.city,
    state:       r.state,
    zip:         r.zip,
    scheduledAt: r.scheduled_at,
    scheduledEnd: r.scheduled_end,  // window end — NULL when stop is a single appointment time
    arrivedAt:   r.arrived_at,
    departedAt:  r.departed_at,
  }));
}
