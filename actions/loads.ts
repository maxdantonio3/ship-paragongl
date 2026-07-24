"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { LoadStatus, LoadSize, PayStatus } from "@/lib/types";

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

function intVal(v: FormDataEntryValue | null): number | null {
  const s = (v ?? "").toString().trim();
  if (!s) return null;
  const n = parseInt(s, 10);
  return Number.isFinite(n) ? n : null;
}

function buildPayload(formData: FormData) {
  return {
    customer_id: str(formData.get("customer_id")),
    carrier_id: str(formData.get("carrier_id")),
    equipment_type_id: str(formData.get("equipment_type_id")),
    equipment_length: str(formData.get("equipment_length")),
    commodity_type_id: str(formData.get("commodity_type_id")),
    status: (str(formData.get("status")) as LoadStatus) ?? "Quoted",
    commodity: str(formData.get("commodity")),
    weight: num(formData.get("weight")),
    pieces: intVal(formData.get("pieces")),
    load_size: (str(formData.get("load_size")) as LoadSize | null) ?? null,
    declared_value: num(formData.get("declared_value")),
    po_number: str(formData.get("po_number")),
    bol_number: str(formData.get("bol_number")),
    freight_charge_terms: str(formData.get("freight_charge_terms")),
    driver_name: str(formData.get("driver_name")),
    driver_phone: str(formData.get("driver_phone")),
    public_notes: str(formData.get("public_notes")),
    private_notes: str(formData.get("private_notes")),
  };
}

/** Stops, handling units, and line items are all repeatable lists
 * submitted as parallel arrays (one FormData entry per field per row,
 * matched up by index). After line items are saved, customer_rate/
 * carrier_cost on the load are recomputed as the sum of income/expense
 * line items respectively, so the existing generated `margin` column
 * (customer_rate - carrier_cost) reflects the full picture — including
 * every line item, not just a manually-typed base rate. */
async function saveChildRecords(supabase: ReturnType<typeof createClient>, loadId: string, formData: FormData) {
  // Stops (pickup/delivery, one or more of each)
  const stopTypes = formData.getAll("stop_type").map(String);
  const stopLocationIds = formData.getAll("stop_location_id").map(String);
  const stopDateStarts = formData.getAll("stop_date_start").map(String);
  const stopDateEnds = formData.getAll("stop_date_end").map(String);
  const stopTimeStarts = formData.getAll("stop_time_start").map(String);
  const stopTimeEnds = formData.getAll("stop_time_end").map(String);
  const stopNotes = formData.getAll("stop_notes").map(String);
  const stopContactNames = formData.getAll("stop_contact_name").map(String);
  const stopContactPhones = formData.getAll("stop_contact_phone").map(String);
  await supabase.from("load_stops").delete().eq("load_id", loadId);
  const stops = stopTypes.map((stop_type, i) => ({
    load_id: loadId,
    stop_type,
    sequence: i,
    location_id: stopLocationIds[i] || null,
    date_start: stopDateStarts[i] || null,
    date_end: stopDateEnds[i] || null,
    time_start: stopTimeStarts[i] || null,
    time_end: stopTimeEnds[i] || null,
    notes: stopNotes[i]?.trim() || null,
    contact_name: stopContactNames[i]?.trim() || null,
    contact_phone: stopContactPhones[i]?.trim() || null,
  }));
  if (stops.length > 0) await supabase.from("load_stops").insert(stops);

  // Handling units
  const unitTypeIds = formData.getAll("handling_unit_type_id").map(String);
  const unitQuantities = formData.getAll("handling_unit_quantity").map(String);
  await supabase.from("load_handling_units").delete().eq("load_id", loadId);
  const units = unitTypeIds
    .map((piece_type_id, i) => ({
      load_id: loadId,
      piece_type_id: piece_type_id || null,
      quantity: parseInt(unitQuantities[i], 10) || 1,
      sort_order: i,
    }))
    .filter((u) => u.piece_type_id);
  if (units.length > 0) await supabase.from("load_handling_units").insert(units);

  // Financial line items (income + expense)
  const lineTypeIds = formData.getAll("line_item_type_id").map(String);
  const lineSides = formData.getAll("line_item_side").map(String);
  const lineQuantities = formData.getAll("line_item_quantity").map(String);
  const lineAmounts = formData.getAll("line_item_amount").map(String);
  const lineNotes = formData.getAll("line_item_notes").map(String);
  const linePaperwork = formData.getAll("line_item_include_on_paperwork").map(String);
  await supabase.from("load_line_items").delete().eq("load_id", loadId);
  const lineItems = lineTypeIds
    .map((type_id, i) => ({
      load_id: loadId,
      type_id: type_id || null,
      side: lineSides[i] === "expense" ? "expense" : "income",
      quantity: parseInt(lineQuantities[i], 10) || 1,
      amount: Number(lineAmounts[i]) || 0,
      notes: lineNotes[i]?.trim() || null,
      include_on_paperwork: linePaperwork[i] === "true",
      sort_order: i,
    }))
    .filter((l) => l.type_id);
  if (lineItems.length > 0) await supabase.from("load_line_items").insert(lineItems);

  const customerRate = lineItems.filter((l) => l.side === "income").reduce((sum, l) => sum + l.amount * l.quantity, 0);
  const carrierCost = lineItems.filter((l) => l.side === "expense").reduce((sum, l) => sum + l.amount * l.quantity, 0);
  await supabase.from("loads").update({ customer_rate: customerRate, carrier_cost: carrierCost }).eq("id", loadId);
}

