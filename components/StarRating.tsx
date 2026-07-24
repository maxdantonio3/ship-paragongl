"use client";

import { useState } from "react";

export default function StarRating({
  value,
  onChange,
  size = "lg",
}: {
  value: number;
  onChange: (stars: number) => void;
  size?: "lg" | "sm";
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  const display = hovered ?? value;
  const starSize = size === "lg" ? "text-3xl" : "text-base";

  return (
    <div className="flex items-center gap-1" onMouseLeave={() => setHovered(null)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          className={`${starSize} leading-none transition-colors ${
            n <= display ? "text-yellow-400" : "text-manifest-navy-200"
          }`}
          aria-label={`${n} star${n === 1 ? "" : "s"}`}
        >
          ★
        </button>
      ))}
    </div>
  );
}
