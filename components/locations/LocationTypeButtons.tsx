"use client";

import { useState } from "react";
import clsx from "clsx";
import type { LocationType } from "@/lib/types";

export default function LocationTypeButtons({
  locationTypes,
  defaultSelectedId,
}: {
  locationTypes: LocationType[];
  defaultSelectedId?: string | null;
}) {
  const [selected, setSelected] = useState<string | null>(defaultSelectedId ?? null);

  if (locationTypes.length === 0) {
    return <p className="text-sm text-manifest-navy-400">No location types set up yet — add some in Settings.</p>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      <input type="hidden" name="location_type_id" value={selected ?? ""} />
      {locationTypes.map((lt) => {
        const isSelected = selected === lt.id;
        return (
          <button
            key={lt.id}
            type="button"
            onClick={() => setSelected(isSelected ? null : lt.id)}
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition select-none",
              isSelected
                ? "border-manifest-signal bg-manifest-signal-50/50 text-manifest-signal-600 font-medium"
                : "border-manifest-line bg-white text-manifest-navy-600 hover:bg-manifest-navy-50"
            )}
          >
            {lt.name}
          </button>
        );
      })}
    </div>
  );
}
