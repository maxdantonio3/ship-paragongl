import { createClient } from "@/lib/supabase/server";
import { updateUserSettings, sendTestDigest } from "@/actions/settings";
import { createBranch, deleteBranch } from "@/actions/branches";
import { createEquipmentType, deleteEquipmentType } from "@/actions/equipment-types";
import { createLocationType, deleteLocationType } from "@/actions/location-types";
import { createCommodityType, deleteCommodityType } from "@/actions/commodity-types";
import { createPieceType, deletePieceType } from "@/actions/piece-types";
import { createLoadLineItemType, deleteLoadLineItemType } from "@/actions/load-line-item-types";
import { createFactoringCompany, deleteFactoringCompany } from "@/actions/factoring-companies";
import DeleteButton from "@/components/DeleteButton";
import {
  DEFAULT_USER_SETTINGS,
  DAY_OF_WEEK_OPTIONS,
  TIMEZONE_OPTIONS,
  type UserSettings,
  type Branch,
  type EquipmentType,
  type LocationType,
  type CommodityType,
  type PieceType,
  type LoadLineItemType,
  type FactoringCompany,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: {
    error?: string;
    saved?: string;
    digestError?: string;
    digestSent?: string;
    branchError?: string;
    equipmentError?: string;
    locationTypeError?: string;
    commodityTypeError?: string;
    pieceTypeError?: string;
    lineItemTypeError?: string;
    factoringCompanyError?: string;
  };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: existing } = user
    ? await supabase.from("user_settings").select("*").eq("user_id", user.id).maybeSingle()
    : { data: null };

  const { data: branches } = await supabase.from("branches").select("*").order("name");
  const { data: equipmentTypes } = await supabase.from("equipment_types").select("*").order("name");
  const { data: locationTypes } = await supabase.from("location_types").select("*").order("name");
  const { data: commodityTypes } = await supabase.from("commodity_types").select("*").order("name");
  const { data: pieceTypes } = await supabase.from("piece_types").select("*").order("name");
  const { data: lineItemTypes } = await supabase.from("load_line_item_types").select("*").order("name");
  const { data: factoringCompanies } = await supabase.from("factoring_companies").select("*").order("name");

  const settings: UserSettings = {
    user_id: user?.id ?? "",
    created_at: "",
    updated_at: "",
    ...DEFAULT_USER_SETTINGS,
    ...(existing as Partial<UserSettings> | null),
  };

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <h1 className="font-display text-2xl font-medium text-manifest-navy-800 mb-1">Settings</h1>
      <p className="text-sm text-manifest-navy-400 mb-8">
        Most of this is personal to your account. Branches, below, are shared with your whole team.
      </p>

      {searchParams.error && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {searchParams.error}
        </div>
      )}
      {searchParams.saved && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          Settings saved.
        </div>
      )}
      {searchParams.digestError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          Test digest failed: {searchParams.digestError}
        </div>
      )}
      {searchParams.digestSent !== undefined && (
        <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">
          Test digest sent to your email — {searchParams.digestSent} compan
          {searchParams.digestSent === "1" ? "y" : "ies"} due or overdue right now.
        </div>
      )}
      {searchParams.branchError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {searchParams.branchError}
        </div>
      )}
      {searchParams.equipmentError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {searchParams.equipmentError}
        </div>
      )}
      {searchParams.locationTypeError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {searchParams.locationTypeError}
        </div>
      )}
      {searchParams.commodityTypeError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {searchParams.commodityTypeError}
        </div>
      )}
      {searchParams.pieceTypeError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {searchParams.pieceTypeError}
        </div>
      )}
      {searchParams.lineItemTypeError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {searchParams.lineItemTypeError}
        </div>
      )}
      {searchParams.factoringCompanyError && (
        <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {searchParams.factoringCompanyError}
        </div>
      )}

      <form action={updateUserSettings} className="space-y-6">
        <div className="panel p-5">
          <h2 className="font-display text-lg font-medium text-manifest-navy-800 mb-1">
            Follow-up default
          </h2>
          <p className="text-sm text-manifest-navy-400 mb-4">
            When you log an activity without setting a specific follow-up date, a company's{" "}
            <span className="font-medium">Next follow-up</span> is automatically set this many days
            out.
          </p>
          <div className="max-w-[160px]">
            <label className="field-label" htmlFor="default_follow_up_days">
              Days after last activity
            </label>
            <input
              id="default_follow_up_days"
              name="default_follow_up_days"
              type="number"
              min={1}
              max={90}
              defaultValue={settings.default_follow_up_days}
              className="field-input"
            />
          </div>
        </div>

        <div className="panel p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-display text-lg font-medium text-manifest-navy-800">
              Follow-up email digest
            </h2>
            <span className="rounded-full bg-status-customer/10 border border-status-customer/30 px-2.5 py-1 text-[11px] font-medium text-status-customer">
              Live
            </span>
          </div>
          <p className="text-sm text-manifest-navy-400 mb-2">
            Get an email listing companies that are due or overdue for follow-up. Sends once daily
            around 8–9am Eastern, or weekly on your chosen day.
          </p>
          <p className="text-xs text-manifest-navy-400 bg-manifest-navy-50 border border-manifest-line rounded-md px-3 py-2 mb-4">
            <span className="font-semibold">Note on timing:</span> the hosting plan this app runs on
            only allows one scheduled run per day, at an approximate time — not the exact time you
            pick below. The Time/Timezone fields are saved and ready for when precise per-person
            timing is turned on (it needs a small hosting upgrade), but for now everyone gets the
            digest around the same time each morning.
          </p>

          <label className="flex items-center gap-2 mb-4 text-sm font-medium text-manifest-navy-700">
            <input
              type="checkbox"
              name="email_digest_enabled"
              defaultChecked={settings.email_digest_enabled}
              className="rounded border-manifest-line"
            />
            Send me a follow-up digest email
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="field-label" htmlFor="email_digest_frequency">
                Frequency
              </label>
              <select
                id="email_digest_frequency"
                name="email_digest_frequency"
                defaultValue={settings.email_digest_frequency}
                className="field-input"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="email_digest_day_of_week">
                Day (if weekly)
              </label>
              <select
                id="email_digest_day_of_week"
                name="email_digest_day_of_week"
                defaultValue={settings.email_digest_day_of_week ?? 1}
                className="field-input"
              >
                {DAY_OF_WEEK_OPTIONS.map((d) => (
                  <option key={d.value} value={d.value}>
                    {d.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor="email_digest_time">
                Time
              </label>
              <input
                id="email_digest_time"
                name="email_digest_time"
                type="time"
                defaultValue={settings.email_digest_time?.slice(0, 5)}
                className="field-input"
              />
            </div>
          </div>

          <div className="mt-4">
            <label className="field-label" htmlFor="email_digest_timezone">
              Timezone
            </label>
            <select
              id="email_digest_timezone"
              name="email_digest_timezone"
              defaultValue={settings.email_digest_timezone}
              className="field-input max-w-xs"
            >
              {TIMEZONE_OPTIONS.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <button type="submit" className="btn-primary">
          Save settings
        </button>
      </form>

      <div className="panel p-5 mt-6">
        <h2 className="font-display text-base font-medium text-manifest-navy-800 mb-1">
          Test the digest
        </h2>
        <p className="text-sm text-manifest-navy-400 mb-4">
          Send yourself a digest right now, using today's due/overdue companies — this ignores your
          daily/weekly schedule above, so you don't have to wait until tomorrow to check it works.
        </p>
        <form action={sendTestDigest}>
          <button type="submit" className="btn-secondary">
            Send test digest to my email
          </button>
        </form>
      </div>

      <div className="panel p-5 mt-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display text-lg font-medium text-manifest-navy-800">Branches</h2>
          <span className="rounded-full bg-manifest-navy-50 border border-manifest-line px-2.5 py-1 text-[11px] font-medium text-manifest-navy-400">
            Shared with your team
          </span>
        </div>
        <p className="text-sm text-manifest-navy-400 mb-4">
          Optional way to separate companies by division — e.g. Freight vs. E-commerce Fulfillment.
          Entirely opt-in: a company with no branch set works exactly as before, and this doesn't
          change any existing analytics unless you filter by branch.
        </p>

        {branches && branches.length > 0 && (
          <ul className="mb-4 divide-y divide-manifest-line border border-manifest-line rounded-md">
            {(branches as Branch[]).map((b) => (
              <li key={b.id} className="flex items-center justify-between px-3 py-2.5">
                <span className="text-sm text-manifest-navy-700">{b.name}</span>
                <DeleteButton
                  action={deleteBranch.bind(null, b.id)}
                  confirmMessage={`Delete the "${b.name}" branch? Companies assigned to it won't be deleted — they'll just show no branch anymore.`}
                />
              </li>
            ))}
          </ul>
        )}

        <form action={createBranch} className="flex gap-2">
          <input
            name="name"
            required
            placeholder="e.g. Freight, E-commerce Fulfillment"
            className="field-input"
          />
          <button type="submit" className="btn-secondary shrink-0">
            Add branch
          </button>
        </form>
      </div>

      <div className="panel p-5 mt-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display text-lg font-medium text-manifest-navy-800">Equipment types</h2>
          <span className="rounded-full bg-manifest-navy-50 border border-manifest-line px-2.5 py-1 text-[11px] font-medium text-manifest-navy-400">
            Shared with your team
          </span>
        </div>
        <p className="text-sm text-manifest-navy-400 mb-4">
          The list of equipment types carriers can select from on their profile. Add new ones here
          any time — no code changes needed.
        </p>

        {equipmentTypes && equipmentTypes.length > 0 && (
          <ul className="mb-4 divide-y divide-manifest-line border border-manifest-line rounded-md">
            {(equipmentTypes as EquipmentType[]).map((eq) => (
              <li key={eq.id} className="flex items-center justify-between px-3 py-2.5">
                <span className="text-sm text-manifest-navy-700">{eq.name}</span>
                <DeleteButton
                  action={deleteEquipmentType.bind(null, eq.id)}
                  confirmMessage={`Delete "${eq.name}"? Carriers already using it will just lose that tag.`}
                />
              </li>
            ))}
          </ul>
        )}

        <form action={createEquipmentType} className="flex gap-2">
          <input name="name" required placeholder="e.g. Power Only, Double Drop" className="field-input" />
          <button type="submit" className="btn-secondary shrink-0">
            Add equipment type
          </button>
        </form>
      </div>

      <div className="panel p-5 mt-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display text-lg font-medium text-manifest-navy-800">Location types</h2>
          <span className="rounded-full bg-manifest-navy-50 border border-manifest-line px-2.5 py-1 text-[11px] font-medium text-manifest-navy-400">
            Shared with your team
          </span>
        </div>
        <p className="text-sm text-manifest-navy-400 mb-4">
          The list of types a location can be tagged with (Residential, Business with Dock, etc.).
          Add new ones here any time — no code changes needed.
        </p>

        {locationTypes && locationTypes.length > 0 && (
          <ul className="mb-4 divide-y divide-manifest-line border border-manifest-line rounded-md">
            {(locationTypes as LocationType[]).map((lt) => (
              <li key={lt.id} className="flex items-center justify-between px-3 py-2.5">
                <span className="text-sm text-manifest-navy-700">{lt.name}</span>
                <DeleteButton
                  action={deleteLocationType.bind(null, lt.id)}
                  confirmMessage={`Delete "${lt.name}"? Locations already tagged with it will just lose that tag.`}
                />
              </li>
            ))}
          </ul>
        )}

        <form action={createLocationType} className="flex gap-2">
          <input name="name" required placeholder="e.g. Distribution Center" className="field-input" />
          <button type="submit" className="btn-secondary shrink-0">
            Add location type
          </button>
        </form>
      </div>

      <div className="panel p-5 mt-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display text-lg font-medium text-manifest-navy-800">Commodity types</h2>
          <span className="rounded-full bg-manifest-navy-50 border border-manifest-line px-2.5 py-1 text-[11px] font-medium text-manifest-navy-400">
            Shared with your team
          </span>
        </div>
        <p className="text-sm text-manifest-navy-400 mb-4">
          The dropdown options for a load's commodity type (Dry Goods (General), Refrigerated (Food),
          etc.).
        </p>

        {commodityTypes && commodityTypes.length > 0 && (
          <ul className="mb-4 divide-y divide-manifest-line border border-manifest-line rounded-md">
            {(commodityTypes as CommodityType[]).map((ct) => (
              <li key={ct.id} className="flex items-center justify-between px-3 py-2.5">
                <span className="text-sm text-manifest-navy-700">{ct.name}</span>
                <DeleteButton
                  action={deleteCommodityType.bind(null, ct.id)}
                  confirmMessage={`Delete "${ct.name}"? Loads already using it will just lose that tag.`}
                />
              </li>
            ))}
          </ul>
        )}

        <form action={createCommodityType} className="flex gap-2">
          <input name="name" required placeholder="e.g. Hazmat" className="field-input" />
          <button type="submit" className="btn-secondary shrink-0">
            Add commodity type
          </button>
        </form>
      </div>

      <div className="panel p-5 mt-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display text-lg font-medium text-manifest-navy-800">Piece types</h2>
          <span className="rounded-full bg-manifest-navy-50 border border-manifest-line px-2.5 py-1 text-[11px] font-medium text-manifest-navy-400">
            Shared with your team
          </span>
        </div>
        <p className="text-sm text-manifest-navy-400 mb-4">
          The dropdown options for a load's handling units (Pallets, Boxes, Crates, etc.).
        </p>

        {pieceTypes && pieceTypes.length > 0 && (
          <ul className="mb-4 divide-y divide-manifest-line border border-manifest-line rounded-md">
            {(pieceTypes as PieceType[]).map((pt) => (
              <li key={pt.id} className="flex items-center justify-between px-3 py-2.5">
                <span className="text-sm text-manifest-navy-700">{pt.name}</span>
                <DeleteButton
                  action={deletePieceType.bind(null, pt.id)}
                  confirmMessage={`Delete "${pt.name}"? Loads already using it will just lose that tag.`}
                />
              </li>
            ))}
          </ul>
        )}

        <form action={createPieceType} className="flex gap-2">
          <input name="name" required placeholder="e.g. Totes" className="field-input" />
          <button type="submit" className="btn-secondary shrink-0">
            Add piece type
          </button>
        </form>
      </div>

      <div className="panel p-5 mt-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display text-lg font-medium text-manifest-navy-800">Load line item types</h2>
          <span className="rounded-full bg-manifest-navy-50 border border-manifest-line px-2.5 py-1 text-[11px] font-medium text-manifest-navy-400">
            Shared with your team
          </span>
        </div>
        <p className="text-sm text-manifest-navy-400 mb-4">
          The dropdown options for financial line items on a load (Flat Rate, Lumper, Detention,
          etc.).
        </p>

        {lineItemTypes && lineItemTypes.length > 0 && (
          <ul className="mb-4 divide-y divide-manifest-line border border-manifest-line rounded-md">
            {(lineItemTypes as LoadLineItemType[]).map((t) => (
              <li key={t.id} className="flex items-center justify-between px-3 py-2.5">
                <span className="text-sm text-manifest-navy-700">{t.name}</span>
                <DeleteButton
                  action={deleteLoadLineItemType.bind(null, t.id)}
                  confirmMessage={`Delete "${t.name}"? Loads already using it will just lose that tag.`}
                />
              </li>
            ))}
          </ul>
        )}

        <form action={createLoadLineItemType} className="flex gap-2">
          <input name="name" required placeholder="e.g. Pallet Exchange" className="field-input" />
          <button type="submit" className="btn-secondary shrink-0">
            Add line item type
          </button>
        </form>
      </div>

      <div className="panel p-5 mt-6">
        <div className="flex items-center justify-between mb-1">
          <h2 className="font-display text-lg font-medium text-manifest-navy-800">Factoring companies</h2>
          <span className="rounded-full bg-manifest-navy-50 border border-manifest-line px-2.5 py-1 text-[11px] font-medium text-manifest-navy-400">
            Shared with your team
          </span>
        </div>
        <p className="text-sm text-manifest-navy-400 mb-4">
          The list a carrier's factoring company is picked from when their payment method is set to
          Factoring.
        </p>

        {factoringCompanies && factoringCompanies.length > 0 && (
          <ul className="mb-4 divide-y divide-manifest-line border border-manifest-line rounded-md">
            {(factoringCompanies as FactoringCompany[]).map((fc) => (
              <li key={fc.id} className="flex items-center justify-between px-3 py-2.5">
                <span className="text-sm text-manifest-navy-700">{fc.name}</span>
                <DeleteButton
                  action={deleteFactoringCompany.bind(null, fc.id)}
                  confirmMessage={`Delete "${fc.name}"? Carriers already using it will just lose that tag.`}
                />
              </li>
            ))}
          </ul>
        )}

        <form action={createFactoringCompany} className="flex gap-2">
          <input name="name" required placeholder="e.g. RTS Financial" className="field-input" />
          <button type="submit" className="btn-secondary shrink-0">
            Add factoring company
          </button>
        </form>
      </div>
    </div>
  );
}
