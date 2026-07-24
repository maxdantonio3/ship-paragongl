"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function TerritoryError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.error("[territory] page error:", error);
  }, [error]);

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <Link href="/dashboard" className="text-sm text-manifest-navy-400 hover:text-manifest-navy-700">
        ← Back to dashboard
      </Link>
      <div className="panel p-5 mt-4">
        <h1 className="font-display text-lg font-medium text-manifest-navy-800 mb-2">
          Territory Map hit an error
        </h1>
        <p className="text-sm text-manifest-navy-500 mb-4">
          {error.message || "Something went wrong loading the map."} The rest of the app is
          unaffected — this only broke this page.
        </p>
        <button type="button" onClick={reset} className="btn-primary text-sm">
          Try again
        </button>
      </div>
    </div>
  );
}
