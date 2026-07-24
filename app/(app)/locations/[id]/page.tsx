import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Location, LocationType, LocationContact } from "@/lib/types";
import DeleteButton from "@/components/DeleteButton";
import LocationContactList from "@/components/locations/LocationContactList";
import { deleteLocation } from "@/actions/locations";
import { createLocationContact, updateLocationContact, deleteLocationContact } from "@/actions/location-contacts";

export const dynamic = "force-dynamic";

export default async function LocationProfilePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const [{ data: location }, { data: contacts }] = await Promise.all([
    supabase.from("locations").select("*").eq("id", params.id).single(),
    supabase.from("location_contacts").select("*").eq("location_id", params.id).order("created_at", { ascending: true }),
  ]);

  if (!location) notFound();
  const loc = location as Location;

  let locationType: LocationType | null = null;
  if (loc.location_type_id) {
    const { data } = await supabase.from("location_types").select("*").eq("id", loc.location_type_id).maybeSingle();
    locationType = data as LocationType | null;
  }

  const boundDelete = deleteLocation.bind(null, loc.id);
  const boundCreateContact = createLocationContact.bind(null, loc.id);
  const boundUpdateContact = updateLocationContact.bind(null, loc.id);
  const boundDeleteContact = deleteLocationContact.bind(null, loc.id);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/locations" className="text-sm text-manifest-navy-400 hover:text-manifest-navy-700">
        ← Back to locations
      </Link>

      <div className="flex items-start justify-between gap-4 mt-3 mb-6">
        <div>
          <h1 className="font-display text-3xl font-medium text-manifest-navy-800">{loc.name}</h1>
          {locationType && (
            <span className="inline-block mt-1 text-xs font-medium text-manifest-navy-600 bg-manifest-navy-50 border border-manifest-line rounded-full px-2.5 py-0.5">
              {locationType.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Link href={`/locations/${loc.id}/edit`} className="btn-secondary text-sm">
            Edit
          </Link>
          <DeleteButton
            action={boundDelete}
            confirmMessage={`Delete ${loc.name}? Loads already pointing to it will keep their history but lose this reference.`}
            label="Delete"
            className="btn-danger text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="panel p-5">
            <dl className="space-y-3 text-sm">
              <InfoRow label="Address">
                {loc.address ? (
                  <>
                    {loc.address}
                    <br />
                    {[loc.city, loc.state, loc.zip].filter(Boolean).join(", ")}
                  </>
                ) : (
                  [loc.city, loc.state, loc.zip].filter(Boolean).join(", ") || "—"
                )}
              </InfoRow>
              <InfoRow label="Contact">{loc.contact_name || "—"}</InfoRow>
              <InfoRow label="Phone">
                <span className="font-mono">{loc.contact_phone || "—"}</span>
              </InfoRow>
              <InfoRow label="Email">{loc.contact_email || "—"}</InfoRow>
            </dl>

            {loc.notes && (
              <div className="mt-4 pt-4 border-t border-manifest-line">
                <div className="field-label mb-1">Notes</div>
                <p className="text-sm text-manifest-navy-700 whitespace-pre-wrap">{loc.notes}</p>
              </div>
            )}

            {(loc.public_notes || loc.private_notes) && (
              <div className="mt-4 pt-4 border-t border-manifest-line space-y-3">
                {loc.public_notes && (
                  <div>
                    <div className="field-label mb-1">Public notes</div>
                    <p className="text-sm text-manifest-navy-700 whitespace-pre-wrap">{loc.public_notes}</p>
                  </div>
                )}
                {loc.private_notes && (
                  <div>
                    <div className="field-label mb-1">Private notes</div>
                    <p className="text-sm text-manifest-navy-700 whitespace-pre-wrap">{loc.private_notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2">
          <LocationContactList
            contacts={(contacts as LocationContact[]) ?? []}
            createContact={boundCreateContact}
            updateContact={boundUpdateContact}
            deleteContact={boundDeleteContact}
          />
        </div>
      </div>
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
