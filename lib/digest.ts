import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import type { Company, UserSettings } from "@/lib/types";

function weekdayInTimezone(date: Date, timezone: string): number {
  // Returns 0 (Sunday) through 6 (Saturday), matching email_digest_day_of_week.
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: timezone, weekday: "short" }).format(
    date
  );
  const map: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return map[parts] ?? date.getUTCDay();
}

export function shouldSendToday(settings: UserSettings, now: Date = new Date()): boolean {
  if (!settings.email_digest_enabled) return false;
  if (settings.email_digest_frequency === "daily") return true;
  const todayDow = weekdayInTimezone(now, settings.email_digest_timezone || "UTC");
  return todayDow === (settings.email_digest_day_of_week ?? 1);
}

async function fetchDueCompanies(): Promise<Company[]> {
  const admin = createAdminClient();
  const todayStr = new Date().toISOString().slice(0, 10);

  const { data, error } = await admin
    .from("companies")
    .select("*")
    .lte("next_follow_up_date", todayStr)
    .order("next_follow_up_date", { ascending: true })
    .limit(50);

  if (error) throw new Error(error.message);
  return (data ?? []) as Company[];
}

const STATUS_COLORS: Record<string, string> = {
  Cold: "#5B7290",
  Warm: "#E0862E",
  Quoting: "#7A6FD0",
  Customer: "#2E9E64",
};

