# Paragon Nexus — Paragon Global Logistics Portal

An internal prospect/customer relationship portal: company profiles, contacts,
outreach activity, and notes. No deal pipeline, stages, or revenue tracking —
just a clean record of who you've talked to and what happened.

Built with Next.js 14 (App Router), Supabase (Postgres + Auth), and Tailwind.

## Branding

The Paragon Nexus logo lives at `public/paragon-nexus-logo.png` (cropped
tight, transparent background). It's used in three places:
- The sidebar header (desktop) — shown in white against the navy panel
- The mobile top bar and slide-in menu — same white treatment
- The login page — full color on the left brand panel (also inverted to
  white there since that panel is navy) and centered above the form on
  mobile

To swap in an updated logo later, just replace that file — as long as the
new file has a similar aspect ratio, no code changes are needed. If you
want the full-color version to show anywhere (e.g. on a white background),
skip the `brightness-0 invert` classes on that `<Image>`.

## What's included (Phase 1 + 2, Phase 3 scaffolded)

**Phase 1**
- Email/password authentication (Supabase Auth), all routes protected
- Company profile CRUD (name, status, industry, address, phone, email,
  website, Google Maps link, notes summary, date added, last contacted)
- Contacts nested inside each company (add/edit/delete)
- Activity log (Email / Call / In-Person Visit / Other, with optional
  contact + follow-up date)
- Notes log (timestamped, newest first)
- Dashboard table: search, filter by status, sort by name/city/last
  contacted/date added
- Status system (Cold / Warm / Quoting / Customer), editable from the
  dashboard and the profile page

**Phase 2**
- Analytics page: outreach touches today/week/month/year, companies added
  today/week/month/year, activity breakdown by type, companies by status,
  recently contacted, and companies not contacted in 30+ days
- `last_contacted_date` is updated automatically by a database trigger the
  moment an activity is logged (see `supabase/schema.sql`) — no app code
  needed to keep it in sync, and it stays correct if an activity's date
  is edited or deleted

**Follow-up tracking (added after Phase 2)**
- Every company has a `next_follow_up_date`, shown prominently on its
  profile page with quick "+7d / +14d / +30d" buttons and a manual date
  picker
- Logging a new activity auto-sets it to N days out (your personal
  default, 7 by default) unless that activity specifies its own
  follow-up date, in which case that wins
- **Settings** page (in the sidebar) lets each person set their own
  default number of days, plus save email-digest preferences (frequency,
  day, time, timezone) for later — see "What's not built yet" below
- Dashboard has a sortable "Follow-up" column and a "Due for follow-up
  only" filter checkbox; Analytics has an "Overdue / Due today" summary
  and list

**If you already ran the original `schema.sql`:** run
`supabase/migration_002_followups.sql` in the SQL Editor instead of
re-running the whole file — it only adds what's new. **If you're setting
up fresh**, the full `schema.sql` already includes this, so you only need
to run that one file.

**Phase 3 — Google Maps import (now wired up)**
- On the "Add company" form, search for a business by name and click a
  result to auto-fill name, address, city, state, zip, phone, website, and
  the Google Maps link. Email is never auto-filled — Google Places doesn't
  expose business email addresses at all, so that field always stays
  manual regardless of provider.
- Requires a `GOOGLE_MAPS_API_KEY` environment variable — see "Setting up
  Google Maps import" below. Until that's set, the search box will show a
  clear error instead of silently failing, and you can still fill in every
  field by hand exactly as before.
- Each search is one request to Google's Places API (New), billed at
  Google's "Enterprise" tier (currently $20 per 1,000 requests) because it
  includes phone and website. Google gives 1,000 Enterprise-tier requests
  free every month — for typical usage (adding companies one at a time)
  this stays at $0/month.

## Setting up Google Maps import

