"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendTestDigestToUser } from "@/lib/digest";

function str(v: FormDataEntryValue | null): string | null {
  const s = (v ?? "").toString().trim();
  return s.length ? s : null;
}

export async function updateUserSettings(formData: FormData) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const daysRaw = Number(formData.get("default_follow_up_days"));
  const days = Number.isFinite(daysRaw) ? Math.min(Math.max(Math.round(daysRaw), 1), 90) : 7;

  const emailEnabled = formData.get("email_digest_enabled") === "on";
  const frequency = (str(formData.get("email_digest_frequency")) ?? "daily") as "daily" | "weekly";
  const dayOfWeekRaw = str(formData.get("email_digest_day_of_week"));
  const time = str(formData.get("email_digest_time")) ?? "09:00";
  const timezone = str(formData.get("email_digest_timezone")) ?? "America/New_York";

  const { error } = await supabase.from("user_settings").upsert({
    user_id: user.id,
    default_follow_up_days: days,
    email_digest_enabled: emailEnabled,
    email_digest_frequency: frequency,
    email_digest_day_of_week: frequency === "weekly" ? Number(dayOfWeekRaw ?? 1) : null,
    email_digest_time: time,
    email_digest_timezone: timezone,
  });

  if (error) {
    redirect(`/settings?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/settings");
  redirect("/settings?saved=1");
}

export async function sendTestDigest() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    redirect("/settings?digestError=" + encodeURIComponent("You must be signed in with an email to test this."));
  }

  const result = await sendTestDigestToUser(user.id, user.email);

  if (!result.ok) {
    redirect(`/settings?digestError=${encodeURIComponent(result.error)}`);
  }

  redirect(`/settings?digestSent=${result.companyCount}`);
}
