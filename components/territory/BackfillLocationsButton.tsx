"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { backfillCompanyLocations, type BackfillResult } from "@/actions/territory";

export default function BackfillLocationsButton({ missingCount }: { missingCount: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<BackfillResult | null>(null);

  if (missingCount === 0) return null;

  function handleClick() {
    setResult(null);
    startTransition(async () => {
      const res = await backfillCompanyLocations();
      setResult(res);
      router.refresh();
    });
  }

  return (
    <div className="panel p-4 mb-5 border-manifest-signal-100 bg-manifest-signal-50/30">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <p className="text-sm font-medium text-manifest-navy-800">
            {missingCount} {missingCount === 1 ? "company doesn't" : "companies don't"} have a saved
            location yet
          </p>
          <p className="text-xs text-manifest-navy-400 mt-0.5">
            These were added before location tracking existed. We can look each one up by its saved
            name and address using the same Google search already used on the Add Company form —
            this makes one real search per company (up to 40 per click).
          </p>
        </div>
        <button type="button" onClick={handleClick} disabled={isPending} className="btn-secondary shrink-0">
          {isPending ? "Looking up locations…" : "Fill in missing locations"}
        </button>
      </div>

      {result && (
        <div className="mt-3 pt-3 border-t border-manifest-line text-sm">
          <p className="text-status-customer font-medium">
            Updated {result.updated} of {result.attempted} attempted.
          </p>
          {result.notFound.length > 0 && (
            <p className="text-manifest-navy-400 mt-1">
              Couldn't confidently match: {result.notFound.join(", ")}
            </p>
          )}
          {result.errors.length > 0 && (
            <p className="text-red-600 mt-1">
              Errors: {result.errors.map((e) => `${e.name} (${e.error})`).join("; ")}
            </p>
          )}
          {result.remaining > 0 && (
            <p className="text-manifest-navy-500 mt-1">
              {result.remaining} more remaining — click the button again to keep going.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