1. Go to [console.cloud.google.com](https://console.cloud.google.com) and
   create a new project (or use an existing one).
2. In the search bar at the top, search for **"Places API (New)"** and
   click **Enable**.
3. Go to **Billing** (left sidebar) and link a billing account — this
   requires a credit card, but as explained above, normal usage for this
   app stays within Google's free monthly allowance.
4. Go to **APIs & Services > Credentials**, click **Create Credentials >
   API key**.
5. Click into the new key and, under **API restrictions**, choose
   **Restrict key** and select only **Places API (New)**. This limits what
   the key can be used for if it's ever exposed.
6. Copy the key and set it as `GOOGLE_MAPS_API_KEY` in your environment
   (locally in `.env.local`, and in your hosting provider's environment
   variables for the deployed app). No `NEXT_PUBLIC_` prefix — this key is
   only ever used server-side and is never sent to the browser.
7. (Optional but recommended) In Google Cloud, go to **Billing > Budgets &
   alerts** and set a budget alert — e.g. $5/month — so you get an email
   if usage ever spikes unexpectedly. This doesn't cap spending, just
   notifies you.

## 1. Set up Supabase

1. Create a free project at [supabase.com](https://supabase.com).
2. In the project dashboard, go to **SQL Editor**, paste in the entire
   contents of `supabase/schema.sql`, and run it. This creates all tables,
   indexes, triggers, the `company_stats` view, and row-level security
   policies.
3. Go to **Authentication > Providers** and make sure **Email** is enabled.
   For an internal tool, you may also want to turn off "Confirm email"
   under **Authentication > Settings** so new teammates can sign in
   immediately after creating an account — or leave it on and just confirm
   via the email link.
4. Go to **Project Settings > API** and copy your **Project URL** and
   **anon public key**.

## 2. Configure the app

```bash
cp .env.local.example .env.local
```

Fill in `.env.local` with the URL and anon key from step 1. Leave
`GOOGLE_MAPS_API_KEY` blank for now if you haven't set up Google Maps
import yet — everything else works fine without it, and you just fill in
company details by hand.

## 3. Install and run locally

```bash
npm install
npm run dev
```

Visit `http://localhost:3000` — you'll land on the login page. Click
"Create one" to make the first account (this is also how any teammate
gets access — there's no separate invite flow yet, so share credentials
or have each person sign up with their own).

## 4. Deploy

The easiest path is [Vercel](https://vercel.com):

1. Push this project to a GitHub repo.
2. Import it in Vercel.
3. Add the environment variables from `.env.local` in the Vercel project
   settings — the two Supabase ones are required; `GOOGLE_MAPS_API_KEY` is
   only needed once you've set up Google Maps import (see above).
4. Deploy.

## Setting up the follow-up email digest

The digest is fully built and wired up — you need to configure four things
for it to actually send mail: an email provider (Resend), a service-role
key from Supabase, a cron secret, and the cron schedule itself (already
committed in `vercel.json`, no action needed there).

**Important limitation, read this first:** this is built assuming you're
on Vercel's **Hobby** (free) plan, which only allows a scheduled job to run
**once per day**, at an approximate time (not an exact minute). So every
subscribed user gets one digest email per day (or once a week, on their
chosen day), around **8–9am Eastern** — regardless of the specific
Time/Timezone they set in Settings. Those fields are saved and the code is
ready to honor them precisely, but doing so needs Vercel Pro ($20/mo),
which unlocks per-minute cron scheduling. If you upgrade later, ask and
this can be tightened up to respect exact times.

1. **Get a Supabase service role key** (lets the digest job read every
   user's settings — the app's normal key only ever sees the signed-in
   user's own data): Supabase dashboard → **Project Settings → API** →
   copy the **`service_role`** key (NOT the `anon` key you already have).
   This is highly sensitive — it bypasses all row-level security. Never
   expose it to the browser or commit it anywhere.
2. **Create a Resend account** at [resend.com](https://resend.com) (free
   tier: 3,000 emails/month, more than enough here).
   - Go to **API Keys** and create one.
   - Go to **Domains** and add/verify a domain you control (e.g.
     `paragongl.com`) so you can send from an address like
     `digest@paragongl.com`. Verification is a DNS record you add wherever
     your domain is registered — Resend walks you through it. Until a
     domain is verified, Resend will only deliver to your own account
     email, which is fine for initial testing but not for your whole team.
3. **Generate a cron secret** — this just needs to be a long random
   string only you know, e.g. run `openssl rand -hex 32` in a terminal, or
   use any password generator. This stops random people from hitting your
   digest endpoint and spamming your team.
4. **Set these environment variables** (locally in `.env.local`, and in
   Vercel → Settings → Environment Variables → Production + Preview):
   - `SUPABASE_SERVICE_ROLE_KEY` — from step 1
   - `RESEND_API_KEY` — from step 2
   - `DIGEST_FROM_EMAIL` — e.g. `Paragon Nexus <digest@paragongl.com>`
     (must use your verified Resend domain)
   - `APP_URL` — your live site's URL, e.g. `https://os.paragongl.com`
     (used to build links inside the email)
   - `CRON_SECRET` — from step 3
5. **Redeploy** so the new variables take effect.
6. **Test it**: sign in, go to **Settings**, check "Send me a follow-up
   digest email," save, then click **"Send test digest to my email."**
   This sends immediately regardless of schedule, so you don't have to
   wait a day to confirm it works.

If the test send fails, the error message on screen will tell you which
piece is missing or misconfigured (bad key, unverified domain, etc.).

## Territory Map (CRM → Territory Map)

**If you already ran the original `schema.sql`:** run
`supabase/migration_005_territory.sql` in the SQL Editor to add the
`latitude`/`longitude` columns. **Fresh installs** already have this in
the main `schema.sql`.

A map of every company that has a saved latitude/longitude, color-coded by
status (Cold=red, Warm=yellow, Quoting=blue, Customer=green), with
clustering for companies near each other and a filter bar. Clicking a
marker shows a card with company details and a link straight to that
company's profile.

**Where coordinates come from:** only from the existing Google Maps
import on the "Add company" form — searching and selecting a business now
also saves its latitude/longitude (previously only address/phone/website
were saved). Companies added by hand (no Places search) won't have
coordinates and simply won't appear on this map — nothing breaks, they're
just not plottable without a location.

**Reuses your existing Google Maps API key** — no second key needed. The
one difference: this page uses the **Maps JavaScript API** (for
rendering the interactive map itself), which is a different API product
from **Places API (New)** (used for the search-and-import feature) even
though both live under the same key. In Google Cloud Console, search for
"Maps JavaScript API" and click **Enable** on the same project/key you
already set up — that's the only extra step.

**On cost:** Maps JavaScript API is priced per map load, with **28,000
free loads every month** — for an internal team checking a map
occasionally, this will realistically never be a paid cost.

**Nothing here calls the Places API again** — the map only ever reads the
latitude/longitude already sitting in Supabase from when each company was
first imported. Opening the map, filtering by status, or clicking a
marker doesn't cost anything or make any external API call.

**If you already have companies with addresses but no coordinates**
(added before this feature existed): the Territory Map page shows a
"Fill in missing locations" button when any exist. It re-searches each
one by its saved name/address through the same Places search already
used on the Add Company form (no new API, no new key) and fills in just
the coordinates — nothing else on the record changes. Processes up to 40
companies per click to keep each run quick and predictable; click again
if you have more than that.

**Finding and importing new prospects right from the map:** there's a
search box floating over the map itself — search for any business by
name, and matches show up both as a dropdown list and as plain
(uncolored) pins on the map, so you can see them relative to your
existing territory. Click the **+** next to a result (in the list, or on
the pin's info card) to open a quick "Add to CRM" form — pick a status
and branch, optionally add an email (Google doesn't provide that), and
it saves as a real company immediately, showing up as a normal colored
marker from then on. This reuses the exact same Places integration as
"Add company" — same key, same cost model, no new setup.

**Clicking on Google's own map labels also works now** — those
built-in business names/icons baked into the map tiles (not something we
control) normally open Google's own default popup. Clicking one now
opens our own card instead, with the same "+ Add to CRM" button, via a
quick lookup by that place's Google ID. One thing worth knowing: unlike
scrolling/zooming/filtering (which are always free), each of these clicks
*is* one real, billed Places lookup — same tier, same cost as a search.
For occasional exploring this stays trivial, but it's a different cost
shape than the rest of the map (which never calls Google at all) — worth
knowing if the team ends up click-happy while browsing.

**Quick-add notes:** the "Add to CRM" modal (from either search results
or clicking a map label) has an optional Notes field — anything typed
there saves into that company's Notes Summary immediately, so first
impressions aren't lost between spotting a business and getting back to
a full profile later.

## Branches (optional divisions)

If you want to separate companies by division — e.g. Freight vs.
E-commerce Fulfillment — go to **Settings** and add a branch under
"Branches." Once at least one branch exists:
- The company add/edit form shows a Branch dropdown (defaults to "No
  branch," so nothing is forced)
- The dashboard shows a Branch column and filter
- Analytics gets a Branch filter at the top, so you can view numbers for
  just one division — leaving it on "All branches" shows the exact same
  totals as before branches existed

If you never add a branch, none of this appears — the app looks and
behaves exactly as it did before this feature existed.

**If you already ran the original `schema.sql`:** run
`supabase/migration_003_branches.sql` in the SQL Editor. **Fresh
installs** already have this in the main `schema.sql`.

## Navigation structure

The sidebar is grouped into CRM / TMS / Billing / Tools / Settings.
Right now only **CRM** (Dashboard, Analytics, Add company) and
**Settings** have real pages behind them — TMS, Billing, and Tools are
shown with a "Soon" label as a placeholder for where those modules would
live if this app grows into a broader platform later. They're not
clickable and don't link anywhere yet.

## Bulk editing

**Bulk edit** (in the sidebar under CRM, and a button on the dashboard)
gives you a spreadsheet-style view for changing Status and Branch across
many companies at once. Select rows with the checkboxes, pick a value in
the "Apply to selected" controls, and it fills in that value for every
selected row — or edit any single row's dropdown directly. Nothing saves
until you click "Save changes," and changed-but-unsaved rows are
highlighted so you can see exactly what you're about to commit.

## Logging the first activity right at creation

Both the full "Add company" form and the Territory Map's quick "Add to
CRM" popup have an optional "Log an activity now" checkbox — useful since
you often add a company at the exact moment you make first contact (a
cold call, or driving by and stopping in). Checking it logs that activity
immediately alongside the new company, which also means
`last_contacted_date` and the auto follow-up date are set correctly right
away instead of sitting blank until someone logs an activity separately
later. On the map popup, it defaults to "In-Person Visit" (the most
common way you'd discover a business while looking at a map) and reuses
whatever you typed in the Notes field, so nothing needs to be typed
twice.

## Quick-logging activity from the dashboard

Each row on the dashboard has a **"+ Log activity"** link that opens a
small form right there — activity type, date, an optional contact from
that company, notes, and an optional follow-up date — without leaving the
dashboard or opening the full profile. Useful if you're making a string
of calls back-to-back. It uses the exact same logic as logging activity
from a company's profile page (including the auto follow-up-date
behavior), just in a faster-access form.

## CRM: activity types + lifecycle timeline

**Activities can now be edited**, not just deleted — click "Edit" on any
logged activity to change its type, date, contact, notes, or follow-up
date in place.

**Two new activity types**: "Quoted" and "Work Received," alongside
Email/Call/In-Person Visit/Other.

**A Timeline at the bottom of every company profile** — a single
chronological view merging first contact (when the company was added),
every activity logged, and every status change (e.g., when it actually
became a Customer). Status changes are captured automatically by a
database trigger the moment a status changes — nothing to fill in
manually, and it was already happening, just not recorded until now.

**Deliberately not built yet, on purpose:** any kind of "time to
convert" report or analytics view. Per the request, this is about making
sure the underlying data exists — the timeline itself is the only
"view" of it for now. A real analysis (average touches before becoming a
Customer, which activity type correlates with faster conversion, etc.)
is a genuine future project once there's enough real data to look at.

## Carrier Management: payment method & factoring

Carriers now have a **Payment Method** (Factoring or ACH). Choosing
Factoring reveals a **factoring company field** that behaves like a
native browser autocomplete — start typing and it suggests matches, or
click into it to browse the full list — backed by a real lookup table,
manageable in **Settings → Factoring companies**.

## TMS Customers — separate from CRM Companies

**Dashboards got Edit buttons**: TMS Customers and Carriers both now have
an "Edit" button on each row, matching the Loads dashboard. (While in
there, also fixed the Customers dashboard's "Accounting contact" column
— it was silently reading the old single field that stopped being
populated once accounting contacts became a real list.)

**Updated since first built:**
- **Google autofill added** — both the "Import from CRM" search box and
  a business-name/address search box (same as Companies/Locations) plus
  live address autocomplete on the Address field itself, so typing a
  name or address gets suggestions either way.
- **Billing section expanded**: Billing Cycle (Per Load/Weekly/Bi-Weekly/
  Monthly), Payment Method (ACH/Check/QuickBooks Portal), and a Credit
  Limit field.
- **Accounting contacts are now a real list**, not one flat name/email/
  phone — add as many as needed with a "+ Add contact" button, same
  pattern as Carrier/Location contacts. Any accounting contact you'd
  already saved was automatically carried over into the new list.

Loads no longer reference your full CRM company list — that was
correctly identified as too many options for a load's customer picker.
There's now a dedicated **TMS → Customers** dashboard with its own
Add/Edit/Profile pages (name, address, phone/email, notes).

**Import from CRM**: on the Add Customer page, an "Import from CRM"
button opens a name search against your existing Companies — pick one
and its name/phone/email/address pre-fill the new TMS customer record,
which you can then adjust before saving. The two lists stay otherwise
completely separate; nothing here changes or reads back into the CRM
side automatically.

**Accounting contact**: every TMS customer has a dedicated accounting
contact section (name/email/phone), for when a lead becomes a real
customer and needs someone to send invoices to.

**Existing loads were migrated automatically** — if you already had
loads pointing at CRM companies, a matching TMS Customer was created for
each one during the migration, and those loads were repointed at the new
records. No data was lost; the CRM companies themselves are untouched.

## This round: copy buttons, double-click, and rating fixes

**Copy buttons** now match the exact small-icon style already used for
email in the CRM dashboard — added to the CRM dashboard's phone column,
TMS Customer accounting contact emails, and Driver contact (both the
Loads dashboard and the load's own profile page).

**Double-click to open** — every dashboard (CRM, Loads, Carriers,
Locations, TMS Customers) now opens the profile on a double-click
anywhere in the row, in addition to the existing name/number link. One
nuance worth knowing on the Loads dashboard specifically: since rows
there are packed with dropdowns and buttons, double-clicking directly on
one of those (like a status dropdown) will also trigger the row's
navigation, since the double-click event bubbles up. Flagging this now
rather than waiting for it to surface as a "bug" — let me know if it
becomes an actual annoyance in practice and I can make navigation ignore
double-clicks that start on an interactive element.

**Loads dashboard widened** to fit the growing column set.

**Three real bugs fixed in the carrier rating system:**
1. The rating popup had no way to back out without submitting — added a
   proper **Cancel** (×) button, always available, distinct from "Skip"
   (which only appears when marking a load Delivered, and still commits
   the status change either way).
2. The Carrier Rating section on a load's profile page wasn't showing
   the note that was added — it does now.
3. **Ratings can now be edited**, not just created — click the small
   pencil next to the stars on the Loads dashboard, or "Edit" on any
   entry in the Carrier profile's Rating Activity log. This also fixes
   the root cause behind seeing more ratings than loads: re-rating an
   already-rated load now updates that same rating in place instead of
   creating a new one every time.

## Load status overhaul + Carrier Rating system

**Load status replaced entirely**: Quoted, Ordered, Pickup Scheduled,
Picked Up, Delivery Scheduled, Delivered, Cancelled — matching the
colors from your reference screenshot (Quoted grey, Delivered green,
Cancelled red, etc). "Invoiced" and "Paid" are gone, since Carrier Pay
Status / PGL Pay Status already track that separately. **Existing
loads were automatically remapped**, not lost: Dispatched → Pickup
Scheduled, In Transit → Picked Up, Invoiced/Paid → Delivered (they were
already delivered).

**Carrier ratings are now real.** Marking a load "Delivered" (from
either the dashboard or the load's own profile) opens a popup showing
the carrier's name and MC number, five clickable stars that fill yellow
like a Google review, an optional quick note, an optional POD upload
right there in the same popup, and a checkbox to mark the carrier "Do
Not Use" (which immediately updates their status). **Skip is always
available** — the status change goes through either way, rating or not.

**If you skip it**, a "Rate carrier" button shows up in the same spot
on the dashboard (and on the load's profile) as the POD quick-upload, so
it's never lost — just deferred.

**Ties into the Carrier side**: the Carrier Dashboard's "Carrier Rating"
column and the Carrier profile's rating stat both now show a real
average (★ 4.5 (12), etc.) instead of "Coming soon." The Carrier profile
also has a new **Rating activity** section — every individual rating
ever given, with stars, note, date, and which load prompted it — same
idea as the CRM's Activity Log.

**If you already ran the earlier migrations:** run
`supabase/migration_017_load_status_and_carrier_ratings.sql`. This one
rebuilds the `loads.status` column (Postgres can't drop enum values
directly), so it's a heavier migration than most — take a backup first
if you want extra peace of mind, though the remap logic preserves every
existing load's status faithfully. **Fresh installs** already have the
final status set and the ratings table built into `schema.sql`.

## Document quick-download

Every document — Carrier Documents, Load Documents, and the dashboard's
POD cell — now has a **Download** button alongside **View**. View opens
the file in a new tab; Download forces an actual browser download.

## TMS Customers: contact email + analytics

The Customers dashboard's Accounting Contact column now shows the
contact's **email with a click-to-copy button**, not just their name.

Both the dashboard and each customer's own profile now show **Completed
Loads**, **Gross Revenue**, and **Last Shipment** — computed live from
that customer's loads (Completed = status is Delivered; Last Shipment
is the most recent pickup date across all their loads, any status).

## Loads dashboard — rebuilt with customizable columns

**Status is now an inline dropdown** right in the dashboard, same as
Carrier Pay Status and PGL Pay Status — no need to open a load just to
move it from Quoted to Dispatched.

**Carrier Pay Status and PGL Pay Status can now be blank or "N/A"**, not
forced into Invoiced/Paid — both show grey when blank or N/A, amber for
Invoiced, green for Paid.

**Load Documents** — a new Document Center on each load's profile,
matching the Carrier Documents pattern exactly: Load Confirmation, POD,
and Carrier Invoice as fixed single-slot types, plus unlimited "Other"
documents each with their own description. Reuses the same private
Storage bucket already set up for Carrier Documents — no second bucket
to create.

**POD column added right after Margin** on the dashboard — shows a
green ✓ if a POD is on file or a grey ✕ if not, with a one-click
Download or Upload button right there in the row, no need to open the
load first.

The dashboard now shows: Status, Load #, Customer, Pickup (city/state/
zip), Delivery (city/state/zip), Carrier, Carrier Payment, Driver,
Revenue, Expense, Margin, Margin %, Carrier Pay Status, and PGL Pay
Status — plus **Edit, Copy, and a red Delete button** on every row (the
old "Copy" text link is now a proper button, with Edit added to its
left and Delete to its right).

- **Click any Pickup, Delivery, or Driver cell to copy the full value**
  (full address, or driver name + phone) to your clipboard — hovering
  shows the same full value as a tooltip first, so you can check before
  copying.
- **Carrier Payment** shows "ACH" or the carrier's actual factoring
  company name, pulled automatically from what's set on the carrier's
  own profile.
- **Carrier Pay Status and PGL Pay Status** are inline dropdowns right
  in the table — Invoiced (yellow) or Paid (green) — no need to open the
  load to update either one.
- **"Customize columns"** (top right) lets you show/hide any column and
  reorder them with the ↑/↓ buttons. This preference is saved in your
  browser (not synced across devices or shared with teammates — it's a
  personal display setting, not data).

## Locations & Loads (TMS phase 2)

**The Load form was substantially reorganized** based on real usage,
into four clear sections: **Load Details** (status, customer, equipment,
reference number, all freight details, handling units, notes) → **Pickup
& Delivery** → **Carrier & Driver** → **Financial**.

**Reference/PO Number is back to a single text field** — the earlier
multi-reference-with-labels design was reverted per feedback; simpler
was better here.

**Pickup & Delivery now supports multiple stops.** What was two fixed
fields (one pickup, one delivery) is now an "+ Add stop" button under
each side — add a second pickup or second delivery whenever a load
actually needs one. Existing single pickup/delivery loads work exactly
the same, just backed by a proper stops table now instead of two flat
date fields.

**Financial section redesigned to match a real rate-confirmation/invoice
layout**: an **Income** table and an **Expenses** table, each with
repeatable line items (Company, Description, Notes, Rate, Quantity,
Total), a **Freight Charge Terms** selector (Prepaid/Collect/3rd Party),
and a summary showing Total Income, Total Expenditures, Gross
Profit/Loss, and Gross Profit/Loss %. The "View Customer
Confirmation"/"View Invoice"/"View Carrier Confirmation" buttons are
visible placeholders for the PDF builder phase — not wired up yet, since
that module doesn't exist. **Income line items default to "Flat Rate"**
so the common case needs zero clicks — change it from the dropdown when
something else applies.

**Each stop now has its own optional Notes field** ("Stop Notes" —
intended to be public, appearing on future documents; useful for
multi-stop loads where a specific reference number belongs at a specific
delivery) and its own **Contact name/phone**, auto-filled from the
selected Location's saved contact info but fully editable per stop.

**Pickup # replaces BOL Number** in the Pickup & Delivery section, with
a checkbox to reuse the Load Reference/PO # from the Load Details
section above instead of typing it twice.

**Factoring companies list pre-populated** with the ~50 companies
provided, plus "None" as an explicit option.

**One thing worth knowing:** this closes the margin gap flagged in the
previous round — since every dollar in or out is now a real line item
with an explicit Income or Expense side, the Gross Profit/Loss shown is
finally the complete picture, not just a base rate.

**If you already ran the earlier migrations:** run, in order,
`supabase/migration_013_lifecycle_and_stops.sql`,
`supabase/migration_014_tms_customers_and_stop_details.sql`,
`supabase/migration_015_tms_billing_and_pay_status.sql`,
`supabase/migration_016_pay_status_and_load_documents.sql`, **and**
`supabase/migration_017_load_status_and_carrier_ratings.sql`. **Fresh
installs** already have all of this in the main `schema.sql`.

**Load form overhaul** — a major expansion based on real usage:

- **"Booked" status renamed to "Ordered"** everywhere.
- **Reference / PO numbers** — unlimited, each with its own label
  (defaults to "PO #", but change it to "Ref #," "Pickup #," whatever's
  needed). Intended to show up on the Load Confirmation / BOL once that
  exists.
- **Commodity type** (Dry Goods (General)/Food, Refrigerated
  (General)/Food) — a real lookup table, defaults to Dry Goods (General)
  on a new load, manageable in Settings. The existing free-text
  Commodity field is unchanged, this is a second, separate categorization
  on top of it.
- **Load size** (Full/Partial) and **equipment length** (26'/48'/53') —
  single-select buttons.
- **Declared load value**, **Public/Private Load Notes** (Public is
  intended for the Load Confirmation/BOL later, Private stays internal).
- **Handling units** — piece type (lookup table: Pallets, Boxes, Crates,
  etc.) + quantity, add as many rows as needed.
- **Pickup/Delivery** now support a specific time *or* a time window,
  and the window can span multiple days (e.g. "7/15 9:00 AM – 7/17 3:00
  PM") — matches all three examples from the request exactly.
- **Driver** — once a carrier is picked, a dropdown of that carrier's own
  contacts appears to quick-fill the driver's name/phone, or just type
  them in manually — either way, both fields stay editable.
- **Financial line items** — Flat Rate, Extra Stop, Lumper, etc.
  (lookup table), each with a quantity, a dollar amount, notes, and an
  "on paperwork" checkbox for when invoices/rate confirmations exist.
  **Honest limitation:** the Margin shown on a load is still just
  Customer Rate − Carrier Cost — it does **not** fold in line items yet,
  since the current single "on paperwork" checkbox doesn't distinguish
  which side (customer invoice vs. carrier rate confirmation) a given
  line item applies to. Worth revisiting once real invoicing exists.
- **Copy a load** — a "Copy" button on both the Loads dashboard (per row)
  and a load's own profile page. Duplicates everything (customer,
  carrier, rates, references, handling units, line items) but resets
  status to Quoted and clears pickup/delivery dates and the BOL number,
  since a copied shipment is almost always for a new date.

**If you already ran the earlier migrations:** run
`supabase/migration_012_load_overhaul.sql` in the SQL Editor. **Fresh
installs** already have all of this in the main `schema.sql`. One
technical note: that migration renames a value inside a Postgres enum
type, which has to run as its own statement — this migration only does
that one thing, so it should apply cleanly.

**Address autocomplete added to Add Company and Add Location** — both
now have live, as-you-type Google address suggestions on the Address
field itself, in addition to (not instead of) the original search-box
pattern. Use whichever fits the moment: search by business name at the
top to auto-import everything at once, or just type/paste an address
directly into the Address field and either pick a suggestion or fill in
City/State/Zip by hand — all three paths work.

**Locations now support:**
- **Contacts** (name/phone/email — simpler than Carrier contacts, no
  position field), addable inline during creation or from the profile
  after saving, same pattern as Carriers
- **Public/Private Notes**, separate from the general Notes field — not
  tied to anything yet, intended for BOLs/carrier-facing documents later
- **Location type** — a single-select tag (Residential, Business,
  Business with Dock, Business with Forklift, Construction Site, etc.),
  backed by a real lookup table like Equipment Types, manageable in
  **Settings → Location types**

**If you already ran the earlier migrations:** run
`supabase/migration_010_location_features.sql` in the SQL Editor.
**Fresh installs** already have this in the main `schema.sql`.

The next piece of TMS, built on top of Carriers. "Customers" isn't a new
module — Loads just reference your existing Companies.

**Locations** (TMS → Locations) — reusable pickup/delivery addresses,
same idea as Carriers: search once via the same Google Places
integration used everywhere else, save it, and pick it from a list on
every future load instead of retyping the same warehouse address every
time.

**Loads** (TMS → Loads) — the core record: an auto-generated sequential
load number, a customer (from Companies), a carrier (optional — a load
can be Quoted before anyone's assigned), pickup and delivery (each a
Location + a date), equipment type needed, commodity/weight/pieces,
PO/BOL numbers, and a status that moves through Quoted → Booked →
Dispatched → In Transit → Delivered → Invoiced → Paid (or Cancelled).
Includes the same Quick Notes pattern as Companies/Carriers.

**Rate and margin are built in from day one.** Every load has a Customer
Rate and a Carrier Cost; **Margin is computed automatically by the
database** (a generated column, not app logic) and shown everywhere a
load appears — the dashboard, the profile, everywhere. Negative margins
show in red as a quick visual flag.

**On multi-stop loads:** this version supports exactly one pickup and
one delivery per load, not a flexible multi-stop route. That was a
deliberate choice for this pass, matching real usage (~95% single
pickup/delivery) — if true multi-stop becomes a real need, that's a
genuine schema change (a proper stops table), not just a UI tweak, so
flag it early if it starts happening more than rarely.

**"Total Loads" and "Last Used" on the Carrier Dashboard are now real** —
they were placeholder zeros before Loads existed; the `carrier_stats`
view was updated (not the app code) to compute them from real load data.

**If you already ran the earlier migrations:** run
`supabase/migration_008_loads.sql` in the SQL Editor. **Fresh installs**
already have this in the main `schema.sql`.

## Analytics: breakdown by type / by branch

The "Outreach touches logged" and "Company profiles added" sections on
the Analytics page now have a **"Show breakdown"** link underneath their
stat cards:

- **Outreach touches** breaks down into Email / Call / In-Person Visit /
  Other, for each of Today / This week / This month / This year at once
- **Company profiles added** breaks down by **Branch** — interpreting
  "freight and fulfillment" from the request as your existing Branches
  feature, since those were literally the example branch names used when
  Branches was first built. If you actually meant something else (like a
  company `industry` field), let me know and this can be pointed at that
  instead — the breakdown table itself doesn't change, just what it
  groups by.

Both breakdowns are collapsed by default (a click-to-reveal table, not
extra clutter on the page) and only ever read data that's already being
fetched for the existing stat cards — no new queries beyond the
breakdown counts themselves.

## Carrier Management (TMS → Carriers)

**"Carrier Packet" added as a document type** (a single-slot type, same
as MC Certificate/W-9/COI/NOA-ACH). Empty "Other" document slots added by
mistake on the Add Carrier page can now be removed with a "Remove" link,
same as removing an extra contact row.

**Document Center updated:** the four fixed document types (MC
Certificate, W-9, COI, NOA/ACH) still work as single slots, but **"Other"
now supports unlimited documents**, each with its own custom label (e.g.
"Signed lease agreement") — click "+ Add another document" for as many
as needed. All documents now display in a **responsive grid (up to 3 per
row)** instead of one long stacked list.

**Updated since first built**, based on real usage:

- **Live address autocomplete** — the Address field on the carrier form
  now suggests real addresses as you type (powered by Google), instead of
  the search-box-then-pick-a-result pattern used on Add Company/Add
  Location. Worth knowing: this uses a **different Google API surface**
  — the Maps JavaScript API's `places` library — than the server-side
  Places API (New) text search used elsewhere. Same API key, no new
  setup, but a genuinely different code path, so if it ever misbehaves
  independently of the rest of the Google integration, that's why.
  City/state/zip still show as normal editable fields underneath, so
  typing an address by hand and filling those in manually always works
  too, even if autocomplete doesn't fire.
- **Layout**: Status now sits top-right next to the carrier name;
  Insurance Expiration moved down next to Tax ID.
- **Contacts moved above Equipment Types.** Only the *first* contact's
  phone/email auto-fill from the Main Phone/Main Email fields (live, as
  you type them) — any additional contacts start blank, since a second
  contact is almost never the same person as the main line.
- **Documents can now be uploaded during carrier creation**, not just
  after saving. Files upload to Storage immediately under a temporary
  ID generated in your browser; once you actually save the carrier, those
  already-uploaded files get linked to the real carrier record. If you
  never finish creating the carrier, the temp files are just orphaned in
  Storage (harmless, but worth knowing — there's no automatic cleanup
  for an abandoned "Add carrier" page yet).
- **Public/Private Notes** — two plain text fields on the carrier record
  itself (distinct from the timestamped Quick Notes log below them).
  Not tied to anything yet, per the request — Public Notes is intended
  to eventually show up on carrier-facing documents like rate
  confirmations, Private Notes stays internal-only.

**If you already ran the earlier migrations:** run
`supabase/migration_009_carrier_notes_fields.sql` in the SQL Editor.
**Fresh installs** already have this in the main `schema.sql`.

The first piece of the TMS module — a carrier database, built to match the
Customer CRM's design and reuse as much of its architecture as possible
(same auth, same styling, same Google Places integration, same
contacts/notes patterns). This is phase 1 of a larger plan (Carriers →
Loads/Locations → PDF builder); a few things here are deliberately
scaffolded for that future work rather than fully wired up yet.

**What's here:**
- Carrier profile: name, MC/DOT numbers, address (via the same Google
  Places search used everywhere else — see below), main phone/email, tax
  ID, insurance expiration, and a status (Active / Inactive / Do Not Use)
- **Equipment types are a real lookup table**, not a hardcoded list —
  manage them in **Settings → Equipment types**, no code change needed to
  add more
- Unlimited contacts per carrier, each with a position (Owner / Dispatch
  / Accounting / Management / Driver). You can add contacts right on the
  "Add carrier" page itself before saving (optional, add as many as you
  like), or skip that and add them from the profile afterward — either
  way works. The very first contact added from the profile page
  auto-fills from the carrier's main phone/email, since that's almost
  always the same person.
- A real **Document Center** — upload MC Certificate, W-9, COI, NOA/ACH,
  and Other documents, each shown with a green "Complete" badge once
  something's on file. Every upload is kept as a new row (history is
  preserved), the profile always shows the most recent one per type.
  Requires a one-time Storage setup — see below.
- Quick Notes, identical in behavior to the Customer module's Notes Log
- Carrier Dashboard: search by name/MC/DOT, filter by status (defaults to
  **Active only** — Inactive and Do Not Use carriers still exist and are
  searchable, just hidden from the default view, per the spec), sortable
  by Carrier name, MC number, Insurance expiration, and Status

**Two things that only show placeholder values right now, on purpose:**
"Total loads" and "Last used" both come from a `carrier_stats` view that
currently always returns 0 / never — because there's no Loads table yet
for them to count. The view is already wired into the dashboard and
profile page, so once the Load module exists, updating just that one SQL
view's definition (not any app code) will make real numbers show up
everywhere at once. Same idea for "Carrier rating," which is a plain
"Coming soon" label with no logic behind it yet.

**Sorting note:** every *directly stored* column is sortable (name, MC
number, insurance expiration, status). Equipment types, Last used, Total
loads, and Carrier rating aren't sortable yet — the first is a
many-to-many relationship that would need a more complex query to sort
against server-side, and the latter two are placeholder values with
nothing meaningful to sort by until Loads exists. Worth revisiting once
there's real data.

**On address lookup:** the spec this was built from described live
"as-you-type" Google Autocomplete suggestions. What's actually reused
here is the CRM's existing search-and-pick pattern (type a name → Search
→ choose from results) rather than building true keystroke-level
autocomplete, which would technically be a second, differently-billed
Google integration even on the same key. Same cost model as everywhere
else Places search is used in this app.

## Setting up carrier document storage

Documents need a real Supabase Storage bucket — this is the first
feature in the app that stores actual files rather than rows in a
database, so there's a one-time setup step that hasn't come up before:

1. In your Supabase project, go to **Storage** (left sidebar)
2. Click **New bucket**
3. Name it exactly **`carrier-documents`**
4. Leave it **private** (do not make it public) — documents can contain
   sensitive info like SSNs on a W-9 or insurance details, so files are
   only ever accessed through short-lived signed links generated on
   demand, never a public URL
5. Add a storage policy allowing authenticated users to upload, read, and
   delete — the simplest way is: **Storage → Policies → New Policy** on
   the `carrier-documents` bucket, and create policies for `INSERT`,
   `SELECT`, and `DELETE` all with the condition `auth.role() =
   'authenticated'` (matching every other table's RLS policy in this app)

Until that bucket exists, uploads will fail with a clear on-screen error
telling you the bucket is missing — nothing else in the app is affected.

**If you already ran the original `schema.sql`:** run
`supabase/migration_007_carriers.sql` in the SQL Editor. **Fresh
installs** already have this in the main `schema.sql`.

## Notepad (Tools → Notepad)

A personal scratchpad, private to each user — not shared with the rest of
the team, unlike everything else in this app. Two tabs:

- **Quick Notes** — a running checklist. Add a note, it stacks up
  newest-first. Click the circle to mark one done (turns it green,
  doesn't cross it out) without deleting it, or hit the ✕ to remove it
  entirely.
- **Freeform** — one continuous open text sheet, like a plain text
  editor. No structure, no timestamps, just space to think. Autosaves
  about a second after you stop typing.

**If you already ran the original `schema.sql`:** run
`supabase/migration_006_notepad.sql` in the SQL Editor. **Fresh
installs** already have this in the main `schema.sql`.

## Document Scanner (Tools → Document Scanner)

An isolated module at `/scanner` that turns photos of freight documents
into one clean PDF, entirely in the browser. It doesn't touch the CRM
database at all — no new tables, no schema changes.

**What it does:**
- Drag-and-drop or mobile file picker for JPG, PNG, WebP, and HEIC (iPhone
  photos) — HEIC is converted to JPEG client-side via `heic2any` (a WASM
  decoder), so nothing ever gets sent anywhere to process it
- Thumbnails you can drag to reorder, rotate, or delete
- Manual four-corner crop with draggable handles (no auto-detect — see
  note below on why)
- Four filters — Original, Enhanced Color, Grayscale, and a Black & White
  Scanner mode (grayscale → light blur → adaptive threshold → light
  denoise) — plus brightness/contrast sliders
- A4, US Letter, or Automatic page sizing, and a compression slider that
  trades file size for quality
- Auto-names the file `Load-[load number]-[document type].pdf`

**How it works technically:** every bit of image processing — perspective
correction, rotation, filters — is **plain Canvas 2D and hand-written
pixel math** (`lib/scanner/canvas-processing.ts`), running inside a Web
Worker (`lib/scanner/scanner-worker.worker.ts`) so it never touches page
responsiveness. There is deliberately **no external image-processing
library and no WebAssembly** involved anywhere in this feature. The final
PDF is built with **pdf-lib**, also entirely client-side. Nothing here
calls an external API.

**Why not OpenCV.js:** the first version of this feature used OpenCV.js
for perspective correction and an "auto-detect edges" button. In
practice, OpenCV.js's WASM runtime reliably reported successful
initialization inside a Web Worker, then permanently deadlocked
immediately afterward, with no error and no way to debug further — this
held true across several different loading strategies (CDN script,
properly bundled npm package, polling instead of callbacks) and even
after enabling cross-origin isolation headers to rule out a WASM-threads
theory. Since none of that ever produced a single successful export, the
feature was rebuilt from scratch on a pure Canvas/JavaScript foundation
with zero dependency on any engine that can fail to load. The one real
trade-off: there's no more automatic edge detection — cropping is always
manual now. Given the choice between "fancier but never actually works"
and "simpler but reliably does," reliability won.


**Downloading vs. Supabase Storage:** right now, "Generate & download PDF"
does exactly that — downloads straight to your device. `lib/scanner/storage.ts`
has a fully-written (but not yet called) function for uploading the PDF to
Supabase Storage and attaching it to a load record — deliberately not
wired in yet, since there's no `loads`/TMS table for it to attach to. The
comment at the top of that file spells out exactly what to add (a storage
bucket + a small table) when the TMS module is real.



```
app/
  login/                  Sign in / sign up
  (app)/                  Everything behind auth (see middleware.ts)
    dashboard/            Main company table — search, filter, sort
    analytics/            Analytics, with optional branch filter
    companies/new/        Add company (with Google Maps import)
    companies/[id]/       Company profile — contacts, activity, notes
    companies/[id]/edit/  Edit company
    settings/             Personal preferences + shared branches
    scanner/              Document Scanner (isolated, no DB dependency)
  api/cron/               The daily follow-up digest cron endpoint
actions/                  Server actions (all read/write logic lives here)
components/               UI building blocks
  scanner/                Document Scanner UI components
lib/
  supabase/               Browser, server, and admin (service-role) clients
  digest.ts               Follow-up digest email logic
  google-places.ts        Google Places search (server-only)
  scanner/                Document Scanner processing (pure Canvas/JS, PDF export, HEIC)
  types.ts                Shared TypeScript types
supabase/schema.sql        The entire database schema — run once in Supabase
supabase/migration_*.sql   Incremental migrations for existing projects
middleware.ts             Session refresh + route protection
vercel.json               Cron schedule for the follow-up digest
```

## Notes on data model

- All authenticated users see the same shared book of business — this is
  an internal team tool, not multi-tenant, so RLS policies just check
  `auth.role() = 'authenticated'` rather than scoping by user.
- `company_stats` is a Postgres view (not a table) that aggregates contact
  count and activity counts per company, used by the dashboard and profile
  page so those numbers are always computed fresh, never stored/duplicated.
- Deleting a company cascades to its contacts, activities, and notes
  (`on delete cascade` in the schema).
