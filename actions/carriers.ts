"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { CarrierStatus, CarrierContactPosition } from "@/lib/types";

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

export async function createCarrier(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload = {
    name: str(formData.get("name")) ?? "Untitled carrier",
    mc_number: str(formData.get("mc_number")),
    dot_number: str(formData.get("dot_number")),
    address: str(formData.get("address")),
    city: str(formData.get("city")),
    state: str(formData.get("state")),
    zip: str(formData.get("zip")),
    latitude: num(formData.get("latitude")),
    longitude: num(formData.get("longitude")),
    google_place_id: str(formData.get("google_place_id")),
    phone: str(formData.get("phone")),
    email: str(formData.get("email")),
    tax_id: str(formData.get("tax_id")),
    insurance_expiration: str(formData.get("insurance_expiration")),
    status: (str(formData.get("status")) as CarrierStatus) ?? "Active",
    public_notes: str(formData.get("public_notes")),
    private_notes: str(formData.get("private_notes")),
    payment_method: str(formData.get("payment_method")),
    factoring_company_id: str(formData.get("factoring_company_id")),
    created_by: user?.id ?? null,
  };

  const { data, error } = await supabase.from("carriers").insert(payload).select("id").single();

  if (error) {
    redirect(`/carriers/new?error=${encodeURIComponent(error.message)}`);
  }

  // Equipment types come in as a repeated "equipment_type_id" field (one
  // per checked chip).
  const equipmentIds = formData.getAll("equipment_type_id").map(String).filter(Boolean);
  if (equipmentIds.length > 0) {
    await supabase
      .from("carrier_equipment_types")
      .insert(equipmentIds.map((equipment_type_id) => ({ carrier_id: data.id, equipment_type_id })));
  }

  // Contacts added inline on the creation form — arrays line up by index
  // since every row renders all four fields in the same order.
  const contactNames = formData.getAll("contact_name").map(String);
  const contactPhones = formData.getAll("contact_phone").map(String);
  const contactEmails = formData.getAll("contact_email").map(String);
  const contactPositions = formData.getAll("contact_position").map(String);

  const contactsToInsert = contactNames
    .map((name, i) => ({
      carrier_id: data.id,
      name: name.trim(),
      phone: contactPhones[i]?.trim() || null,
      email: contactEmails[i]?.trim() || null,
      position: (contactPositions[i]?.trim() || "Owner") as CarrierContactPosition,
    }))
    .filter((c) => c.name.length > 0);

  if (contactsToInsert.length > 0) {
    await supabase.from("carrier_contacts").insert(contactsToInsert);
  }

  // Documents uploaded during creation (before the carrier had a real ID)
  // land in Storage under a temporary draft ID — see actions/carrier-documents.ts.
  // Now that the carrier exists for real, link those already-uploaded files
  // to it. The files themselves don't need to move; the storage path just
  // keeps its original (draft-id-prefixed) folder name.
  const docTypes = formData.getAll("draft_document_type").map(String);
  const docFileNames = formData.getAll("draft_document_file_name").map(String);
  const docFilePaths = formData.getAll("draft_document_file_path").map(String);
  const docDescriptions = formData.getAll("draft_document_description").map(String);

  const documentsToInsert = docTypes
    .map((document_type, i) => ({
      carrier_id: data.id,
      document_type,
      description: docDescriptions[i]?.trim() || null,
      file_name: docFileNames[i],
      file_path: docFilePaths[i],
      uploaded_by: user?.id ?? null,
    }))
    .filter((d) => d.file_path);

  if (documentsToInsert.length > 0) {
    await supabase.from("carrier_documents").insert(documentsToInsert);
  }

  revalidatePath("/carriers");
  redirect(`/carriers/${data.id}`);
}

export async function updateCarrier(carrierId: string, formData: FormData) {
  const supabase = createClient();

  const payload = {
    name: str(formData.get("name")) ?? "Untitled carrier",
    mc_number: str(formData.get("mc_number")),
    dot_number: str(formData.get("dot_number")),
    address: str(formData.get("address")),
    city: str(formData.get("city")),
    state: str(formData.get("state")),
    zip: str(formData.get("zip")),
    latitude: num(formData.get("latitude")),
    longitude: num(formData.get("longitude")),
    google_place_id: str(formData.get("google_place_id")),
    phone: str(formData.get("phone")),
    email: str(formData.get("email")),
    tax_id: str(formData.get("tax_id")),
    insurance_expiration: str(formData.get("insurance_expiration")),
    status: (str(formData.get("status")) as CarrierStatus) ?? "Active",
    public_notes: str(formData.get("public_notes")),
    private_notes: str(formData.get("private_notes")),
    payment_method: str(formData.get("payment_method")),
    factoring_company_id: str(formData.get("factoring_company_id")),
  };

  const { error } = await supabase.from("carriers").update(payload).eq("id", carrierId);

  if (error) {
    redirect(`/carriers/${carrierId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  const equipmentIds = formData.getAll("equipment_type_id").map(String).filter(Boolean);
  await supabase.from("carrier_equipment_types").delete().eq("carrier_id", carrierId);
  if (equipmentIds.length > 0) {
    await supabase
      .from("carrier_equipment_types")
      .insert(equipmentIds.map((equipment_type_id) => ({ carrier_id: carrierId, equipment_type_id })));
  }

  revalidatePath("/carriers");
  revalidatePath(`/carriers/${carrierId}`);
  redirect(`/carriers/${carrierId}`);
}

export async function updateCarrierStatus(carrierId: string, status: CarrierStatus) {
  const supabase = createClient();
  const { error } = await supabase.from("carriers").update({ status }).eq("id", carrierId);
  if (error) throw new Error(error.message);

  revalidatePath("/carriers");
  revalidatePath(`/carriers/${carrierId}`);
}

export async function deleteCarrier(carrierId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("carriers").delete().eq("id", carrierId);
  if (error) {
    redirect(`/carriers/${carrierId}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/carriers");
  redirect("/carriers");
}

/** Fetches a carrier's contacts for the Load form's driver picker — lets
 * you pick an existing contact's name/phone instead of typing them by hand. */
export async function getCarrierContactsForLoad(
  carrierId: string
): Promise<{ id: string; name: string; phone: string | null; position: string }[]> {
  if (!carrierId) return [];
  const supabase = createClient();
  const { data } = await supabase
    .from("carrier_contacts")
    .select("id, name, phone, position")
    .eq("carrier_id", carrierId)
    .order("name");
  return data ?? [];
}
