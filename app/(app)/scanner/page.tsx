import Link from "next/link";
import ScannerApp from "@/components/scanner/ScannerApp";

export default function ScannerPage() {
  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link href="/dashboard" className="text-sm text-manifest-navy-400 hover:text-manifest-navy-700">
        ← Back to dashboard
      </Link>
      <h1 className="font-display text-2xl font-medium text-manifest-navy-800 mt-2 mb-1">
        Document Scanner
      </h1>
      <p className="text-sm text-manifest-navy-400 mb-6">
        Turn photos of freight documents into one clean, compressed PDF — entirely in your browser.
        Nothing is uploaded anywhere unless you choose to save the file yourself.
      </p>

      <ScannerApp />
    </div>
  );
}
