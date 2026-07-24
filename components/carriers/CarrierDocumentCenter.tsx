"use client";

import { useRef, useState, useTransition } from "react";
import { format } from "date-fns";
import { CARRIER_DOCUMENT_TYPES, type CarrierDocument, type CarrierDocumentType } from "@/lib/types";
import { uploadCarrierDocument, getCarrierDocumentUrl, deleteCarrierDocument } from "@/actions/carrier-documents";
import DeleteButton from "@/components/DeleteButton";

const SINGLE_SLOT_TYPES = CARRIER_DOCUMENT_TYPES.filter((t) => t !== "Other");

export default function CarrierDocumentCenter({
  carrierId,
  documents,
  uploaderEmails,
}: {
  carrierId: string;
  documents: CarrierDocument[];
  uploaderEmails: Record<string, string>;
}) {
  const [isPending, startTransition] = useTransition();
  const [uploadingKey, setUploadingKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [otherDescription, setOtherDescription] = useState("");
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const currentByType = new Map<CarrierDocumentType, CarrierDocument>();
  documents.forEach((doc) => {
    if (doc.document_type === "Other") return;
    const existing = currentByType.get(doc.document_type);
    if (!existing || new Date(doc.uploaded_at) > new Date(existing.uploaded_at)) {
      currentByType.set(doc.document_type, doc);
    }
  });

  const otherDocuments = documents
    .filter((d) => d.document_type === "Other")
    .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());

  function handleFileChange(key: string, type: CarrierDocumentType, file: File | undefined, description?: string) {
    if (!file) return;
    setError(null);
    setUploadingKey(key);
    const formData = new FormData();
    formData.set("file", file);
    formData.set("document_type", type);
    if (description) formData.set("description", description);
    startTransition(async () => {
      const result = await uploadCarrierDocument(carrierId, formData);
      setUploadingKey(null);
      if (!result.ok) setError(result.error);
      else setOtherDescription("");
    });
  }

  async function handleView(doc: CarrierDocument) {
    const url = await getCarrierDocumentUrl(doc.file_path);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else setError("Couldn't generate a link for this file.");
  }

  async function handleDownload(doc: CarrierDocument) {
    const url = await getCarrierDocumentUrl(doc.file_path, true);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
    else setError("Couldn't generate a download link for this file.");
  }

  return (
    <div className="panel p-5">
      <h2 className="font-display text-lg font-medium text-manifest-navy-800 mb-4">Document Center</h2>

      {error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SINGLE_SLOT_TYPES.map((type) => {
          const doc = currentByType.get(type);
          const uploading = uploadingKey === type && isPending;

          return (
            <div key={type} className="border border-manifest-line rounded-md p-3.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-medium text-manifest-navy-800">{type}</span>
                {doc && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-status-customer bg-status-customer/10 border border-status-customer/30 rounded-full px-2 py-0.5">
                    ✓ Complete
                  </span>
                )}
              </div>
              {doc ? (
                <div className="text-xs text-manifest-navy-400 mt-1 break-words">
                  {doc.file_name} · {format(new Date(doc.uploaded_at), "MMM d, yyyy")}
                  {uploaderEmails[doc.uploaded_by ?? ""] ? ` by ${uploaderEmails[doc.uploaded_by ?? ""]}` : ""}
                </div>
              ) : (
                <div className="text-xs text-manifest-navy-400 mt-1">Not uploaded yet</div>
              )}
              <div className="flex items-center gap-3 mt-2.5 flex-wrap">
                <input
                  ref={(el) => {
                    fileInputRefs.current[type] = el;
                  }}
                  type="file"
                  className="hidden"
                  onChange={(e) => handleFileChange(type, type, e.target.files?.[0])}
                />
                <button
                  type="button"
                  onClick={() => fileInputRefs.current[type]?.click()}
                  disabled={uploading}
                  className="btn-secondary text-xs px-2.5 py-1.5"
                >
                  {uploading ? "Uploading…" : doc ? "Replace" : "Upload"}
                </button>
                {doc && (
                  <>
                    <button type="button" onClick={() => handleView(doc)} className="text-xs text-manifest-signal hover:underline">
                      View
                    </button>
                    <button type="button" onClick={() => handleDownload(doc)} className="text-xs text-manifest-signal hover:underline">
                      Download
                    </button>
                    <DeleteButton
                      action={() => deleteCarrierDocument(carrierId, doc.id, doc.file_path)}
                      confirmMessage={`Delete ${doc.file_name}? This removes the file entirely.`}
                    />
                  </>
                )}
              </div>
            </div>
          );
        })}

        {otherDocuments.map((doc) => (
          <div key={doc.id} className="border border-manifest-line rounded-md p-3.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-manifest-navy-800">
                {doc.description || "Other document"}
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-status-customer bg-status-customer/10 border border-status-customer/30 rounded-full px-2 py-0.5">
                ✓ Complete
              </span>
            </div>
            <div className="text-xs text-manifest-navy-400 mt-1 break-words">
              {doc.file_name} · {format(new Date(doc.uploaded_at), "MMM d, yyyy")}
              {uploaderEmails[doc.uploaded_by ?? ""] ? ` by ${uploaderEmails[doc.uploaded_by ?? ""]}` : ""}
            </div>
            <div className="flex items-center gap-3 mt-2.5 flex-wrap">
              <input
                ref={(el) => {
                  fileInputRefs.current[doc.id] = el;
                }}
                type="file"
                className="hidden"
                onChange={(e) => handleFileChange(doc.id, "Other", e.target.files?.[0], doc.description ?? undefined)}
              />
              <button
                type="button"
                onClick={() => fileInputRefs.current[doc.id]?.click()}
                disabled={uploadingKey === doc.id && isPending}
                className="btn-secondary text-xs px-2.5 py-1.5"
              >
                {uploadingKey === doc.id && isPending ? "Uploading…" : "Replace"}
              </button>
              <button type="button" onClick={() => handleView(doc)} className="text-xs text-manifest-signal hover:underline">
                View
              </button>
              <button type="button" onClick={() => handleDownload(doc)} className="text-xs text-manifest-signal hover:underline">
                Download
              </button>
              <DeleteButton
                action={() => deleteCarrierDocument(carrierId, doc.id, doc.file_path)}
                confirmMessage={`Delete ${doc.file_name}? This removes the file entirely.`}
              />
            </div>
          </div>
        ))}

        {/* Slot for adding a brand new "Other" document */}
        <div className="border border-dashed border-manifest-line rounded-md p-3.5">
          <span className="text-sm font-medium text-manifest-navy-800">Add another document</span>
          <p className="text-xs text-manifest-navy-400 mt-1">
            For anything that doesn't fit the categories above — give it a label so it's easy to find
            later.
          </p>
          <input
            type="text"
            value={otherDescription}
            onChange={(e) => setOtherDescription(e.target.value)}
            placeholder="e.g. Signed lease agreement"
            className="field-input text-xs mt-2.5"
          />
          <input
            ref={(el) => {
              fileInputRefs.current["new-other"] = el;
            }}
            type="file"
            className="hidden"
            onChange={(e) => handleFileChange("new-other", "Other", e.target.files?.[0], otherDescription)}
          />
          <button
            type="button"
            onClick={() => fileInputRefs.current["new-other"]?.click()}
            disabled={uploadingKey === "new-other" && isPending}
            className="btn-secondary text-xs px-2.5 py-1.5 mt-2.5"
          >
            {uploadingKey === "new-other" && isPending ? "Uploading…" : "+ Upload document"}
          </button>
        </div>
      </div>
    </div>
  );
}
