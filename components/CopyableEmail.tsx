"use client";

import { useState } from "react";

export default function CopyableEmail({ email }: { email: string | null }) {
  const [copied, setCopied] = useState(false);

  if (!email) return <span className="text-manifest-navy-400">—</span>;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(email as string);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable — fail silently, the email is still selectable text
    }
  }

  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <span className="truncate">{email}</span>
      <button
        type="button"
        onClick={handleCopy}
        title={copied ? "Copied!" : "Copy email"}
        aria-label="Copy email"
        className="shrink-0 text-manifest-navy-300 hover:text-manifest-signal transition"
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </button>
    </div>
  );
}

function CopyIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" className="w-3.5 h-3.5">
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="w-3.5 h-3.5 text-status-customer"
    >
      <path d="M20 6L9 17l-5-5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
