import Link from "next/link";
import CompanyForm from "@/components/CompanyForm";
import { createCompany } from "@/actions/companies";
import { createClient } from "@/lib/supabase/server";
import type { Branch } from "@/lib/types";

export default async function NewCompanyPage({
  searchParams,
}: {
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const { data: branches } = await supabase.from("branches").select("*").order("name");
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? "";

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link href="/dashboard" className="text-sm text-manifest-navy-400 hover:text-manifest-navy-700">
        ← Back to dashboard
      </Link>
      <h1 className="font-display text-2xl font-medium text-manifest-navy-800 mt-2 mb-6">
        Add company
      </h1>

      {searchParams.error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {searchParams.error}
        </div>
      )}

      <CompanyForm
        action={createCompany}
        submitLabel="Add company"
        branches={(branches as Branch[]) ?? []}
        googleMapsApiKey={googleMapsApiKey}
      />
    </div>
  );
}
