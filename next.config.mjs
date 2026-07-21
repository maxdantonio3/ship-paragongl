"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";

// /tracking/1115 → redirect to /tracking with auto-search
// We store the load number in sessionStorage so the tracking
// page picks it up and auto-submits on load
export default function TrackingDeepLink() {
  const params = useParams();
  const router = useRouter();

  useEffect(() => {
    const loadNumber = params?.loadNumber;
    if (loadNumber && typeof loadNumber === "string") {
      sessionStorage.setItem("pgl_auto_track", decodeURIComponent(loadNumber));
    }
    router.replace("/tracking");
  }, [params, router]);

  return (
    <div className="min-h-screen bg-[#0d1b2e] flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <svg className="animate-spin w-8 h-8 text-white/40" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
        </svg>
        <p className="text-white/40 text-sm">Loading shipment…</p>
      </div>
    </div>
  );
}
