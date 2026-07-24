// Server-only. Sends transactional email via Resend's HTTP API directly —
// no SDK dependency needed for something this simple.

export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string;
  subject: string;
  html: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.DIGEST_FROM_EMAIL;

  if (!apiKey || !from) {
    return {
      ok: false,
      error:
        "Email isn't configured yet — set RESEND_API_KEY and DIGEST_FROM_EMAIL in your environment variables.",
    };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to, subject, html }),
  });

  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.message ?? JSON.stringify(body);
    } catch {
      // ignore parse failure
    }
    return { ok: false, error: detail || `Resend request failed (HTTP ${res.status}).` };
  }

  return { ok: true };
}
