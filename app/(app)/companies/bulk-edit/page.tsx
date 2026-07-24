import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import BulkEditTable from "@/components/BulkEditTable";
import type { Branch, Company } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function BulkEditPage() {
  const supabase = createClient();

  const [{ data: companies }, { data: branches }] = await Promise.all([
    supabase.from("companies").select("*").order("name"),
    supabase.from("branches").select("*").order("name"),
  ]);

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link href="/dashboard" className="text-sm text-manifest-navy-400 hover:text-manifest-navy-700">
        ← Back to dashboard
      </Link>
      <h1 className="font-display text-2xl font-medium text-manifest-navy-800 mt-2 mb-1">
        Bulk edit
      </h1>
      <p className="text-sm text-manifest-navy-400 mb-6">
        Change status or branch across many companies at once. Select rows and use "Apply" to set a
        value for all of them, or edit any row individually — nothing saves until you click "Save
        changes."
      </p>

      <BulkEditTable companies={(companies as Company[]) ?? []} branches={(branches as Branch[]) ?? []} />
    </div>
  );
}
