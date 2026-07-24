"use client";

import { useState } from "react";

export default function ClickToCopy({
  value,
  display,
  className = "",
}: {
  value: string;
  display: React.ReactNode;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1200);
    } catch {
      // Clipboard access can fail (e.g. insecure context) — fail silently,
      // the value is still visible via the title tooltip.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={value}
      className={`text-left hover:bg-manifest-navy-50 rounded px-1 -mx-1 transition ${className}`}
    >
      {copied ? <span className="text-status-customer">Copied!</span> : display}
    </button>
  );
}
