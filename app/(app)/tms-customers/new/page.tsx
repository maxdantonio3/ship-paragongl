import Link from "next/link";
import TmsCustomerForm from "@/components/tms-customers/TmsCustomerForm";
import { createTmsCustomer } from "@/actions/tms-customers";

export default function NewTmsCustomerPage({ searchParams }: { searchParams: { error?: string } }) {
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? "";
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href="/tms-customers" className="text-sm text-manifest-navy-400 hover:text-manifest-navy-700">
        ← Back to customers
      </Link>
      <h1 className="font-display text-2xl font-medium text-manifest-navy-800 mt-2 mb-6">Add customer</h1>

      {searchParams.error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {searchParams.error}
        </div>
      )}

      <TmsCustomerForm action={createTmsCustomer} submitLabel="Add customer" googleMapsApiKey={googleMapsApiKey} />
    </div>
  );
}
