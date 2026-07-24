"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function submitCarrierRating(
  carrierId: string,
  loadId: string | null,
  stars: number,
  note: string | null,
  markDoNotUse: boolean
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // A load can only have one rating — re-rating an already-rated load
  // updates it in place instead of piling up duplicates.
  if (loadId) {
    const { data: existing } = await supabase
      .from("carrier_ratings")
      .select("id")
      .eq("load_id", loadId)
      .maybeSingle();

    if (existing) {
      const { error } = await supabase
        .from("carrier_ratings")
        .update({ stars, note: note?.trim() || null })
        .eq("id", existing.id);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("carrier_ratings").insert({
        carrier_id: carrierId,
        load_id: loadId,
        stars,
        note: note?.trim() || null,
        created_by: user?.id ?? null,
      });
      if (error) throw new Error(error.message);
    }
  } else {
    const { error } = await supabase.from("carrier_ratings").insert({
      carrier_id: carrierId,
      load_id: null,
      stars,
      note: note?.trim() || null,
      created_by: user?.id ?? null,
    });
    if (error) throw new Error(error.message);
  }

  if (markDoNotUse) {
    await supabase.from("carriers").update({ status: "Do Not Use" }).eq("id", carrierId);
  }

  revalidatePath("/carriers");
  revalidatePath(`/carriers/${carrierId}`);
  revalidatePath("/loads");
  if (loadId) revalidatePath(`/loads/${loadId}`);
}

export async function updateCarrierRating(carrierId: string, ratingId: string, stars: number, note: string | null) {
  const supabase = createClient();
  const { error } = await supabase.from("carrier_ratings").update({ stars, note: note?.trim() || null }).eq("id", ratingId);
  if (error) throw new Error(error.message);

  revalidatePath("/carriers");
  revalidatePath(`/carriers/${carrierId}`);
  revalidatePath("/loads");
}

export async function deleteCarrierRating(carrierId: string, ratingId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("carrier_ratings").delete().eq("id", ratingId);
  if (error) throw new Error(error.message);

  revalidatePath("/carriers");
  revalidatePath(`/carriers/${carrierId}`);
}

/** For the dashboard's rating column — which loads already have a rating
 * tied to them directly (not the carrier's aggregate). */
export async function getRatingsForLoads(
  loadIds: string[]
): Promise<Record<string, { id: string; stars: number; note: string | null }>> {
  if (loadIds.length === 0) return {};
  const supabase = createClient();
  const { data } = await supabase
    .from("carrier_ratings")
    .select("id, load_id, stars, note, created_at")
    .in("load_id", loadIds)
    .order("created_at", { ascending: false });

  const result: Record<string, { id: string; stars: number; note: string | null }> = {};
  (data ?? []).forEach((r) => {
    if (r.load_id && !(r.load_id in result)) result[r.load_id] = { id: r.id, stars: r.stars, note: r.note };
  });
  return result;
}
