import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import CopyableText from "@/components/CopyableText";
import { createClient } from "@/lib/supabase/server";
import type {
  Load,
  TmsCustomer,
  Carrier,
  EquipmentType,
  Location,
  LoadNote,
  CommodityType,
  PieceType,
  LoadLineItemType,
  LoadStop,
  LoadHandlingUnit,
  LoadLineItem,
  LoadDocument,
} from "@/lib/types";
import LoadStatusSelect from "@/components/loads/LoadStatusSelect";
import LoadNotesLog from "@/components/loads/LoadNotesLog";
import LoadDocumentCenter from "@/components/loads/LoadDocumentCenter";
import RateCarrierButton from "@/components/loads/RateCarrierButton";
import DeleteButton from "@/components/DeleteButton";
import { deleteLoad, duplicateLoad } from "@/actions/loads";
import { createLoadNote, deleteLoadNote } from "@/actions/load-notes";
import { getUploaderEmails } from "@/actions/carrier-documents";

export const dynamic = "force-dynamic";

function fmtDate(d: string | null) {
  if (!d) return "Not set";
  try {
    return format(new Date(`${d}T00:00:00`), "MMM d, yyyy");
  } catch {
    return "—";
  }
}

function fmtTime(t: string | null) {
  if (!t) return "";
  try {
    const [h, m] = t.split(":").map(Number);
    const d = new Date();
    d.setHours(h, m);
    return format(d, "h:mm a");
  } catch {
    return t;
  }
}

function fmtStop(stop: LoadStop) {
  if (!stop.date_start) return "Date not set";
  const startDate = fmtDate(stop.date_start);
  const spansMultipleDays = stop.date_end && stop.date_end !== stop.date_start;

  if (!stop.time_start) return startDate;
  if (!stop.time_end) return `${startDate}, ${fmtTime(stop.time_start)}`;
  if (spansMultipleDays) return `${startDate}, ${fmtTime(stop.time_start)} – ${fmtDate(stop.date_end)}, ${fmtTime(stop.time_end)}`;
  return `${startDate}, ${fmtTime(stop.time_start)} – ${fmtTime(stop.time_end)}`;
}

function fmtMoney(v: number | null) {
  return v != null ? `$${Number(v).toFixed(2)}` : "—";
}

