// Server-only. Never import this from a client component — it reads a
// secret API key from the environment and calls Google directly.
//
// Deliberately uses a single "Text Search (New)" call per search rather than
// live-as-you-type Autocomplete + a separate Place Details call. That keeps
// the cost model simple and predictable: one billed request per company you
// actually search for, not one per keystroke. Because the field mask below
// includes phone and website, each search bills at Google's "Enterprise"
// tier (currently $20 per 1,000, with 1,000 free every month) — see the
// setup notes in README.md for the full cost picture.

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.addressComponents",
  "places.location",
  "places.nationalPhoneNumber",
  "places.websiteUri",
].join(",");

// Place Details (GET /v1/places/{placeId}) returns a single Place object
// directly — not wrapped in a "places" array like Text Search — so its
// field mask must NOT have the "places." prefix, or Google rejects the
// whole request as malformed ("Request contains an invalid argument").
const DETAILS_FIELD_MASK = [
  "id",
  "displayName",
  "formattedAddress",
  "addressComponents",
  "location",
  "nationalPhoneNumber",
  "websiteUri",
].join(",");

export interface GooglePlaceResult {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  phone: string;
  website: string;
  googleMapsLink: string;
  latitude: number | null;
  longitude: number | null;
}

interface RawAddressComponent {
  longText?: string;
  shortText?: string;
  types?: string[];
}

interface RawPlace {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  addressComponents?: RawAddressComponent[];
  location?: { latitude?: number; longitude?: number };
  nationalPhoneNumber?: string;
  websiteUri?: string;
}

function parseRawPlace(p: RawPlace): GooglePlaceResult {
  const components = p.addressComponents ?? [];
  const find = (type: string) => components.find((c) => c.types?.includes(type));

  const streetNumber = find("street_number")?.longText ?? "";
  const route = find("route")?.longText ?? "";
  const city =
    find("locality")?.longText ??
    find("sublocality")?.longText ??
    find("postal_town")?.longText ??
    "";
  const state = find("administrative_area_level_1")?.shortText ?? "";
  const zip = find("postal_code")?.longText ?? "";

  const streetAddress = [streetNumber, route].filter(Boolean).join(" ");

  return {
    id: p.id,
    name: p.displayName?.text ?? "",
    address: streetAddress || p.formattedAddress || "",
    city,
    state,
    zip,
    phone: p.nationalPhoneNumber ?? "",
    website: p.websiteUri ?? "",
    // Constructed directly from the place ID — no extra field/cost needed.
    googleMapsLink: `https://www.google.com/maps/place/?q=place_id:${p.id}`,
    latitude: typeof p.location?.latitude === "number" ? p.location.latitude : null,
    longitude: typeof p.location?.longitude === "number" ? p.location.longitude : null,
  };
}

export async function searchGooglePlaces(query: string): Promise<GooglePlaceResult[]> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Google Maps import isn't configured yet. Add GOOGLE_MAPS_API_KEY to your environment variables and redeploy."
    );
  }

  const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": FIELD_MASK,
    },
    body: JSON.stringify({ textQuery: query, maxResultCount: 5 }),
    cache: "no-store",
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error?.message ?? "";
    } catch {
      // ignore parse failure, fall back to status text below
    }
    throw new Error(
      detail || `Google Places search failed (HTTP ${res.status}). Check your API key and that Places API (New) is enabled.`
    );
  }

  const data = (await res.json()) as { places?: RawPlace[] };
  return (data.places ?? []).map(parseRawPlace);
}

/**
 * Looks up a single place by its Google place ID — used when someone clicks
 * one of Google's own built-in map labels (a "POI") on the Territory Map,
 * rather than a result from our own search box. Same field mask, same
 * billing tier as searchGooglePlaces, so the cost story doesn't change.
 */
export async function getPlaceDetails(placeId: string): Promise<GooglePlaceResult> {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Google Maps import isn't configured yet. Add GOOGLE_MAPS_API_KEY to your environment variables and redeploy."
    );
  }

  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    method: "GET",
    headers: {
      "X-Goog-Api-Key": apiKey,
      "X-Goog-FieldMask": DETAILS_FIELD_MASK,
    },
    cache: "no-store",
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error?.message ?? "";
    } catch {
      // ignore parse failure
    }
    throw new Error(detail || `Couldn't look up that place (HTTP ${res.status}).`);
  }

  const place = (await res.json()) as RawPlace;
  return parseRawPlace(place);
}
