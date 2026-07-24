import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import CompanyForm from "@/components/CompanyForm";
import { updateCompany } from "@/actions/companies";
import type { Branch, Company } from "@/lib/types";

export default async function EditCompanyPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { error?: string };
}) {
  const supabase = createClient();
  const [{ data: company }, { data: branches }] = await Promise.all([
    supabase.from("companies").select("*").eq("id", params.id).single(),
    supabase.from("branches").select("*").order("name"),
  ]);

  if (!company) notFound();

  const boundAction = updateCompany.bind(null, params.id);
  const googleMapsApiKey = process.env.GOOGLE_MAPS_API_KEY ?? "";

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <Link
        href={`/companies/${params.id}`}
        className="text-sm text-manifest-navy-400 hover:text-manifest-navy-700"
      >
        ← Back to profile
      </Link>
      <h1 className="font-display text-2xl font-medium text-manifest-navy-800 mt-2 mb-6">
        Edit {(company as Company).name}
      </h1>

      {searchParams.error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {searchParams.error}
        </div>
      )}

      <CompanyForm
        action={boundAction}
        defaultValues={company as Company}
        submitLabel="Save changes"
        showImport={false}
        branches={(branches as Branch[]) ?? []}
        googleMapsApiKey={googleMapsApiKey}
      />
    </div>
  );
}