export default async function LoadProfilePage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: load } = await supabase.from("loads").select("*").eq("id", params.id).single();
  if (!load) notFound();
  const l = load as Load;

  const [
    { data: customer },
    { data: carrier },
    { data: equipmentType },
    { data: commodityType },
    { data: stops },
    { data: notes },
    { data: handlingUnits },
    { data: lineItems },
    { data: pieceTypes },
    { data: lineItemTypes },
    { data: documents },
  ] = await Promise.all([
    l.customer_id ? supabase.from("tms_customers").select("id, name").eq("id", l.customer_id).maybeSingle() : Promise.resolve({ data: null }),
    l.carrier_id ? supabase.from("carriers").select("id, name, phone, mc_number").eq("id", l.carrier_id).maybeSingle() : Promise.resolve({ data: null }),
    l.equipment_type_id ? supabase.from("equipment_types").select("id, name").eq("id", l.equipment_type_id).maybeSingle() : Promise.resolve({ data: null }),
    l.commodity_type_id ? supabase.from("commodity_types").select("id, name").eq("id", l.commodity_type_id).maybeSingle() : Promise.resolve({ data: null }),
    supabase.from("load_stops").select("*").eq("load_id", l.id).order("sequence"),
    supabase.from("load_notes").select("*").eq("load_id", l.id).order("created_at", { ascending: false }),
    supabase.from("load_handling_units").select("*").eq("load_id", l.id).order("sort_order"),
    supabase.from("load_line_items").select("*").eq("load_id", l.id).order("sort_order"),
    supabase.from("piece_types").select("*"),
    supabase.from("load_line_item_types").select("*"),
    supabase.from("load_documents").select("*").eq("load_id", l.id).order("uploaded_at", { ascending: false }),
  ]);

  const { data: existingRating } = await supabase
    .from("carrier_ratings")
    .select("*")
    .eq("load_id", l.id)
    .order("created_at", { ascending: false })
    .maybeSingle();

  const documentList = (documents as LoadDocument[]) ?? [];
  const uploaderIds = documentList.map((d) => d.uploaded_by).filter(Boolean) as string[];
  const uploaderEmails = await getUploaderEmails(uploaderIds);

  const pieceTypeMap = new Map<string, string>();
  ((pieceTypes as PieceType[]) ?? []).forEach((pt) => pieceTypeMap.set(pt.id, pt.name));
  const lineItemTypeMap = new Map<string, string>();
  ((lineItemTypes as LoadLineItemType[]) ?? []).forEach((t) => lineItemTypeMap.set(t.id, t.name));

  const customerName = (customer as Pick<TmsCustomer, "id" | "name"> | null)?.name ?? "—";
  const carrierInfo = carrier as Pick<Carrier, "id" | "name" | "phone" | "mc_number"> | null;
  const carrierNameVal = carrierInfo?.name ?? "—";

  const pickupStops = ((stops as LoadStop[]) ?? []).filter((s) => s.stop_type === "Pickup");
  const deliveryStops = ((stops as LoadStop[]) ?? []).filter((s) => s.stop_type === "Delivery");

  const incomeItems = ((lineItems as LoadLineItem[]) ?? []).filter((li) => li.side === "income");
  const expenseItems = ((lineItems as LoadLineItem[]) ?? []).filter((li) => li.side === "expense");
  const totalIncome = incomeItems.reduce((sum, li) => sum + Number(li.amount) * li.quantity, 0);
  const totalExpenses = expenseItems.reduce((sum, li) => sum + Number(li.amount) * li.quantity, 0);
  const grossProfit = totalIncome - totalExpenses;
  const grossProfitPct = totalIncome > 0 ? (grossProfit / totalIncome) * 100 : 0;

  const boundDelete = deleteLoad.bind(null, l.id);
  const boundDuplicate = duplicateLoad.bind(null, l.id);
  const boundCreateNote = createLoadNote.bind(null, l.id);
  const boundDeleteNote = deleteLoadNote.bind(null, l.id);

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <Link href="/loads" className="text-sm text-manifest-navy-400 hover:text-manifest-navy-700">
        ← Back to loads
      </Link>

      <div className="flex items-start justify-between gap-4 mt-3 mb-6">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="font-display text-3xl font-medium text-manifest-navy-800 font-mono">Load #{l.load_number}</h1>
            <LoadStatusSelect
              loadId={l.id}
              status={l.status}
              carrierId={l.carrier_id}
              carrierName={carrierNameVal}
              carrierMcNumber={carrierInfo?.mc_number ?? null}
            />
          </div>
          {customer && (
            <p className="text-sm text-manifest-navy-400 mt-1">
              for{" "}
              <Link href={`/tms-customers/${(customer as Pick<TmsCustomer, "id" | "name">).id}`} className="text-manifest-signal hover:underline">
                {customerName}
              </Link>
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <form action={boundDuplicate}>
            <button type="submit" className="btn-secondary text-sm">
              Copy
            </button>
          </form>
          <Link href={`/loads/${l.id}/edit`} className="btn-secondary text-sm">
            Edit
          </Link>
          <DeleteButton action={boundDelete} confirmMessage={`Delete Load #${l.load_number}? This cannot be undone.`} label="Delete" className="btn-danger text-sm" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <StatCard label="Total income" value={fmtMoney(totalIncome)} />
        <StatCard label="Total expenses" value={fmtMoney(totalExpenses)} />
        <StatCard label="Gross profit/loss" value={`${fmtMoney(grossProfit)} (${grossProfitPct.toFixed(1)}%)`} highlight={grossProfit < 0} />
        <StatCard label="Carrier" value={carrierNameVal} isText />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="panel p-5">
            <h2 className="font-display text-lg font-medium text-manifest-navy-800 mb-3">Pickup{pickupStops.length > 1 ? "s" : ""}</h2>
            {pickupStops.length > 0 ? (
              <div className="space-y-3">
                {pickupStops.map((s) => (
                  <StopSummary key={s.id} stop={s} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-manifest-navy-400">Not set</p>
            )}
          </div>

          <div className="panel p-5">
            <h2 className="font-display text-lg font-medium text-manifest-navy-800 mb-3">Deliver{deliveryStops.length > 1 ? "ies" : "y"}</h2>
            {deliveryStops.length > 0 ? (
              <div className="space-y-3">
                {deliveryStops.map((s) => (
                  <StopSummary key={s.id} stop={s} />
                ))}
              </div>
            ) : (
              <p className="text-sm text-manifest-navy-400">Not set</p>
            )}
          </div>

          {(l.driver_name || l.driver_phone) && (
            <div className="panel p-5">
              <h2 className="font-display text-lg font-medium text-manifest-navy-800 mb-3">Driver</h2>
              <div className="text-sm text-manifest-navy-700">{l.driver_name || "—"}</div>
              <div className="text-sm font-mono text-manifest-navy-500 mt-0.5">
                <CopyableText value={l.driver_phone} label="Copy driver phone" />
              </div>
            </div>
          )}

          {l.carrier_id && (
            <div className="panel p-5">
              <h2 className="font-display text-lg font-medium text-manifest-navy-800 mb-3">Carrier rating</h2>
              <RateCarrierButton
                loadId={l.id}
                carrierId={l.carrier_id}
                carrierName={carrierNameVal}
                carrierMcNumber={carrierInfo?.mc_number ?? null}
                existingStars={existingRating?.stars ?? null}
                existingNote={existingRating?.note ?? null}
              />
            </div>
          )}

          <div className="panel p-5">
            <h2 className="font-display text-lg font-medium text-manifest-navy-800 mb-4">Freight details</h2>
            <dl className="space-y-2.5 text-sm">
              <InfoRow label="Equipment">{(equipmentType as Pick<EquipmentType, "id" | "name"> | null)?.name ?? "—"}</InfoRow>
              <InfoRow label="Length">{l.equipment_length || "—"}</InfoRow>
              <InfoRow label="Commodity type">{(commodityType as Pick<CommodityType, "id" | "name"> | null)?.name ?? "—"}</InfoRow>
              <InfoRow label="Commodity">{l.commodity || "—"}</InfoRow>
              <InfoRow label="Weight">{l.weight != null ? `${l.weight} lbs` : "—"}</InfoRow>
              <InfoRow label="Load size">{l.load_size || "—"}</InfoRow>
              <InfoRow label="Declared value">{fmtMoney(l.declared_value)}</InfoRow>
              <InfoRow label="Reference / PO #">{l.po_number || "—"}</InfoRow>
              <InfoRow label="BOL #">{l.bol_number || "—"}</InfoRow>
              <InfoRow label="Freight charge terms">{l.freight_charge_terms || "—"}</InfoRow>
            </dl>

            {handlingUnits && handlingUnits.length > 0 && (
              <div className="mt-4 pt-4 border-t border-manifest-line">
                <div className="field-label mb-2">Handling units</div>
                <ul className="text-sm text-manifest-navy-700 space-y-1">
                  {(handlingUnits as LoadHandlingUnit[]).map((u) => (
                    <li key={u.id}>
                      {u.quantity}× {pieceTypeMap.get(u.piece_type_id ?? "") ?? "Unknown"}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {(l.public_notes || l.private_notes) && (
              <div className="mt-4 pt-4 border-t border-manifest-line space-y-3">
                {l.public_notes && (
                  <div>
                    <div className="field-label mb-1">Public notes</div>
                    <p className="text-sm text-manifest-navy-700 whitespace-pre-wrap">{l.public_notes}</p>
                  </div>
                )}
                {l.private_notes && (
                  <div>
                    <div className="field-label mb-1">Private notes</div>
                    <p className="text-sm text-manifest-navy-700 whitespace-pre-wrap">{l.private_notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {incomeItems.length > 0 && (
            <LineItemsTable title="Income / Budget" companyName={customerName} items={incomeItems} typeMap={lineItemTypeMap} total={totalIncome} totalLabel="Total Income" />
          )}
          {expenseItems.length > 0 && (
            <LineItemsTable title="Expenses" companyName={carrierNameVal} items={expenseItems} typeMap={lineItemTypeMap} total={totalExpenses} totalLabel="Total Expenses" />
          )}
          <LoadDocumentCenter loadId={l.id} documents={documentList} uploaderEmails={uploaderEmails} />
          <LoadNotesLog notes={(notes as LoadNote[]) ?? []} createNote={boundCreateNote} deleteNote={boundDeleteNote} />
        </div>
      </div>
    </div>
  );
}

function StopSummary({ stop }: { stop: LoadStop }) {
  return (
    <div className="text-sm">
      <div className="text-xs text-manifest-navy-400 font-mono">{fmtStop(stop)}</div>
    </div>
  );
}

function LineItemsTable({
  title,
  companyName,
  items,
  typeMap,
  total,
  totalLabel,
}: {
  title: string;
  companyName: string;
  items: LoadLineItem[];
  typeMap: Map<string, string>;
  total: number;
  totalLabel: string;
}) {
  return (
    <div className="panel overflow-hidden">
      <div className="p-4 border-b border-manifest-line">
        <h2 className="font-display text-lg font-medium text-manifest-navy-800">{title}</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-manifest-navy-400 border-b border-manifest-line">
              <th className="px-4 py-2 font-medium">Company</th>
              <th className="px-4 py-2 font-medium">Description</th>
              <th className="px-4 py-2 font-medium">Notes</th>
              <th className="px-4 py-2 font-medium text-right">Rate</th>
              <th className="px-4 py-2 font-medium text-right">Qty</th>
              <th className="px-4 py-2 font-medium text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((li) => (
              <tr key={li.id} className="border-b border-manifest-line last:border-0">
                <td className="px-4 py-2 text-manifest-navy-600 whitespace-nowrap">{companyName}</td>
                <td className="px-4 py-2 text-manifest-navy-700">{typeMap.get(li.type_id ?? "") ?? "Other"}</td>
                <td className="px-4 py-2 text-manifest-navy-500">{li.notes || "—"}</td>
                <td className="px-4 py-2 text-right font-mono text-manifest-navy-700">${Number(li.amount).toFixed(2)}</td>
                <td className="px-4 py-2 text-right font-mono text-manifest-navy-700">{li.quantity}</td>
                <td className="px-4 py-2 text-right font-mono text-manifest-navy-800">${(Number(li.amount) * li.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={5} className="px-4 py-2 text-right text-manifest-navy-500">
                {totalLabel}
              </td>
              <td className="px-4 py-2 text-right font-mono font-medium text-manifest-navy-800">${total.toFixed(2)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

function StatCard({ label, value, isText, highlight }: { label: string; value: string; isText?: boolean; highlight?: boolean }) {
  return (
    <div className={`panel p-4 text-center ${highlight ? "border-red-200 bg-red-50/40" : ""}`}>
      <div className={`font-display font-medium ${isText ? "text-base" : "text-lg font-mono"} ${highlight ? "text-red-600" : "text-manifest-navy-800"}`}>{value}</div>
      <div className="text-xs text-manifest-navy-400 mt-0.5">{label}</div>
    </div>
  );
}

function InfoRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <dt className="text-manifest-navy-400">{label}</dt>
      <dd className="text-manifest-navy-700">{children}</dd>
    </div>
  );
}
