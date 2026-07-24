"use client";

import { useEffect, useRef, useState } from "react";
import type { Point } from "@/lib/scanner/types";

type DragState =
  | { type: "corner"; index: number }
  | { type: "edge"; aIndex: number; bIndex: number; startPointer: Point; startA: Point; startB: Point };

const EDGE_DEFS: [number, number][] = [
  [0, 1], // top
  [1, 2], // right
  [2, 3], // bottom
  [3, 0], // left
];

export default function CropEditor({
  imageUrl,
  onApplyCrop,
  onCancel,
}: {
  imageUrl: string;
  onApplyCrop: (naturalCorners: Point[]) => void;
  onCancel: () => void;
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [displaySize, setDisplaySize] = useState<{ width: number; height: number } | null>(null);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number } | null>(null);
  const [corners, setCorners] = useState<Point[] | null>(null);
  const [drag, setDrag] = useState<DragState | null>(null);

  function handleImageLoad() {
    const img = imgRef.current;
    if (!img) return;
    const rect = img.getBoundingClientRect();
    setDisplaySize({ width: rect.width, height: rect.height });
    setNaturalSize({ width: img.naturalWidth, height: img.naturalHeight });
    setCorners([
      { x: 0, y: 0 },
      { x: rect.width, y: 0 },
      { x: rect.width, y: rect.height },
      { x: 0, y: rect.height },
    ]);
  }

  function pointFromEvent(clientX: number, clientY: number): Point {
    const rect = svgRef.current!.getBoundingClientRect();
    const x = Math.min(Math.max(clientX - rect.left, 0), rect.width);
    const y = Math.min(Math.max(clientY - rect.top, 0), rect.height);
    return { x, y };
  }

  function clampToBounds(p: Point): Point {
    if (!displaySize) return p;
    return {
      x: Math.min(Math.max(p.x, 0), displaySize.width),
      y: Math.min(Math.max(p.y, 0), displaySize.height),
    };
  }

  useEffect(() => {
    if (!drag) return;

    function handleMove(e: PointerEvent) {
      const p = pointFromEvent(e.clientX, e.clientY);
      setCorners((prev) => {
        if (!prev || !drag) return prev;
        const next = [...prev];
        if (drag.type === "corner") {
          next[drag.index] = p;
        } else {
          const dx = p.x - drag.startPointer.x;
          const dy = p.y - drag.startPointer.y;
          next[drag.aIndex] = clampToBounds({ x: drag.startA.x + dx, y: drag.startA.y + dy });
          next[drag.bIndex] = clampToBounds({ x: drag.startB.x + dx, y: drag.startB.y + dy });
        }
        return next;
      });
    }
    function handleUp() {
      setDrag(null);
    }

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", handleUp);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", handleUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag]);

  function resetToFullImage() {
    if (!displaySize) return;
    setCorners([
      { x: 0, y: 0 },
      { x: displaySize.width, y: 0 },
      { x: displaySize.width, y: displaySize.height },
      { x: 0, y: displaySize.height },
    ]);
  }

  function handleApply() {
    if (!corners || !naturalSize || !displaySize) return;
    const scaleX = naturalSize.width / displaySize.width;
    const scaleY = naturalSize.height / displaySize.height;
    onApplyCrop(corners.map((p) => ({ x: p.x * scaleX, y: p.y * scaleY })));
  }

  const polygonPoints = corners?.map((p) => `${p.x},${p.y}`).join(" ") ?? "";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <p className="text-xs text-manifest-navy-400">
          Drag a corner for perspective, or drag a side to straighten it.
        </p>
        <button type="button" onClick={resetToFullImage} className="btn-secondary text-xs px-2.5 py-1.5">
          Reset to full image
        </button>
      </div>

      <div className="relative w-full max-w-lg mx-auto select-none">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          ref={imgRef}
          src={imageUrl}
          alt="Page to crop"
          onLoad={handleImageLoad}
          className="w-full h-auto block rounded-md"
          draggable={false}
        />
        {displaySize && corners && (
          <svg
            ref={svgRef}
            viewBox={`0 0 ${displaySize.width} ${displaySize.height}`}
            className="absolute inset-0 w-full h-full touch-none"
          >
            <polygon
              points={polygonPoints}
              fill="rgba(224,134,46,0.18)"
              stroke="#E0862E"
              strokeWidth={2}
            />

            {EDGE_DEFS.map(([a, b], idx) => {
              const pa = corners[a];
              const pb = corners[b];
              const mid = { x: (pa.x + pb.x) / 2, y: (pa.y + pb.y) / 2 };
              const angle = (Math.atan2(pb.y - pa.y, pb.x - pa.x) * 180) / Math.PI;
              return (
                <rect
                  key={`edge-${idx}`}
                  x={mid.x - 15}
                  y={mid.y - 4}
                  width={30}
                  height={8}
                  rx={3}
                  fill="#ffffff"
                  stroke="#E0862E"
                  strokeWidth={2}
                  transform={`rotate(${angle} ${mid.x} ${mid.y})`}
                  className="cursor-grab"
                  onPointerDown={(e) => {
                    e.preventDefault();
                    (e.target as Element).setPointerCapture?.(e.pointerId);
                    const p = pointFromEvent(e.clientX, e.clientY);
                    setDrag({ type: "edge", aIndex: a, bIndex: b, startPointer: p, startA: pa, startB: pb });
                  }}
                />
              );
            })}

            {corners.map((p, i) => (
              <circle
                key={i}
                cx={p.x}
                cy={p.y}
                r={12}
                fill="#ffffff"
                stroke="#E0862E"
                strokeWidth={3}
                className="cursor-grab"
                onPointerDown={(e) => {
                  e.preventDefault();
                  (e.target as Element).setPointerCapture?.(e.pointerId);
                  setDrag({ type: "corner", index: i });
                }}
              />
            ))}
          </svg>
        )}
      </div>

      <div className="flex gap-2 mt-4">
        <button type="button" onClick={handleApply} className="btn-primary text-sm">
          Apply crop
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary text-sm">
          Cancel
        </button>
      </div>
    </div>
  );
}
