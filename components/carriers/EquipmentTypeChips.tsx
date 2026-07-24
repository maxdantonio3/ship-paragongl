"use client";

import { useState } from "react";
import clsx from "clsx";
import type { EquipmentType } from "@/lib/types";

export default function EquipmentTypeChips({
  equipmentTypes,
  defaultSelectedIds = [],
}: {
  equipmentTypes: EquipmentType[];
  defaultSelectedIds?: string[];
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set(defaultSelectedIds));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (equipmentTypes.length === 0) {
    return (
      <p className="text-sm text-manifest-navy-400">
        No equipment types set up yet — add some in Settings.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-2">
      {equipmentTypes.map((eq) => {
        const isSelected = selected.has(eq.id);
        return (
          <label
            key={eq.id}
            className={clsx(
              "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm cursor-pointer transition select-none",
              isSelected
                ? "border-manifest-signal bg-manifest-signal-50/50 text-manifest-signal-600 font-medium"
                : "border-manifest-line bg-white text-manifest-navy-600 hover:bg-manifest-navy-50"
            )}
          >
            <input
              type="checkbox"
              name="equipment_type_id"
              value={eq.id}
              checked={isSelected}
              onChange={() => toggle(eq.id)}
              className="sr-only"
            />
            {eq.name}
          </label>
        );
      })}
    </div>
  );
}
