"use client";

import { useRef, useState } from "react";
import { ACCEPTED_IMAGE_TYPES, isHeicFile } from "@/lib/scanner/image-utils";

export default function UploadDropzone({
  onFilesSelected,
  compact = false,
}: {
  onFilesSelected: (files: File[]) => void;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  function handleFiles(fileList: FileList | null) {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList).filter(
      (f) =>
        f.type.startsWith("image/") ||
        isHeicFile(f) ||
        /\.(jpe?g|png|webp|heic|heif)$/i.test(f.name)
    );
    if (files.length > 0) onFilesSelected(files);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`rounded-lg border-2 border-dashed text-center transition cursor-pointer ${
        dragOver
          ? "border-manifest-signal bg-manifest-signal-50/40"
          : "border-manifest-line bg-white hover:bg-manifest-navy-50/40"
      } ${compact ? "p-4" : "p-10"}`}
      onClick={() => inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept={ACCEPTED_IMAGE_TYPES}
        className="hidden"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <UploadIcon className={compact ? "w-6 h-6 mx-auto mb-2" : "w-9 h-9 mx-auto mb-3"} />
      {compact ? (
        <p className="text-sm font-medium text-manifest-navy-700">
          Add more pages — drag & drop or tap to choose
        </p>
      ) : (
        <>
          <p className="font-display text-base font-medium text-manifest-navy-800 mb-1">
            Drag & drop document photos here
          </p>
          <p className="text-sm text-manifest-navy-400">
            or tap to choose files — JPG, PNG, WebP, or HEIC, any number of pages
          </p>
        </>
      )}
    </div>
  );
}

function UploadIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className={`text-manifest-navy-300 ${props.className ?? ""}`}>
      <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M17 8l-5-5-5 5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M12 3v12" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