function buildDigestHtml(companies: Company[], appUrl: string): string {
  const todayStr = new Date().toISOString().slice(0, 10);

  const rows = companies
    .map((c) => {
      const overdue = (c.next_follow_up_date ?? "") < todayStr;
      const dueToday = (c.next_follow_up_date ?? "") === todayStr;
      const dateLabel = c.next_follow_up_date
        ? new Date(c.next_follow_up_date + "T00:00:00").toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })
        : "—";
      const statusColor = STATUS_COLORS[c.status] ?? "#5B7290";
      const dueColor = overdue ? "#DC2626" : dueToday ? "#E0862E" : "#2E9E64";
      const dueLabel = overdue ? "Overdue" : dueToday ? "Due today" : "Upcoming";

      return `
        <tr>
          <td style="padding:0;border-bottom:1px solid #E3E7ED;">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-left:3px solid ${statusColor};">
              <tr>
                <td style="padding:14px 16px;">
                  <a href="${appUrl}/companies/${c.id}" style="color:#152238;text-decoration:none;font-weight:700;font-size:15px;">${escapeHtml(c.name)}</a>
                  <div style="margin-top:4px;">
                    <span style="display:inline-block;font-size:11px;font-weight:700;color:${statusColor};background:${statusColor}1A;border-radius:999px;padding:2px 9px;">${escapeHtml(c.status)}</span>
                  </div>
                </td>
                <td style="padding:14px 16px;text-align:right;white-space:nowrap;">
                  <div style="font-size:11px;font-weight:700;letter-spacing:0.04em;color:${dueColor};text-transform:uppercase;">${dueLabel}</div>
                  <div style="font-family:'SF Mono',Consolas,monospace;font-size:13px;color:#5B7290;margin-top:2px;">${dateLabel}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>`;
    })
    .join("");

  const body =
    companies.length === 0
      ? `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:36px 20px;text-align:center;background:#F6F7F9;border-radius:10px;">
            <div style="font-size:28px;line-height:1;margin-bottom:10px;">✓</div>
            <div style="font-size:15px;font-weight:700;color:#152238;">You're all caught up</div>
            <div style="font-size:13px;color:#5B7290;margin-top:4px;">Nothing is due or overdue for follow-up right now.</div>
          </td>
        </tr>
      </table>`
      : `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #E3E7ED;border-radius:10px;overflow:hidden;">
        ${rows}
      </table>`;

  return `
    <div style="font-family:-apple-system,'Segoe UI',Helvetica,Arial,sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#FFFFFF;">
      <img src="${appUrl}/paragon-nexus-logo.png" alt="Paragon Nexus" width="150" style="display:block;width:150px;height:auto;margin-bottom:20px;" />
      <div style="height:3px;width:36px;background:#E0862E;border-radius:2px;margin-bottom:20px;"></div>

      <h1 style="font-size:21px;color:#152238;margin:0 0 6px;font-weight:700;">Follow-up digest</h1>
      <p style="font-size:14px;color:#5B7290;margin:0 0 22px;">
        ${
          companies.length === 0
            ? "Nothing needs attention today."
            : `${companies.length} ${companies.length === 1 ? "company is" : "companies are"} due or overdue for follow-up.`
        }
      </p>

      ${body}

      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;border-top:1px solid #E3E7ED;">
        <tr>
          <td style="padding-top:16px;font-size:12px;color:#9CA9BB;">
            <a href="${appUrl}/dashboard" style="color:#E0862E;text-decoration:none;font-weight:600;">Open the dashboard</a>
            &nbsp;·&nbsp;
            <a href="${appUrl}/settings" style="color:#E0862E;text-decoration:none;font-weight:600;">Change digest settings</a>
          </td>
        </tr>
      </table>
    </div>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

interface DigestRunResult {
  sent: number;
  skippedEmpty: number;
  skippedNotToday: number;
  errors: { userId: string; error: string }[];
}

/**
 * Sends the digest to every user whose settings say "send today" (daily
 * always qualifies; weekly only on their chosen day). Used by the cron
 * route. Skips anyone with zero due/overdue companies rather than sending
 * an empty "nothing to do" email every day.
 */
export async function runDigestForAllDueUsers(): Promise<DigestRunResult> {
  const admin = createAdminClient();
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";

  const { data: allSettings, error: settingsError } = await admin
    .from("user_settings")
    .select("*")
    .eq("email_digest_enabled", true);
  if (settingsError) throw new Error(settingsError.message);

  const companies = await fetchDueCompanies();
  const result: DigestRunResult = { sent: 0, skippedEmpty: 0, skippedNotToday: 0, errors: [] };

  if (companies.length === 0) {
    result.skippedEmpty = (allSettings ?? []).length;
    return result;
  }

  const html = buildDigestHtml(companies, appUrl);

  for (const settings of (allSettings ?? []) as UserSettings[]) {
    if (!shouldSendToday(settings)) {
      result.skippedNotToday += 1;
      continue;
    }
    try {
      const { data: userData, error: userError } = await admin.auth.admin.getUserById(
        settings.user_id
      );
      if (userError || !userData?.user?.email) {
        result.errors.push({ userId: settings.user_id, error: userError?.message ?? "No email on file" });
        continue;
      }
      const sendResult = await sendEmail({
        to: userData.user.email,
        subject: `Follow-up digest — ${companies.length} due`,
        html,
      });
      if (sendResult.ok) {
        result.sent += 1;
      } else {
        result.errors.push({ userId: settings.user_id, error: sendResult.error });
      }
    } catch (e) {
      result.errors.push({
        userId: settings.user_id,
        error: e instanceof Error ? e.message : "Unknown error",
      });
    }
  }

  return result;
}

/**
 * Sends one test digest to a single user right now, ignoring their
 * daily/weekly/day-of-week settings — used by the "Send test digest" button
 * on the Settings page so people don't have to wait for the real cron.
 */
export async function sendTestDigestToUser(
  userId: string,
  userEmail: string
): Promise<{ ok: true; companyCount: number } | { ok: false; error: string }> {
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const companies = await fetchDueCompanies();
  const html = buildDigestHtml(companies, appUrl);

  const sendResult = await sendEmail({
    to: userEmail,
    subject: `[Test] Follow-up digest — ${companies.length} due`,
    html,
  });

  if (!sendResult.ok) return { ok: false, error: sendResult.error };
  return { ok: true, companyCount: companies.length };
}
