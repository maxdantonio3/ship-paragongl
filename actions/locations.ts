"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function str(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
}

function num(v: FormDataEntryValue | null): number | null {
  const s = (v ?? "").toString().trim();
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function buildPayload(formData: FormData) {
  return {
    name: str(formData.get("name")) ?? "Untitled location",
    address: str(formData.get("address")),
    city: str(formData.get("city")),
    state: str(formData.get("state")),
    zip: str(formData.get("zip")),
    latitude: num(formData.get("latitude")),
    longitude: num(formData.get("longitude")),
    google_place_id: str(formData.get("google_place_id")),
    contact_name: str(formData.get("contact_name")),
    contact_phone: str(formData.get("contact_phone")),
    contact_email: str(formData.get("contact_email")),
    notes: str(formData.get("notes")),
    public_notes: str(formData.get("public_notes")),
    private_notes: str(formData.get("private_notes")),
    location_type_id: str(formData.get("location_type_id")),
  };
}

export async function createLocation(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload = { ...buildPayload(formData), created_by: user?.id ?? null };

  const { data, error } = await supabase.from("locations").insert(payload).select("id").single();

  if (error) {
    redirect(`/locations/new?error=${encodeURIComponent(error.message)}`);
  }

  // Contacts added inline on the creation form — arrays line up by index
  // since every row renders all three fields in the same order.
  const contactNames = formData.getAll("location_contact_name").map(String);
  const contactPhones = formData.getAll("location_contact_phone").map(String);
  const contactEmails = formData.getAll("location_contact_email").map(String);

  const contactsToInsert = contactNames
    .map((name, i) => ({
      location_id: data.id,
      name: name.trim(),
      phone: contactPhones[i]?.trim() || null,
      email: contactEmails[i]?.trim() || null,
    }))
    .filter((c) => c.name.length > 0);

  if (contactsToInsert.length > 0) {
    await supabase.from("location_contacts").insert(contactsToInsert);
  }

  revalidatePath("/locations");
  redirect(`/locations/${data.id}`);
}

export async function updateLocation(locationId: string, formData: FormData) {
  const supabase = createClient();
  const payload = buildPayload(formData);

  const { error } = await supabase.from("locations").update(payload).eq("id", locationId);

  if (error) {
    redirect(`/locations/${locationId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/locations");
  revalidatePath(`/locations/${locationId}`);
  redirect(`/locations/${locationId}`);
}

export async function deleteLocation(locationId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("locations").delete().eq("id", locationId);
  if (error) {
    redirect(`/locations/${locationId}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/locations");
  redirect("/locations");
}
