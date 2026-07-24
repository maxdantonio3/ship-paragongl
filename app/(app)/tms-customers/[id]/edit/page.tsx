import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import TmsCustomerForm from "@/components/tms-customers/TmsCustomerForm";
import { updateTmsCustomer } from "@/actions/tms-customers";
import type { TmsCustomer } from "@/lib/types";

export default async function EditTmsCustomerPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const [{ data: customer }, { data: contacts }] = await Promise.all([
    supabase.from("tms_customers").select("*").eq("id", params.id).single(),
    supabase.from("tms_customer_contacts").select("*").eq("tms_customer_id", params.id).order("created_at"),
  ]);

  if (!customer) notFound();

  const boundAction = updateTmsCustomer.bind(null, params.id);
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? "";

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href={`/tms-customers/${params.id}`} className="text-sm text-manifest-navy-400 hover:text-manifest-navy-700">
        ← Back to customer
      </Link>
      <h1 className="font-display text-2xl font-medium text-manifest-navy-800 mt-2 mb-6">
        Edit {(customer as TmsCustomer).name}
      </h1>

      {searchParams.error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {searchParams.error}
        </div>
      )}

      <TmsCustomerForm
        action={boundAction}
        defaultValues={customer as TmsCustomer}
        submitLabel="Save changes"
        showImport={false}
        googleMapsApiKey={googleMapsApiKey}
        defaultContacts={contacts ?? []}
      />
    </div>
  );
}
