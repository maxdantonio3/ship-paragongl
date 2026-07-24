"use client";

import { useEffect, useMemo, useState } from "react";
import {
  LOAD_STATUSES,
  LOAD_SIZES,
  EQUIPMENT_LENGTHS,
  type Load,
  type TmsCustomer,
  type Carrier,
  type EquipmentType,
  type Location,
  type CommodityType,
  type PieceType,
  type LoadLineItemType,
  type LoadHandlingUnit,
  type LoadLineItem,
  type LoadStop,
} from "@/lib/types";
import { getCarrierContactsForLoad } from "@/actions/carriers";
import clsx from "clsx";

const FREIGHT_CHARGE_TERMS = ["Prepaid", "Collect", "3rd Party"] as const;

interface DraftStop {
  key: string;
  stop_type: "Pickup" | "Delivery";
  location_id: string;
  date_start: string;
  date_end: string;
  time_start: string;
  time_end: string;
  isWindow: boolean;
  isMultiDay: boolean;
  notes: string;
  contact_name: string;
  contact_phone: string;
  contactTouched: boolean;
}
interface DraftHandlingUnit {
  key: string;
  piece_type_id: string;
  quantity: string;
}
interface DraftLineItem {
  key: string;
  type_id: string;
  quantity: string;
  amount: string;
  notes: string;
  include_on_paperwork: boolean;
}

function newStop(stopType: "Pickup" | "Delivery"): DraftStop {
  return {
    key: crypto.randomUUID(),
    stop_type: stopType,
    location_id: "",
    date_start: "",
    date_end: "",
    time_start: "",
    time_end: "",
    isWindow: false,
    isMultiDay: false,
    notes: "",
    contact_name: "",
    contact_phone: "",
    contactTouched: false,
  };
}
function newUnit(): DraftHandlingUnit {
  return { key: crypto.randomUUID(), piece_type_id: "", quantity: "1" };
}
function newLineItem(defaultTypeId = ""): DraftLineItem {
  return { key: crypto.randomUUID(), type_id: defaultTypeId, quantity: "1", amount: "", notes: "", include_on_paperwork: true };
}

