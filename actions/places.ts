"use server";

import { searchGooglePlaces, getPlaceDetails, type GooglePlaceResult } from "@/lib/google-places";

export async function searchGoogleMapsAction(
  query: string
): Promise<{ results: GooglePlaceResult[]; error: string | null }> {
  const trimmed = query.trim();
  if (!trimmed) return { results: [], error: null };

  try {
    const results = await searchGooglePlaces(trimmed);
    return { results, error: null };
  } catch (e) {
    return { results: [], error: e instanceof Error ? e.message : "Search failed." };
  }
}

/**
 * Looks up a place a user clicked directly on the map (one of Google's own
 * built-in labels, not a result from our search box).
 */
export async function getPlaceDetailsAction(
  placeId: string
): Promise<{ place: GooglePlaceResult | null; error: string | null }> {
  try {
    const place = await getPlaceDetails(placeId);
    return { place, error: null };
  } catch (e) {
    return { place: null, error: e instanceof Error ? e.message : "Lookup failed." };
  }
}
