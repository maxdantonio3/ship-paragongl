import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Server-only. Uses the service role key, which bypasses Row Level Security
// entirely — this is what lets the cron job read every user's settings and
// look up their email address, which the normal per-request client (scoped
// to whoever's logged in) can't do. Never import this from a client
// component, and never let SUPABASE_SERVICE_ROLE_KEY leak into anything
// prefixed NEXT_PUBLIC_.
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY — the follow-up digest can't run without both."
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
