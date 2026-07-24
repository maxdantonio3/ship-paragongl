import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import type { Carrier, CarrierContact, CarrierDocument, CarrierNote, CarrierStats, EquipmentType, CarrierRating } from "@/lib/types";
import CarrierStatusSelect from "@/components/carriers/CarrierStatusSelect";
import CarrierContactList from "@/components/carriers/CarrierContactList";
import CarrierNotesLog from "@/components/carriers/CarrierNotesLog";
import CarrierDocumentCenter from "@/components/carriers/CarrierDocumentCenter";
import CarrierRatingLog from "@/components/carriers/CarrierRatingLog";
import DeleteButton from "@/components/DeleteButton";
import { createCarrierContact, updateCarrierContact, deleteCarrierContact } from "@/actions/carrier-contacts";
import { createCarrierNote, deleteCarrierNote } from "@/actions/carrier-notes";
import { getUploaderEmails } from "@/actions/carrier-documents";
import { deleteCarrier } from "@/actions/carriers";

export const dynamic = "force-dynamic";

function fmtDate(d: string | null) {
  if (!d) return "Never";
  try {
    return format(new Date(d), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

export default async function CarrierProfilePage({ params }: { params: { id: string } }) {
  const supabase = createClient();

  const [
    { data: carrier },
    { data: contacts },
    { data: notes },
    { data: documents },
    { data: stats },
    { data: equipmentLinks },
    { data: allEquipmentTypes },
    { data: ratings },
  ] = await Promise.all([
    supabase.from("carriers").select("*").eq("id", params.id).single(),
    supabase.from("carrier_contacts").select("*").eq("carrier_id", params.id).order("created_at", { ascending: true }),
    supabase.from("carrier_notes").select("*").eq("carrier_id", params.id).order("created_at", { ascending: false }),
    supabase.from("carrier_documents").select("*").eq("carrier_id", params.id).order("uploaded_at", { ascending: false }),
    supabase.from("carrier_stats").select("*").eq("carrier_id", params.id).maybeSingle(),
    supabase.from("carrier_equipment_types").select("equipment_type_id").eq("carrier_id", params.id),
    supabase.from("equipment_types").select("*"),
    supabase.from("carrier_ratings").select("*").eq("carrier_id", params.id).order("created_at", { ascending: false }),
  ]);

  if (!carrier) notFound();

  const c = carrier as Carrier;
  const s = stats as CarrierStats | null;
  const ratingList = (ratings as CarrierRating[]) ?? [];

  const ratingLoadIds = Array.from(new Set(ratingList.map((r) => r.load_id).filter(Boolean))) as string[];
  const loadNumberById: Record<string, number> = {};
  if (ratingLoadIds.length > 0) {
    const { data: ratedLoads } = await supabase.from("loads").select("id, load_number").in("id", ratingLoadIds);
    (ratedLoads ?? []).forEach((l) => {
      loadNumberById[l.id] = l.load_number;
    });
  }

  let factoringCompanyName: string | null = null;
  if (c.factoring_company_id) {
    const { data: fc } = await supabase
      .from("factoring_companies")
      .select("name")
      .eq("id", c.factoring_company_id)
      .maybeSingle();
    factoringCompanyName = fc?.name ?? null;
  }

  const equipmentNameMap = new Map<string, string>();
  ((allEquipmentTypes as EquipmentType[]) ?? []).forEach((e) => equipmentNameMap.set(e.id, e.name));
  const equipmentNames = (equipmentLinks ?? [])
    .map((l) => equipmentNameMap.get(l.equipment_type_id as string))
    .filter(Boolean) as string[];

  const uploaderIds = ((documents as CarrierDocument[]) ?? []).map((d) => d.uploaded_by).filter(Boolean) as string[];
  const uploaderEmails = await getUploaderEmails(uploaderIds);

  const boundCreateContact = createCarrierContact.bind(null, c.id);
  const boundUpdateContact = updateCarrierContact.bind(null, c.id);
  const boundDeleteContact = deleteCarrierContact.bind(null, c.id);
  const boundCreateNote = createCarrierNote.bind(null, c.id);
  const boundDeleteNote = deleteCarrierNote.bind(null, c.id);
  const boundDeleteCarrier = deleteCarrier.bind(null, c.id);

  const insuranceExpired = c.insurance_expiration ? new Date(c.insurance_expiration) < new Date() : false;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <Link href="/carriers" className="text-sm text-manifest-navy-400 hover:text-manifest-navy-700">
        ← Back to carriers
      </Link>

      <div className="flex items-start justify-between gap-4 mt-3 mb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-3xl font-medium text-manifest-navy-800">{c.name}</h1>
            <CarrierStatusSelect carrierId={c.id} status={c.status} />
          </div>
          {(c.mc_number || c.dot_number) && (
            <p className="text-sm text-manifest-navy-400 mt-1 font-mono">
              {c.mc_number && `MC ${c.mc_number}`}
              {c.mc_number && c.dot_number && " · "}
              {c.dot_number && `DOT ${c.dot_number}`}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/carriers/${c.id}/edit`} className="btn-secondary text-sm">
            Edit
          </Link>
          <DeleteButton
            action={boundDeleteCarrier}
            confirmMessage={`Delete ${c.name} and all of its contacts, documents, and notes? This cannot be undone.`}
            label="Delete"
            className="btn-danger text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total loads" value={s?.total_loads ?? 0} />
        <StatCard label="Last used" value={fmtDate(s?.last_used ?? null)} isText />
        <StatCard
          label="Carrier rating"
          value={s?.avg_rating != null ? `★ ${s.avg_rating.toFixed(1)} (${s.rating_count})` : "No ratings yet"}
          isText
        />
        <StatCard
          label="Insurance exp."
          value={fmtDate(c.insurance_expiration)}
          isText
          highlight={insuranceExpired}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="panel p-5">
            <h2 className="font-display text-lg font-medium text-manifest-navy-800 mb-4">Carrier information</h2>
            <dl className="space-y-3 text-sm">
              <InfoRow label="Address">
                {c.address ? (
                  <>
                    {c.address}
                    <br />
                    {[c.city, c.state, c.zip].filter(Boolean).join(", ")}
                  </>
                ) : (
                  [c.city, c.state, c.zip].filter(Boolean).join(", ") || "—"
                )}
              </InfoRow>
              <InfoRow label="Phone">
                <span className="font-mono">{c.phone || "—"}</span>
              </InfoRow>
              <InfoRow label="Email">{c.email || "—"}</InfoRow>
              <InfoRow label="Tax ID">{c.tax_id || "—"}</InfoRow>
              <InfoRow label="Payment method">
                {c.payment_method === "Factoring" ? `Factoring — ${factoringCompanyName ?? "—"}` : c.payment_method || "—"}
              </InfoRow>
            </dl>

            {(c.public_notes || c.private_notes) && (
              <div className="mt-4 pt-4 border-t border-manifest-line space-y-3">
                {c.public_notes && (
                  <div>
                    <div className="field-label mb-1">Public notes</div>
                    <p className="text-sm text-manifest-navy-700 whitespace-pre-wrap">{c.public_notes}</p>
                  </div>
                )}
                {c.private_notes && (
                  <div>
                    <div className="field-label mb-1">Private notes</div>
                    <p className="text-sm text-manifest-navy-700 whitespace-pre-wrap">{c.private_notes}</p>
                  </div>
                )}
              </div>
            )}

            <div className="mt-4 pt-4 border-t border-manifest-line">
              <div className="field-label mb-2">Equipment types</div>
              {equipmentNames.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {equipmentNames.map((name) => (
                    <span
                      key={name}
                      className="text-xs font-medium text-manifest-navy-600 bg-manifest-navy-50 border border-manifest-line rounded-full px-2.5 py-0.5"
                    >
                      {name}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-manifest-navy-400">None set</p>
              )}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <CarrierContactList
            contacts={(contacts as CarrierContact[]) ?? []}
            mainPhone={c.phone}
            mainEmail={c.email}
            createContact={boundCreateContact}
            updateContact={boundUpdateContact}
            deleteContact={boundDeleteContact}
          />
          <CarrierDocumentCenter carrierId={c.id} documents={(documents as CarrierDocument[]) ?? []} uploaderEmails={uploaderEmails} />
          <CarrierRatingLog carrierId={c.id} ratings={ratingList} loadNumberById={loadNumberById} />
          <CarrierNotesLog
            notes={(notes as CarrierNote[]) ?? []}
            createNote={boundCreateNote}
            deleteNote={boundDeleteNote}
          />
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  isText,
  highlight,
}: {
  label: string;
  value: number | string;
  isText?: boolean;
  highlight?: boolean;
}) {
  return (
    <div className={`panel p-4 text-center ${highlight ? "border-red-200 bg-red-50/40" : ""}`}>
      <div
        className={`font-display font-medium ${isText ? "text-base" : "text-2xl"} ${
          highlight ? "text-red-600" : "text-manifest-navy-800"
        }`}
      >
        {value}
      </div>
      <div className="text-xs text-manifest-navy-400 mt-0.5">{label}</div>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      <dt className="text-manifest-navy-400 col-span-1">{label}</dt>
      <dd className="col-span-2 text-manifest-navy-700">{children}</dd>
    </div>
  );
}