export default function LoadForm({
  action,
  defaultValues,
  submitLabel = "Save load",
  customers,
  carriers,
  equipmentTypes,
  locations,
  commodityTypes,
  pieceTypes,
  lineItemTypes,
  defaultStops = [],
  defaultHandlingUnits = [],
  defaultLineItems = [],
}: {
  action: (formData: FormData) => void;
  defaultValues?: Partial<Load>;
  submitLabel?: string;
  customers: TmsCustomer[];
  carriers: Carrier[];
  equipmentTypes: EquipmentType[];
  locations: Location[];
  commodityTypes: CommodityType[];
  pieceTypes: PieceType[];
  lineItemTypes: LoadLineItemType[];
  defaultStops?: LoadStop[];
  defaultHandlingUnits?: LoadHandlingUnit[];
  defaultLineItems?: LoadLineItem[];
}) {
  const defaultCommodityTypeId =
    defaultValues?.commodity_type_id ?? commodityTypes.find((c) => c.name === "Dry Goods (General)")?.id ?? "";

  const [customerId, setCustomerId] = useState(defaultValues?.customer_id ?? "");
  const [poNumber, setPoNumber] = useState(defaultValues?.po_number ?? "");
  const [pickupNumber, setPickupNumber] = useState(defaultValues?.bol_number ?? "");
  const [usePoForPickupNumber, setUsePoForPickupNumber] = useState(false);
  const [carrierId, setCarrierId] = useState(defaultValues?.carrier_id ?? "");
  const [driverName, setDriverName] = useState(defaultValues?.driver_name ?? "");
  const [driverPhone, setDriverPhone] = useState(defaultValues?.driver_phone ?? "");
  const [carrierContacts, setCarrierContacts] = useState<{ id: string; name: string; phone: string | null; position: string }[]>(
    []
  );
  const [selectedDriverContactId, setSelectedDriverContactId] = useState("");

  const customerName = customers.find((c) => c.id === customerId)?.name ?? "—";
  const carrierName = carriers.find((c) => c.id === carrierId)?.name ?? "—";

  useEffect(() => {
    if (!carrierId) {
      setCarrierContacts([]);
      return;
    }
    let cancelled = false;
    getCarrierContactsForLoad(carrierId).then((contacts) => {
      if (!cancelled) setCarrierContacts(contacts);
    });
    return () => {
      cancelled = true;
    };
  }, [carrierId]);

  function handlePickDriverContact(contactId: string) {
    setSelectedDriverContactId(contactId);
    const contact = carrierContacts.find((c) => c.id === contactId);
    if (contact) {
      setDriverName(contact.name);
      setDriverPhone(contact.phone ?? "");
    }
  }

  const [stops, setStops] = useState<DraftStop[]>(
    defaultStops.length > 0
      ? defaultStops.map((s) => ({
          key: s.id,
          stop_type: s.stop_type,
          location_id: s.location_id ?? "",
          date_start: s.date_start ?? "",
          date_end: s.date_end ?? "",
          time_start: s.time_start ?? "",
          time_end: s.time_end ?? "",
          isWindow: !!s.time_end,
          isMultiDay: !!s.date_end && s.date_end !== s.date_start,
          notes: s.notes ?? "",
          contact_name: s.contact_name ?? "",
          contact_phone: s.contact_phone ?? "",
          contactTouched: !!(s.contact_name || s.contact_phone),
        }))
      : [newStop("Pickup"), newStop("Delivery")]
  );
  const pickupStops = stops.filter((s) => s.stop_type === "Pickup");
  const deliveryStops = stops.filter((s) => s.stop_type === "Delivery");

  function updateStop(key: string, patch: Partial<DraftStop>) {
    setStops((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }
  function removeStop(key: string) {
    setStops((prev) => prev.filter((s) => s.key !== key));
  }
  function selectStopLocation(key: string, locationId: string) {
    const loc = locations.find((l) => l.id === locationId);
    setStops((prev) =>
      prev.map((s) => {
        if (s.key !== key) return s;
        // Auto-fill contact info from the location, but never overwrite
        // something already typed in manually for this stop.
        if (s.contactTouched) return { ...s, location_id: locationId };
        return { ...s, location_id: locationId, contact_name: loc?.contact_name ?? "", contact_phone: loc?.contact_phone ?? "" };
      })
    );
  }

  const [units, setUnits] = useState<DraftHandlingUnit[]>(
    defaultHandlingUnits.length > 0
      ? defaultHandlingUnits.map((u) => ({ key: u.id, piece_type_id: u.piece_type_id ?? "", quantity: String(u.quantity) }))
      : [newUnit()]
  );

  const flatRateTypeId = lineItemTypes.find((t) => t.name === "Flat Rate")?.id ?? "";

  const [incomeLineItems, setIncomeLineItems] = useState<DraftLineItem[]>(
    defaultLineItems.filter((l) => l.side === "income").length > 0
      ? defaultLineItems
          .filter((l) => l.side === "income")
          .map((l) => ({
            key: l.id,
            type_id: l.type_id ?? "",
            quantity: String(l.quantity),
            amount: String(l.amount),
            notes: l.notes ?? "",
            include_on_paperwork: l.include_on_paperwork,
          }))
      : [newLineItem(flatRateTypeId)]
  );
  const [expenseLineItems, setExpenseLineItems] = useState<DraftLineItem[]>(
    defaultLineItems.filter((l) => l.side === "expense").length > 0
      ? defaultLineItems
          .filter((l) => l.side === "expense")
          .map((l) => ({
            key: l.id,
            type_id: l.type_id ?? "",
            quantity: String(l.quantity),
            amount: String(l.amount),
            notes: l.notes ?? "",
            include_on_paperwork: l.include_on_paperwork,
          }))
      : []
  );

  const totalIncome = useMemo(
    () => incomeLineItems.reduce((sum, li) => sum + (Number(li.amount) || 0) * (Number(li.quantity) || 1), 0),
    [incomeLineItems]
  );
  const totalExpenses = useMemo(
    () => expenseLineItems.reduce((sum, li) => sum + (Number(li.amount) || 0) * (Number(li.quantity) || 1), 0),
    [expenseLineItems]
  );
  const grossProfit = totalIncome - totalExpenses;
  const grossProfitPct = totalIncome > 0 ? (grossProfit / totalIncome) * 100 : 0;

  return (
    <form action={action} className="space-y-6">
      {/* ===================== LOAD DETAILS ===================== */}
      <div className="panel p-5">
        <h2 className="font-display text-lg font-medium text-manifest-navy-800 mb-4">Load details</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="field-label" htmlFor="status">
              Status
            </label>
            <select id="status" name="status" defaultValue={defaultValues?.status ?? "Quoted"} className="field-input">
              {LOAD_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="customer_id">
              Customer
            </label>
            <select
              id="customer_id"
              name="customer_id"
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="field-input"
            >
              <option value="">— Select a customer —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="equipment_type_id">
              Equipment type
            </label>
            <select
              id="equipment_type_id"
              name="equipment_type_id"
              defaultValue={defaultValues?.equipment_type_id ?? ""}
              className="field-input"
            >
              <option value="">— None —</option>
              {equipmentTypes.map((eq) => (
                <option key={eq.id} value={eq.id}>
                  {eq.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="field-label mb-1.5">Equipment length</label>
            <EquipmentLengthButtons defaultValue={defaultValues?.equipment_length ?? null} />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="po_number">
              Reference / PO number
            </label>
            <input
              id="po_number"
              name="po_number"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
              className="field-input"
              placeholder="Will appear on the Load Confirmation and BOL"
            />
          </div>
        </div>

        <div className="border-t border-manifest-line pt-4">
          <h3 className="text-sm font-semibold text-manifest-navy-700 mb-3">Freight details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="field-label" htmlFor="commodity_type_id">
                Commodity type
              </label>
              <select id="commodity_type_id" name="commodity_type_id" defaultValue={defaultCommodityTypeId} className="field-input">
                {commodityTypes.map((ct) => (
                  <option key={ct.id} value={ct.id}>
                    {ct.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="commodity">
                Commodity
              </label>
              <input
                id="commodity"
                name="commodity"
                defaultValue={defaultValues?.commodity ?? ""}
                className="field-input"
                placeholder="Dry goods, produce, etc."
              />
            </div>
            <div>
              <label className="field-label" htmlFor="weight">
                Weight (lbs)
              </label>
              <input id="weight" name="weight" type="number" step="any" defaultValue={defaultValues?.weight ?? ""} className="field-input" />
            </div>
            <div>
              <label className="field-label" htmlFor="declared_value">
                Declared load value ($)
              </label>
              <input
                id="declared_value"
                name="declared_value"
                type="number"
                step="0.01"
                defaultValue={defaultValues?.declared_value ?? ""}
                className="field-input"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="field-label mb-1.5">Load size</label>
              <SingleSelectButtons name="load_size" options={LOAD_SIZES} defaultValue={defaultValues?.load_size ?? "Full"} />
            </div>
          </div>

          <div className="flex items-center justify-between mb-2">
            <label className="field-label mb-0">Handling units</label>
            <button type="button" onClick={() => setUnits((prev) => [...prev, newUnit()])} className="btn-secondary text-xs px-3 py-1.5">
              + Add unit
            </button>
          </div>
          <div className="space-y-2">
            {units.map((unit) => (
              <div key={unit.key} className="grid grid-cols-[1fr_120px_auto] gap-2 items-center">
                <select
                  name="handling_unit_type_id"
                  value={unit.piece_type_id}
                  onChange={(e) => setUnits((prev) => prev.map((u) => (u.key === unit.key ? { ...u, piece_type_id: e.target.value } : u)))}
                  className="field-input text-sm"
                >
                  <option value="">— Piece type —</option>
                  {pieceTypes.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.name}
                    </option>
                  ))}
                </select>
                <input
                  name="handling_unit_quantity"
                  type="number"
                  min={1}
                  value={unit.quantity}
                  onChange={(e) => setUnits((prev) => prev.map((u) => (u.key === unit.key ? { ...u, quantity: e.target.value } : u)))}
                  className="field-input text-sm"
                  placeholder="Qty"
                />
                {units.length > 1 && (
                  <button type="button" onClick={() => setUnits((prev) => prev.filter((u) => u.key !== unit.key))} className="text-manifest-navy-300 hover:text-red-500 text-sm px-1">
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-manifest-line pt-4 mt-4">
          <h3 className="text-sm font-semibold text-manifest-navy-700 mb-3">Notes</h3>
          <div className="space-y-3">
            <div>
              <label className="field-label" htmlFor="public_notes">
                Public load notes
              </label>
              <textarea
                id="public_notes"
                name="public_notes"
                rows={2}
                defaultValue={defaultValues?.public_notes ?? ""}
                className="field-input"
                placeholder="Appears on the Load Confirmation and BOL"
              />
            </div>
            <div>
              <label className="field-label" htmlFor="private_notes">
                Private load notes
              </label>
              <textarea
                id="private_notes"
                name="private_notes"
                rows={2}
                defaultValue={defaultValues?.private_notes ?? ""}
                className="field-input"
                placeholder="Only viewable by your organization"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ===================== PICKUP & DELIVERY ===================== */}
      <div className="panel p-5">
        <h2 className="font-display text-lg font-medium text-manifest-navy-800 mb-4">Pickup & delivery</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-manifest-navy-700">Pickup{pickupStops.length > 1 ? "s" : ""}</h3>
              <button type="button" onClick={() => setStops((prev) => [...prev, newStop("Pickup")])} className="btn-secondary text-xs px-2.5 py-1.5">
                + Add stop
              </button>
            </div>
            <div className="space-y-3">
              {pickupStops.map((stop) => (
                <StopCard key={stop.key} stop={stop} locations={locations} onChange={(patch) => updateStop(stop.key, patch)} onSelectLocation={(locId) => selectStopLocation(stop.key, locId)} onRemove={pickupStops.length > 1 ? () => removeStop(stop.key) : undefined} />
              ))}
            </div>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-manifest-navy-700">Deliver{deliveryStops.length > 1 ? "ies" : "y"}</h3>
              <button type="button" onClick={() => setStops((prev) => [...prev, newStop("Delivery")])} className="btn-secondary text-xs px-2.5 py-1.5">
                + Add stop
              </button>
            </div>
            <div className="space-y-3">
              {deliveryStops.map((stop) => (
                <StopCard key={stop.key} stop={stop} locations={locations} onChange={(patch) => updateStop(stop.key, patch)} onSelectLocation={(locId) => selectStopLocation(stop.key, locId)} onRemove={deliveryStops.length > 1 ? () => removeStop(stop.key) : undefined} />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-4">
          <label className="field-label" htmlFor="bol_number">
            Pickup #
          </label>
          <input
            id="bol_number"
            name="bol_number"
            value={usePoForPickupNumber ? poNumber : pickupNumber}
            onChange={(e) => setPickupNumber(e.target.value)}
            readOnly={usePoForPickupNumber}
            className="field-input max-w-xs read-only:bg-manifest-navy-50 read-only:text-manifest-navy-400"
          />
          <label className="flex items-center gap-1.5 text-xs text-manifest-navy-600 mt-1.5">
            <input type="checkbox" checked={usePoForPickupNumber} onChange={(e) => setUsePoForPickupNumber(e.target.checked)} />
            Use Load Reference / PO # from above
          </label>
        </div>
        {locations.length === 0 && (
          <p className="text-xs text-manifest-navy-400 mt-3">
            No locations yet —{" "}
            <a href="/locations/new" target="_blank" className="text-manifest-signal hover:underline">
              add one
            </a>{" "}
            first, then come back and pick it here.
          </p>
        )}

        {stops.map((stop) => (
          <span key={stop.key}>
            <input type="hidden" name="stop_type" value={stop.stop_type} />
            <input type="hidden" name="stop_location_id" value={stop.location_id} />
            <input type="hidden" name="stop_date_start" value={stop.date_start} />
            <input type="hidden" name="stop_date_end" value={stop.isMultiDay ? stop.date_end : ""} />
            <input type="hidden" name="stop_time_start" value={stop.time_start} />
            <input type="hidden" name="stop_time_end" value={stop.isWindow ? stop.time_end : ""} />
            <input type="hidden" name="stop_notes" value={stop.notes} />
            <input type="hidden" name="stop_contact_name" value={stop.contact_name} />
            <input type="hidden" name="stop_contact_phone" value={stop.contact_phone} />
          </span>
        ))}
      </div>

      {/* ===================== CARRIER & DRIVER ===================== */}
      <div className="panel p-5">
        <h2 className="font-display text-lg font-medium text-manifest-navy-800 mb-4">Carrier & driver</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="field-label" htmlFor="carrier_id">
              Carrier
            </label>
            <select
              id="carrier_id"
              name="carrier_id"
              value={carrierId}
              onChange={(e) => {
                setCarrierId(e.target.value);
                setSelectedDriverContactId("");
              }}
              className="field-input"
            >
              <option value="">— Not yet assigned —</option>
              {carriers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          {carrierContacts.length > 0 && (
            <div>
              <label className="field-label">Pick a driver from contacts</label>
              <select value={selectedDriverContactId} onChange={(e) => handlePickDriverContact(e.target.value)} className="field-input">
                <option value="">— Pick from carrier's contacts —</option>
                {carrierContacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.position})
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="field-label">Driver name</label>
            <input name="driver_name" value={driverName} onChange={(e) => setDriverName(e.target.value)} className="field-input" />
          </div>
          <div>
            <label className="field-label">Driver phone</label>
            <input name="driver_phone" value={driverPhone} onChange={(e) => setDriverPhone(e.target.value)} className="field-input" />
          </div>
        </div>
      </div>

      {/* ===================== FINANCIAL ===================== */}
      <div className="space-y-4">
        <LineItemPanel
          title="Income / Budget"
          companyLabel={customerName}
          items={incomeLineItems}
          setItems={setIncomeLineItems}
          lineItemTypes={lineItemTypes}
          fieldPrefix="income"
          total={totalIncome}
          totalLabel="Total Income"
          defaultTypeId={flatRateTypeId}
          actionButtons={
            <>
              <button type="button" disabled title="Coming soon" className="btn-secondary text-xs px-2.5 py-1.5 opacity-50 cursor-not-allowed">
                View Customer Confirmation
              </button>
              <button type="button" disabled title="Coming soon" className="btn-secondary text-xs px-2.5 py-1.5 opacity-50 cursor-not-allowed">
                View Invoice
              </button>
            </>
          }
        />
        <LineItemPanel
          title="Expenses"
          companyLabel={carrierName}
          items={expenseLineItems}
          setItems={setExpenseLineItems}
          lineItemTypes={lineItemTypes}
          fieldPrefix="expense"
          total={totalExpenses}
          totalLabel="Total Expenses"
          actionButtons={
            <button type="button" disabled title="Coming soon" className="btn-secondary text-xs px-2.5 py-1.5 opacity-50 cursor-not-allowed">
              View Carrier Confirmation
            </button>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="panel p-5">
            <label className="field-label mb-1.5">Freight charge terms</label>
            <SingleSelectButtons name="freight_charge_terms" options={FREIGHT_CHARGE_TERMS} defaultValue={defaultValues?.freight_charge_terms ?? "Prepaid"} />
          </div>
          <div className="panel p-5">
            <dl className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <dt className="text-manifest-navy-400">Total Income</dt>
                <dd className="font-mono text-manifest-navy-800">${totalIncome.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-manifest-navy-400">Total Expenditures</dt>
                <dd className="font-mono text-manifest-navy-800">${totalExpenses.toFixed(2)}</dd>
              </div>
              <div className="flex justify-between pt-1.5 border-t border-manifest-line">
                <dt className="text-manifest-navy-400">Gross Profit/Loss</dt>
                <dd className={clsx("font-mono font-medium", grossProfit < 0 ? "text-red-600" : "text-status-customer")}>
                  ${grossProfit.toFixed(2)}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-manifest-navy-400">Gross Profit/Loss %</dt>
                <dd className={clsx("font-mono font-medium", grossProfit < 0 ? "text-red-600" : "text-status-customer")}>
                  {grossProfitPct.toFixed(2)}%
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button type="submit" className="btn-primary">
          {submitLabel}
        </button>
      </div>
    </form>
  );
}

function LineItemPanel({
  title,
  companyLabel,
  items,
  setItems,
  lineItemTypes,
  fieldPrefix,
  total,
  totalLabel,
  actionButtons,
  defaultTypeId = "",
}: {
  title: string;
  companyLabel: string;
  items: DraftLineItem[];
  setItems: React.Dispatch<React.SetStateAction<DraftLineItem[]>>;
  lineItemTypes: LoadLineItemType[];
  fieldPrefix: "income" | "expense";
  total: number;
  totalLabel: string;
  actionButtons: React.ReactNode;
  defaultTypeId?: string;
}) {
  const side = fieldPrefix === "income" ? "income" : "expense";
  return (
    <div className="panel overflow-hidden">
      <div className="flex items-center justify-between gap-3 flex-wrap p-4 border-b border-manifest-line">
        <div className="flex items-center gap-3">
          <h3 className="font-display text-base font-medium text-manifest-navy-800">{title}</h3>
          <button type="button" onClick={() => setItems((prev) => [...prev, newLineItem(defaultTypeId)])} className="text-xs text-manifest-signal hover:underline">
            + Add Line Item
          </button>
        </div>
        <div className="flex gap-2">{actionButtons}</div>
      </div>

      {items.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-manifest-navy-400 border-b border-manifest-line">
                <th className="px-4 py-2 font-medium">Company</th>
                <th className="px-4 py-2 font-medium">Description</th>
                <th className="px-4 py-2 font-medium">Notes</th>
                <th className="px-4 py-2 font-medium text-right">Rate</th>
                <th className="px-4 py-2 font-medium text-right">Quantity</th>
                <th className="px-4 py-2 font-medium text-right">Total</th>
                <th className="px-4 py-2 font-medium">&nbsp;</th>
              </tr>
            </thead>
            <tbody>
              {items.map((li) => {
                const lineTotal = (Number(li.amount) || 0) * (Number(li.quantity) || 1);
                return (
                  <tr key={li.key} className="border-b border-manifest-line last:border-0">
                    <td className="px-4 py-2 text-manifest-navy-600 whitespace-nowrap">{companyLabel}</td>
                    <td className="px-4 py-2">
                      <select
                        name={`line_item_type_id`}
                        value={li.type_id}
                        onChange={(e) => setItems((prev) => prev.map((l) => (l.key === li.key ? { ...l, type_id: e.target.value } : l)))}
                        className="field-input text-sm py-1"
                      >
                        <option value="">— Type —</option>
                        {lineItemTypes.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      <input type="hidden" name="line_item_side" value={side} />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        name="line_item_notes"
                        value={li.notes}
                        onChange={(e) => setItems((prev) => prev.map((l) => (l.key === li.key ? { ...l, notes: e.target.value } : l)))}
                        className="field-input text-sm py-1"
                        placeholder="Notes"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        name="line_item_amount"
                        type="number"
                        step="0.01"
                        value={li.amount}
                        onChange={(e) => setItems((prev) => prev.map((l) => (l.key === li.key ? { ...l, amount: e.target.value } : l)))}
                        className="field-input text-sm py-1 text-right"
                        placeholder="0.00"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input
                        name="line_item_quantity"
                        type="number"
                        min={1}
                        value={li.quantity}
                        onChange={(e) => setItems((prev) => prev.map((l) => (l.key === li.key ? { ...l, quantity: e.target.value } : l)))}
                        className="field-input text-sm py-1 text-right"
                      />
                    </td>
                    <td className="px-4 py-2 text-right font-mono text-manifest-navy-700 whitespace-nowrap">${lineTotal.toFixed(2)}</td>
                    <td className="px-4 py-2">
                      <div className="flex items-center gap-2">
                        <label title="Include on paperwork (invoices/RCs)" className="flex items-center">
                          <input
                            type="checkbox"
                            checked={li.include_on_paperwork}
                            onChange={(e) => setItems((prev) => prev.map((l) => (l.key === li.key ? { ...l, include_on_paperwork: e.target.checked } : l)))}
                          />
                        </label>
                        <input type="hidden" name="line_item_include_on_paperwork" value={String(li.include_on_paperwork)} />
                        <button type="button" onClick={() => setItems((prev) => prev.filter((l) => l.key !== li.key))} className="text-manifest-navy-300 hover:text-red-500">
                          ✕
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={5} className="px-4 py-2 text-right text-sm text-manifest-navy-500">
                  {totalLabel}
                </td>
                <td className="px-4 py-2 text-right font-mono font-medium text-manifest-navy-800">${total.toFixed(2)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
      {items.length === 0 && <p className="text-sm text-manifest-navy-400 p-4">No line items yet.</p>}
    </div>
  );
}

function EquipmentLengthButtons({ defaultValue }: { defaultValue: string | null }) {
  const [selected, setSelected] = useState<string | null>(defaultValue);
  return (
    <div className="flex flex-wrap gap-2">
      <input type="hidden" name="equipment_length" value={selected ?? ""} />
      {EQUIPMENT_LENGTHS.map((len) => (
        <button
          key={len}
          type="button"
          onClick={() => setSelected(selected === len ? null : len)}
          className={clsx(
            "rounded-full border px-3 py-1.5 text-sm transition",
            selected === len ? "border-manifest-signal bg-manifest-signal-50/50 text-manifest-signal-600 font-medium" : "border-manifest-line bg-white text-manifest-navy-600 hover:bg-manifest-navy-50"
          )}
        >
          {len}
        </button>
      ))}
    </div>
  );
}

function SingleSelectButtons({ name, options, defaultValue }: { name: string; options: readonly string[]; defaultValue: string | null }) {
  const [selected, setSelected] = useState<string | null>(defaultValue);
  return (
    <div className="flex flex-wrap gap-2">
      <input type="hidden" name={name} value={selected ?? ""} />
      {options.map((opt) => (
        <button
          key={opt}
          type="button"
          onClick={() => setSelected(opt)}
          className={clsx(
            "rounded-full border px-3 py-1.5 text-sm transition",
            selected === opt ? "border-manifest-signal bg-manifest-signal-50/50 text-manifest-signal-600 font-medium" : "border-manifest-line bg-white text-manifest-navy-600 hover:bg-manifest-navy-50"
          )}
        >
          {opt}
        </button>
      ))}
    </div>
  );
}

function StopCard({
  stop,
  locations,
  onChange,
  onSelectLocation,
  onRemove,
}: {
  stop: DraftStop;
  locations: Location[];
  onChange: (patch: Partial<DraftStop>) => void;
  onSelectLocation: (locationId: string) => void;
  onRemove?: () => void;
}) {
  return (
    <div className="border border-manifest-line rounded-md p-3 bg-manifest-navy-50/30">
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[160px]">
          <label className="field-label text-[11px]">Location</label>
          <select value={stop.location_id} onChange={(e) => onSelectLocation(e.target.value)} className="field-input text-sm">
            <option value="">— Select —</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
        </div>
        <div className="w-36">
          <label className="field-label text-[11px]">Date</label>
          <input type="date" value={stop.date_start} onChange={(e) => onChange({ date_start: e.target.value })} className="field-input text-sm" />
        </div>
        <div className="w-28">
          <label className="field-label text-[11px]">{stop.isWindow ? "Start" : "Time"}</label>
          <input type="time" value={stop.time_start} onChange={(e) => onChange({ time_start: e.target.value })} className="field-input text-sm" />
        </div>
        {stop.isWindow && (
          <div className="w-28">
            <label className="field-label text-[11px]">End</label>
            <input type="time" value={stop.time_end} onChange={(e) => onChange({ time_end: e.target.value })} className="field-input text-sm" />
          </div>
        )}
        {stop.isMultiDay && (
          <div className="w-36">
            <label className="field-label text-[11px]">End date</label>
            <input type="date" value={stop.date_end} onChange={(e) => onChange({ date_end: e.target.value })} className="field-input text-sm" />
          </div>
        )}
        {onRemove && (
          <button type="button" onClick={onRemove} className="text-manifest-navy-300 hover:text-red-500 text-sm px-1 mb-1.5">
            ✕
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-2 mt-2">
        <div className="flex-1 min-w-[140px]">
          <label className="field-label text-[11px]">Contact name</label>
          <input
            value={stop.contact_name}
            onChange={(e) => onChange({ contact_name: e.target.value, contactTouched: true })}
            className="field-input text-sm"
            placeholder="Auto-fills from location"
          />
        </div>
        <div className="flex-1 min-w-[140px]">
          <label className="field-label text-[11px]">Contact phone</label>
          <input
            value={stop.contact_phone}
            onChange={(e) => onChange({ contact_phone: e.target.value, contactTouched: true })}
            className="field-input text-sm"
            placeholder="Auto-fills from location"
          />
        </div>
      </div>

      <div className="mt-2">
        <label className="field-label text-[11px]">Stop notes (public — shows on documents)</label>
        <input
          value={stop.notes}
          onChange={(e) => onChange({ notes: e.target.value })}
          className="field-input text-sm"
          placeholder="e.g. Ref #4521 delivers here"
        />
      </div>

      <div className="flex items-center gap-4 mt-2">
        <label className="flex items-center gap-1.5 text-xs text-manifest-navy-600">
          <input type="checkbox" checked={stop.isWindow} onChange={(e) => onChange({ isWindow: e.target.checked })} />
          Time window
        </label>
        <label className="flex items-center gap-1.5 text-xs text-manifest-navy-600">
          <input type="checkbox" checked={stop.isMultiDay} onChange={(e) => onChange({ isMultiDay: e.target.checked })} />
          Spans multiple days
        </label>
      </div>
    </div>
  );
}