export async function createLoad(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const payload = { ...buildPayload(formData), created_by: user?.id ?? null };

  const { data, error } = await supabase.from("loads").insert(payload).select("id").single();

  if (error) {
    redirect(`/loads/new?error=${encodeURIComponent(error.message)}`);
  }

  await saveChildRecords(supabase, data.id, formData);

  revalidatePath("/loads");
  revalidatePath("/carriers");
  redirect(`/loads/${data.id}`);
}

export async function updateLoad(loadId: string, formData: FormData) {
  const supabase = createClient();
  const payload = buildPayload(formData);

  const { error } = await supabase.from("loads").update(payload).eq("id", loadId);

  if (error) {
    redirect(`/loads/${loadId}/edit?error=${encodeURIComponent(error.message)}`);
  }

  await saveChildRecords(supabase, loadId, formData);

  revalidatePath("/loads");
  revalidatePath(`/loads/${loadId}`);
  revalidatePath("/carriers");
  redirect(`/loads/${loadId}`);
}

export async function updateLoadStatus(loadId: string, status: LoadStatus) {
  const supabase = createClient();
  const { error } = await supabase.from("loads").update({ status }).eq("id", loadId);
  if (error) throw new Error(error.message);

  revalidatePath("/loads");
  revalidatePath(`/loads/${loadId}`);
  revalidatePath("/carriers");
}

export async function updateCarrierPayStatus(loadId: string, carrier_pay_status: PayStatus | null) {
  const supabase = createClient();
  const { error } = await supabase.from("loads").update({ carrier_pay_status }).eq("id", loadId);
  if (error) throw new Error(error.message);

  revalidatePath("/loads");
  revalidatePath(`/loads/${loadId}`);
}

export async function updatePglPayStatus(loadId: string, pgl_pay_status: PayStatus | null) {
  const supabase = createClient();
  const { error } = await supabase.from("loads").update({ pgl_pay_status }).eq("id", loadId);
  if (error) throw new Error(error.message);

  revalidatePath("/loads");
  revalidatePath(`/loads/${loadId}`);
}

export async function deleteLoad(loadId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("loads").delete().eq("id", loadId);
  if (error) {
    redirect(`/loads/${loadId}?error=${encodeURIComponent(error.message)}`);
  }
  revalidatePath("/loads");
  revalidatePath("/carriers");
  redirect("/loads");
}

/** Duplicates a load — same customer/carrier/equipment/rate/etc, but a
 * fresh load number, reset to Quoted status, and no dates/BOL number
 * (since a copied shipment is almost always for a new date). Stops,
 * handling units, and line items are all copied over (stops with their
 * dates cleared, since those need to be re-picked). */
export async function duplicateLoad(loadId: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: original, error: fetchError } = await supabase.from("loads").select("*").eq("id", loadId).single();
  if (fetchError || !original) {
    redirect(`/loads/${loadId}?error=${encodeURIComponent(fetchError?.message ?? "Load not found")}`);
  }

  const { id: _id, load_number: _loadNumber, created_at: _createdAt, updated_at: _updatedAt, margin: _margin, ...rest } = original;

  const { data: copy, error } = await supabase
    .from("loads")
    .insert({
      ...rest,
      status: "Quoted",
      bol_number: null,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (error) {
    redirect(`/loads/${loadId}?error=${encodeURIComponent(error.message)}`);
  }

  const [{ data: stops }, { data: units }, { data: lineItems }] = await Promise.all([
    supabase.from("load_stops").select("stop_type, sequence, location_id, contact_name, contact_phone").eq("load_id", loadId),
    supabase.from("load_handling_units").select("piece_type_id, quantity, sort_order").eq("load_id", loadId),
    supabase
      .from("load_line_items")
      .select("type_id, side, quantity, amount, notes, include_on_paperwork, sort_order")
      .eq("load_id", loadId),
  ]);

  // Stops are copied with the location kept but dates cleared — the whole
  // point of copying is usually "same route, new date."
  if (stops && stops.length > 0) {
    await supabase.from("load_stops").insert(
      stops.map((s) => ({ ...s, load_id: copy.id, date_start: null, date_end: null, time_start: null, time_end: null }))
    );
  }
  if (units && units.length > 0) {
    await supabase.from("load_handling_units").insert(units.map((u) => ({ ...u, load_id: copy.id })));
  }
  if (lineItems && lineItems.length > 0) {
    await supabase.from("load_line_items").insert(lineItems.map((l) => ({ ...l, load_id: copy.id })));
  }

  revalidatePath("/loads");
  redirect(`/loads/${copy.id}/edit`);
}
