"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { searchGooglePlaces } from "@/lib/google-places";
import type { Company, CompanyStatus } from "@/lib/types";

// Caps how many companies get backfilled per click — keeps each run quick
// and avoids an unexpectedly large burst of Places API calls if someone has
// a very large book of business with no locations saved yet. Click again
// to keep going if there are more left after one pass.
const MAX_PER_RUN = 40;

export interface BackfillResult {
  attempted: number;
  updated: number;
  notFound: string[]; // company names Google couldn't confidently match
  errors: { name: string; error: string }[];
  remaining: number;
}

/**
 * For every company missing a saved latitude/longitude, builds a search
 * query from its existing name + address + city + state and re-runs it
 * through the same Places search already used on the "Add company" form —
 * no new API, no new key. Only touches latitude/longitude; every other
 * field on the company record is left exactly as it is.
 */
export async function backfillCompanyLocations(): Promise<BackfillResult> {
  const supabase = createClient();

  const { data: missing, error } = await supabase
    .from("companies")
    .select("id, name, address, city, state")
    .or("latitude.is.null,longitude.is.null")
    .not("name", "is", null);

  if (error) {
    return { attempted: 0, updated: 0, notFound: [], errors: [{ name: "—", error: error.message }], remaining: 0 };
  }

  const all = (missing ?? []) as Pick<Company, "id" | "name" | "address" | "city" | "state">[];
  const batch = all.slice(0, MAX_PER_RUN);
  const remaining = Math.max(all.length - batch.length, 0);

  const result: BackfillResult = { attempted: batch.length, updated: 0, notFound: [], errors: [], remaining };

  for (const company of batch) {
    const query = [company.name, company.address, company.city, company.state].filter(Boolean).join(" ");
    if (!query.trim()) {
      result.notFound.push(company.name);
      continue;
    }

    try {
      const matches = await searchGooglePlaces(query);
      const top = matches[0];

      if (!top || top.latitude == null || top.longitude == null) {
        result.notFound.push(company.name);
        continue;
      }

      const { error: updateError } = await supabase
        .from("companies")
        .update({ latitude: top.latitude, longitude: top.longitude })
        .eq("id", company.id);

      if (updateError) {
        result.errors.push({ name: company.name, error: updateError.message });
      } else {
        result.updated += 1;
      }
    } catch (e) {
      result.errors.push({ name: company.name, error: e instanceof Error ? e.message : "Search failed" });
    }
  }

  revalidatePath("/territory");
  revalidatePath("/dashboard");
  return result;
}

/**
 * Creates a company directly from a Places search result found while
 * browsing the Territory Map — used by the "+ Add to CRM" flow there.
 * Unlike createCompany (used by the full Add Company form), this doesn't
 * redirect anywhere; the map stays open and just refreshes to show the new
 * company as a real marker.
 */
export async function addProspectToCrm(formData: FormData): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const num = (v: FormDataEntryValue | null): number | null => {
    const s = (v ?? "").toString().trim();
    if (!s) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  };
  const str = (v: FormDataEntryValue | null): string | null => {
    const s = (v ?? "").toString().trim();
    return s.length ? s : null;
  };

  const payload = {
    name: str(formData.get("name")) ?? "Untitled company",
    status: (str(formData.get("status")) as CompanyStatus) ?? "Cold",
    address: str(formData.get("address")),
    city: str(formData.get("city")),
    state: str(formData.get("state")),
    zip: str(formData.get("zip")),
    phone: str(formData.get("phone")),
    email: str(formData.get("email")),
    website: str(formData.get("website")),
    google_maps_link: str(formData.get("google_maps_link")),
    google_place_id: str(formData.get("google_place_id")),
    notes_summary: str(formData.get("notes_summary")),
    latitude: num(formData.get("latitude")),
    longitude: num(formData.get("longitude")),
    branch_id: str(formData.get("branch_id")),
    created_by: user?.id ?? null,
  };

  const { data, error } = await supabase.from("companies").insert(payload).select("id").single();

  if (error) return { ok: false, error: error.message };

  const activityType = str(formData.get("activity_type"));
  if (activityType) {
    await supabase.from("activities").insert({
      company_id: data.id,
      activity_type: activityType,
      activity_date: new Date().toISOString(),
      notes: str(formData.get("activity_notes")),
      created_by: user?.id ?? null,
    });
  }

  revalidatePath("/territory");
  revalidatePath("/dashboard");
  return { ok: true, id: data.id };
}
export async function countCompaniesMissingLocation(): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from("companies")
    .select("id", { count: "exact", head: true })
    .or("latitude.is.null,longitude.is.null");
  return count ?? 0;
}
