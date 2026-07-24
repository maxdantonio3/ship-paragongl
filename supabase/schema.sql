-- ============================================================================
-- Paragon Global Logistics — CRM/Portal Database Schema
-- Target: Supabase (Postgres + Auth). Safe to run top-to-bottom on a fresh
-- Supabase project's SQL editor.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
create extension if not exists "pgcrypto"; -- gen_random_uuid()

-- ----------------------------------------------------------------------------
-- Enums
-- ----------------------------------------------------------------------------
do $$ begin
  create type company_status as enum ('Cold', 'Warm', 'Quoting', 'Customer');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type activity_type as enum ('Email', 'Call', 'In-Person Visit', 'Quoted', 'Work Received', 'Other');
exception
  when duplicate_object then null;
end $$;

-- ----------------------------------------------------------------------------
-- Table: companies
-- ----------------------------------------------------------------------------
create table if not exists companies (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  status company_status not null default 'Cold',
  industry text,

  address text,
  city text,
  state text,
  zip text,

  phone text,
  email text,
  website text,
  google_maps_link text,

  -- Phase 3 (Google Places import) support — populated later, optional now.
  google_place_id text,
  google_maps_raw jsonb,

  notes_summary text,

  date_added timestamptz not null default now(),
  last_contacted_date timestamptz,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists companies_status_idx on companies(status);
create index if not exists companies_name_idx on companies using gin (to_tsvector('english', name));
create index if not exists companies_city_idx on companies(city);
create index if not exists companies_last_contacted_idx on companies(last_contacted_date);
create index if not exists companies_date_added_idx on companies(date_added);

-- ----------------------------------------------------------------------------
-- Table: contacts
-- ----------------------------------------------------------------------------
create table if not exists contacts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,

  first_name text not null,
  last_name text,
  job_title text,
  email text,
  phone text,
  linkedin_url text,
  notes text,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contacts_company_idx on contacts(company_id);

-- ----------------------------------------------------------------------------
-- Table: activities  (the outreach log: email / call / visit / other)
-- ----------------------------------------------------------------------------
create table if not exists activities (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  contact_id uuid references contacts(id) on delete set null,

  activity_type activity_type not null,
  activity_date timestamptz not null default now(),
  notes text,
  follow_up_date date,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists activities_company_idx on activities(company_id);
create index if not exists activities_date_idx on activities(activity_date);
create index if not exists activities_type_idx on activities(activity_type);
create index if not exists activities_followup_idx on activities(follow_up_date);

-- ----------------------------------------------------------------------------
-- Table: notes  (free-form notes log, separate from activities)
-- ----------------------------------------------------------------------------
create table if not exists notes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,

  content text not null,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists notes_company_idx on notes(company_id);
create index if not exists notes_created_idx on notes(created_at);

-- ----------------------------------------------------------------------------
-- Trigger: keep companies.updated_at fresh
-- ----------------------------------------------------------------------------
create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_companies_updated_at on companies;
create trigger trg_companies_updated_at
  before update on companies
  for each row execute function set_updated_at();

drop trigger if exists trg_contacts_updated_at on contacts;
create trigger trg_contacts_updated_at
  before update on contacts
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Trigger: auto-update companies.last_contacted_date whenever a new
-- activity is logged (Phase 2 automation, wired in from day one).
-- ----------------------------------------------------------------------------
create or replace function bump_last_contacted()
returns trigger as $$
begin
  update companies
    set last_contacted_date = new.activity_date
    where id = new.company_id
      and (last_contacted_date is null or new.activity_date > last_contacted_date);
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_activities_bump_last_contacted on activities;
create trigger trg_activities_bump_last_contacted
  after insert on activities
  for each row execute function bump_last_contacted();

-- Also recompute correctly if an activity's date is edited or one is deleted
-- (keeps last_contacted_date accurate rather than only ever increasing).
create or replace function recompute_last_contacted(p_company_id uuid)
returns void as $$
begin
  update companies
    set last_contacted_date = (
      select max(activity_date) from activities where company_id = p_company_id
    )
    where id = p_company_id;
end;
$$ language plpgsql;

create or replace function activities_after_update_or_delete()
returns trigger as $$
begin
  if (tg_op = 'DELETE') then
    perform recompute_last_contacted(old.company_id);
    return old;
  else
    perform recompute_last_contacted(new.company_id);
    if (old.company_id is distinct from new.company_id) then
      perform recompute_last_contacted(old.company_id);
    end if;
    return new;
  end if;
end;
$$ language plpgsql;

drop trigger if exists trg_activities_update on activities;
create trigger trg_activities_update
  after update on activities
  for each row execute function activities_after_update_or_delete();

drop trigger if exists trg_activities_delete on activities;
create trigger trg_activities_delete
  after delete on activities
  for each row execute function activities_after_update_or_delete();

-- ----------------------------------------------------------------------------
-- View: company_stats — counts used on the dashboard & profile page
-- ----------------------------------------------------------------------------
create or replace view company_stats as
select
  c.id as company_id,
  count(distinct ct.id) as total_contacts,
  count(a.id) filter (where a.activity_type = 'Email') as email_count,
  count(a.id) filter (where a.activity_type = 'Call') as call_count,
  count(a.id) filter (where a.activity_type = 'In-Person Visit') as visit_count,
  count(a.id) filter (where a.activity_type = 'Other') as other_count,
  count(a.id) as total_activities
from companies c
left join contacts ct on ct.company_id = c.id
left join activities a on a.company_id = c.id
group by c.id;

-- ----------------------------------------------------------------------------
-- Row Level Security
-- All authenticated Paragon staff share full visibility into the same book
-- of business (this is an internal team tool, not multi-tenant), but only
-- signed-in users may read or write anything.
-- ----------------------------------------------------------------------------
alter table companies enable row level security;
alter table contacts enable row level security;
alter table activities enable row level security;
alter table notes enable row level security;

drop policy if exists "authenticated read companies" on companies;
create policy "authenticated read companies" on companies
  for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated write companies" on companies;
create policy "authenticated write companies" on companies
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated update companies" on companies;
create policy "authenticated update companies" on companies
  for update using (auth.role() = 'authenticated');
drop policy if exists "authenticated delete companies" on companies;
create policy "authenticated delete companies" on companies
  for delete using (auth.role() = 'authenticated');

drop policy if exists "authenticated read contacts" on contacts;
create policy "authenticated read contacts" on contacts
  for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated write contacts" on contacts;
create policy "authenticated write contacts" on contacts
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated update contacts" on contacts;
create policy "authenticated update contacts" on contacts
  for update using (auth.role() = 'authenticated');
drop policy if exists "authenticated delete contacts" on contacts;
create policy "authenticated delete contacts" on contacts
  for delete using (auth.role() = 'authenticated');

drop policy if exists "authenticated read activities" on activities;
create policy "authenticated read activities" on activities
  for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated write activities" on activities;
create policy "authenticated write activities" on activities
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated update activities" on activities;
create policy "authenticated update activities" on activities
  for update using (auth.role() = 'authenticated');
drop policy if exists "authenticated delete activities" on activities;
create policy "authenticated delete activities" on activities
  for delete using (auth.role() = 'authenticated');

drop policy if exists "authenticated read notes" on notes;
create policy "authenticated read notes" on notes
  for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated write notes" on notes;
create policy "authenticated write notes" on notes
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated update notes" on notes;
create policy "authenticated update notes" on notes
  for update using (auth.role() = 'authenticated');
drop policy if exists "authenticated delete notes" on notes;
create policy "authenticated delete notes" on notes
  for delete using (auth.role() = 'authenticated');

-- ----------------------------------------------------------------------------
-- Seed data (optional) — comment out if you don't want sample rows.
-- ----------------------------------------------------------------------------
-- insert into companies (name, status, industry, city, state, zip, phone, email)
-- values ('Sample Produce Distributors', 'Warm', 'Food & Beverage', 'Orlando', 'FL', '32801', '(407) 555-0134', 'ops@sampleproduce.com');

-- ============================================================================
-- Follow-up tracking + per-user settings
-- (For an existing project that already ran the section above, run
--  supabase/migration_002_followups.sql instead of this whole file.)
-- ============================================================================

alter table companies add column if not exists next_follow_up_date date;
create index if not exists companies_next_follow_up_idx on companies(next_follow_up_date);

create table if not exists user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,

  default_follow_up_days int not null default 7,

  -- Powers the follow-up email digest (lib/digest.ts + the daily cron
  -- route) — see README.md for the Resend + Vercel Cron setup.
  email_digest_enabled boolean not null default false,
  email_digest_frequency text not null default 'daily' check (email_digest_frequency in ('daily', 'weekly')),
  email_digest_day_of_week smallint check (email_digest_day_of_week between 0 and 6), -- 0=Sunday, used only when frequency='weekly'
  email_digest_time time not null default '09:00',
  email_digest_timezone text not null default 'America/New_York',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_user_settings_updated_at on user_settings;
create trigger trg_user_settings_updated_at
  before update on user_settings
  for each row execute function set_updated_at();

alter table user_settings enable row level security;

drop policy if exists "read own settings" on user_settings;
create policy "read own settings" on user_settings
  for select using (auth.uid() = user_id);

drop policy if exists "insert own settings" on user_settings;
create policy "insert own settings" on user_settings
  for insert with check (auth.uid() = user_id);

drop policy if exists "update own settings" on user_settings;
create policy "update own settings" on user_settings
  for update using (auth.uid() = user_id);

create or replace function set_next_follow_up()
returns trigger as $$
declare
  days int;
begin
  if new.follow_up_date is not null then
    update companies set next_follow_up_date = new.follow_up_date where id = new.company_id;
  else
    select coalesce(us.default_follow_up_days, 7) into days
    from user_settings us
    where us.user_id = new.created_by;

    if days is null then
      days := 7;
    end if;

    update companies
      set next_follow_up_date = (new.activity_date::date + (days || ' days')::interval)::date
      where id = new.company_id;
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_activities_set_follow_up on activities;
create trigger trg_activities_set_follow_up
  after insert on activities
  for each row execute function set_next_follow_up();

-- ============================================================================
-- Branches (optional divisions, e.g. Freight vs E-commerce Fulfillment)
-- (For an existing project that already ran the sections above, run
--  supabase/migration_003_branches.sql instead of this whole file.)
-- ============================================================================

create table if not exists branches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table companies add column if not exists branch_id uuid references branches(id) on delete set null;
create index if not exists companies_branch_idx on companies(branch_id);

alter table branches enable row level security;

drop policy if exists "authenticated read branches" on branches;
create policy "authenticated read branches" on branches
  for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated write branches" on branches;
create policy "authenticated write branches" on branches
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated update branches" on branches;
create policy "authenticated update branches" on branches
  for update using (auth.role() = 'authenticated');
drop policy if exists "authenticated delete branches" on branches;
create policy "authenticated delete branches" on branches
  for delete using (auth.role() = 'authenticated');

-- ============================================================================
-- Territory Map: latitude/longitude on companies
-- (For an existing project that already ran the sections above, run
--  supabase/migration_005_territory.sql instead of this whole file.)
-- ============================================================================

alter table companies add column if not exists latitude double precision;
alter table companies add column if not exists longitude double precision;

create index if not exists companies_lat_lng_idx on companies(latitude, longitude)
  where latitude is not null and longitude is not null;

-- ============================================================================
-- Notepad tool (Quick Notes checklist + Freeform sheet)
-- Personal to each user, like user_settings — not shared team data.
-- (For an existing project that already ran the sections above, run
--  supabase/migration_006_notepad.sql instead of this whole file.)
-- ============================================================================

create table if not exists notepad_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  content text not null,
  done boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notepad_entries_user_idx on notepad_entries(user_id);
create index if not exists notepad_entries_created_idx on notepad_entries(created_at);

create table if not exists notepad_freeform (
  user_id uuid primary key references auth.users(id) on delete cascade,
  content text not null default '',
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_notepad_freeform_updated_at on notepad_freeform;
create trigger trg_notepad_freeform_updated_at
  before update on notepad_freeform
  for each row execute function set_updated_at();

alter table notepad_entries enable row level security;
alter table notepad_freeform enable row level security;

drop policy if exists "read own notepad entries" on notepad_entries;
create policy "read own notepad entries" on notepad_entries
  for select using (auth.uid() = user_id);
drop policy if exists "insert own notepad entries" on notepad_entries;
create policy "insert own notepad entries" on notepad_entries
  for insert with check (auth.uid() = user_id);
drop policy if exists "update own notepad entries" on notepad_entries;
create policy "update own notepad entries" on notepad_entries
  for update using (auth.uid() = user_id);
drop policy if exists "delete own notepad entries" on notepad_entries;
create policy "delete own notepad entries" on notepad_entries
  for delete using (auth.uid() = user_id);

drop policy if exists "read own freeform notes" on notepad_freeform;
create policy "read own freeform notes" on notepad_freeform
  for select using (auth.uid() = user_id);
drop policy if exists "insert own freeform notes" on notepad_freeform;
create policy "insert own freeform notes" on notepad_freeform
  for insert with check (auth.uid() = user_id);
drop policy if exists "update own freeform notes" on notepad_freeform;
create policy "update own freeform notes" on notepad_freeform
  for update using (auth.uid() = user_id);

-- ============================================================================
-- Carrier Management module (TMS phase 1)
-- Mirrors the Customer CRM's architecture (companies / contacts / notes) so
-- the two modules feel and behave consistently. Shared team data, same RLS
-- pattern as companies (authenticated = full access) — not personal-per-user
-- like user_settings/notepad.
-- (For an existing project that already ran the sections above, run
--  supabase/migration_007_carriers.sql instead of this whole file.)
-- ============================================================================

do $$ begin
  create type carrier_status as enum ('Active', 'Inactive', 'Do Not Use');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type carrier_contact_position as enum ('Owner', 'Dispatch', 'Accounting', 'Management', 'Driver');
exception
  when duplicate_object then null;
end $$;

do $$ begin
  create type carrier_document_type as enum ('Carrier Packet', 'MC Certificate', 'W-9', 'COI', 'NOA / ACH', 'Other');
exception
  when duplicate_object then null;
end $$;

-- ----------------------------------------------------------------------------
-- Equipment types — a lookup table, not a hardcoded list, so new equipment
-- can be added later without a code change. Seeded with the initial set.
-- ----------------------------------------------------------------------------
create table if not exists equipment_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

insert into equipment_types (name) values
  ('Dry Van'), ('Reefer'), ('Box Truck'), ('Sprinter Van'), ('Cargo Van'),
  ('Flatbed'), ('Flatbed Hotshot'), ('Conestoga'), ('Step Deck')
on conflict (name) do nothing;

-- ----------------------------------------------------------------------------
-- Carriers
-- ----------------------------------------------------------------------------
create table if not exists carriers (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  mc_number text,
  dot_number text,

  address text,
  city text,
  state text,
  zip text,
  latitude double precision,
  longitude double precision,
  google_place_id text,

  phone text,
  email text,

  tax_id text,
  insurance_expiration date,

  status carrier_status not null default 'Active',

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists carriers_status_idx on carriers(status);
create index if not exists carriers_name_idx on carriers using gin (to_tsvector('english', name));
create index if not exists carriers_mc_idx on carriers(mc_number);
create index if not exists carriers_dot_idx on carriers(dot_number);

drop trigger if exists trg_carriers_updated_at on carriers;
create trigger trg_carriers_updated_at
  before update on carriers
  for each row execute function set_updated_at();

-- Many-to-many: a carrier can run multiple equipment types.
create table if not exists carrier_equipment_types (
  carrier_id uuid not null references carriers(id) on delete cascade,
  equipment_type_id uuid not null references equipment_types(id) on delete cascade,
  primary key (carrier_id, equipment_type_id)
);

-- ----------------------------------------------------------------------------
-- Carrier contacts
-- ----------------------------------------------------------------------------
create table if not exists carrier_contacts (
  id uuid primary key default gen_random_uuid(),
  carrier_id uuid not null references carriers(id) on delete cascade,

  name text not null,
  phone text,
  email text,
  position carrier_contact_position not null default 'Owner',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists carrier_contacts_carrier_idx on carrier_contacts(carrier_id);

drop trigger if exists trg_carrier_contacts_updated_at on carrier_contacts;
create trigger trg_carrier_contacts_updated_at
  before update on carrier_contacts
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Carrier documents — every upload is a new row (keeps history), the UI
-- shows the most recent row per document_type as "current."
-- ----------------------------------------------------------------------------
create table if not exists carrier_documents (
  id uuid primary key default gen_random_uuid(),
  carrier_id uuid not null references carriers(id) on delete cascade,

  document_type carrier_document_type not null,
  file_name text not null,
  file_path text not null, -- path inside the Supabase Storage bucket

  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_at timestamptz not null default now()
);

create index if not exists carrier_documents_carrier_idx on carrier_documents(carrier_id);
create index if not exists carrier_documents_type_idx on carrier_documents(document_type);

-- ----------------------------------------------------------------------------
-- Carrier notes (Quick Notes — mirrors the Customer module's Notes Log)
-- ----------------------------------------------------------------------------
create table if not exists carrier_notes (
  id uuid primary key default gen_random_uuid(),
  carrier_id uuid not null references carriers(id) on delete cascade,

  content text not null,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists carrier_notes_carrier_idx on carrier_notes(carrier_id);

-- ----------------------------------------------------------------------------
-- Row Level Security — shared team data, same pattern as companies.
-- ----------------------------------------------------------------------------
alter table equipment_types enable row level security;
alter table carriers enable row level security;
alter table carrier_equipment_types enable row level security;
alter table carrier_contacts enable row level security;
alter table carrier_documents enable row level security;
alter table carrier_notes enable row level security;

drop policy if exists "authenticated read equipment_types" on equipment_types;
create policy "authenticated read equipment_types" on equipment_types
  for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated write equipment_types" on equipment_types;
create policy "authenticated write equipment_types" on equipment_types
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated delete equipment_types" on equipment_types;
create policy "authenticated delete equipment_types" on equipment_types
  for delete using (auth.role() = 'authenticated');

drop policy if exists "authenticated read carriers" on carriers;
create policy "authenticated read carriers" on carriers
  for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated write carriers" on carriers;
create policy "authenticated write carriers" on carriers
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated update carriers" on carriers;
create policy "authenticated update carriers" on carriers
  for update using (auth.role() = 'authenticated');
drop policy if exists "authenticated delete carriers" on carriers;
create policy "authenticated delete carriers" on carriers
  for delete using (auth.role() = 'authenticated');

drop policy if exists "authenticated read carrier_equipment_types" on carrier_equipment_types;
create policy "authenticated read carrier_equipment_types" on carrier_equipment_types
  for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated write carrier_equipment_types" on carrier_equipment_types;
create policy "authenticated write carrier_equipment_types" on carrier_equipment_types
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated delete carrier_equipment_types" on carrier_equipment_types;
create policy "authenticated delete carrier_equipment_types" on carrier_equipment_types
  for delete using (auth.role() = 'authenticated');

drop policy if exists "authenticated read carrier_contacts" on carrier_contacts;
create policy "authenticated read carrier_contacts" on carrier_contacts
  for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated write carrier_contacts" on carrier_contacts;
create policy "authenticated write carrier_contacts" on carrier_contacts
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated update carrier_contacts" on carrier_contacts;
create policy "authenticated update carrier_contacts" on carrier_contacts
  for update using (auth.role() = 'authenticated');
drop policy if exists "authenticated delete carrier_contacts" on carrier_contacts;
create policy "authenticated delete carrier_contacts" on carrier_contacts
  for delete using (auth.role() = 'authenticated');

drop policy if exists "authenticated read carrier_documents" on carrier_documents;
create policy "authenticated read carrier_documents" on carrier_documents
  for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated write carrier_documents" on carrier_documents;
create policy "authenticated write carrier_documents" on carrier_documents
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated delete carrier_documents" on carrier_documents;
create policy "authenticated delete carrier_documents" on carrier_documents
  for delete using (auth.role() = 'authenticated');

drop policy if exists "authenticated read carrier_notes" on carrier_notes;
create policy "authenticated read carrier_notes" on carrier_notes
  for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated write carrier_notes" on carrier_notes;
create policy "authenticated write carrier_notes" on carrier_notes
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated delete carrier_notes" on carrier_notes;
create policy "authenticated delete carrier_notes" on carrier_notes
  for delete using (auth.role() = 'authenticated');

-- ----------------------------------------------------------------------------
-- Carrier stats view — same idea as company_stats, ready for the Load
-- module: total_loads/last_used will populate once a loads table exists
-- and references carrier_id. Included now so the dashboard's shape never
-- needs to change later, only this view's definition.
-- ----------------------------------------------------------------------------
create or replace view carrier_stats as
select
  c.id as carrier_id,
  0::bigint as total_loads,
  null::timestamptz as last_used
from carriers c;

notify pgrst, 'reload schema';

-- ============================================================================
-- Locations + Loads (TMS phase 2)
-- "Customers" reuses the existing companies table — no new customer
-- database. Loads reference companies, carriers, equipment_types, and
-- locations. Single pickup/delivery per load (see README for the
-- multi-stop tradeoff).
-- (For an existing project that already ran the sections above, run
--  supabase/migration_008_loads.sql instead of this whole file.)
-- ============================================================================

do $$ begin
  create type load_status as enum (
    'Quoted', 'Ordered', 'Pickup Scheduled', 'Picked Up', 'Delivery Scheduled', 'Delivered', 'Cancelled'
  );
exception
  when duplicate_object then null;
end $$;

create table if not exists locations (
  id uuid primary key default gen_random_uuid(),

  name text not null,
  address text,
  city text,
  state text,
  zip text,
  latitude double precision,
  longitude double precision,
  google_place_id text,

  contact_name text,
  contact_phone text,
  contact_email text,
  notes text,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists locations_name_idx on locations using gin (to_tsvector('english', name));

drop trigger if exists trg_locations_updated_at on locations;
create trigger trg_locations_updated_at
  before update on locations
  for each row execute function set_updated_at();

create sequence if not exists load_number_seq start 1001;

-- TMS Customers — a separate, smaller list from CRM Companies (see the
-- "TMS Customers" section further below for the full RLS/index setup;
-- defined here early since loads.customer_id references it).
create table if not exists tms_customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  address text,
  city text,
  state text,
  zip text,
  phone text,
  email text,
  accounting_contact_name text,
  accounting_contact_email text,
  accounting_contact_phone text,
  notes text,
  imported_from_company_id uuid references companies(id) on delete set null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tms_customers_name_idx on tms_customers using gin (to_tsvector('english', name));

drop trigger if exists trg_tms_customers_updated_at on tms_customers;
create trigger trg_tms_customers_updated_at
  before update on tms_customers
  for each row execute function set_updated_at();

alter table tms_customers enable row level security;
drop policy if exists "authenticated read tms_customers" on tms_customers;
create policy "authenticated read tms_customers" on tms_customers for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated write tms_customers" on tms_customers;
create policy "authenticated write tms_customers" on tms_customers for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated update tms_customers" on tms_customers;
create policy "authenticated update tms_customers" on tms_customers for update using (auth.role() = 'authenticated');
drop policy if exists "authenticated delete tms_customers" on tms_customers;
create policy "authenticated delete tms_customers" on tms_customers for delete using (auth.role() = 'authenticated');

create table if not exists loads (
  id uuid primary key default gen_random_uuid(),
  load_number bigint not null unique default nextval('load_number_seq'),

  customer_id uuid references tms_customers(id) on delete set null,
  carrier_id uuid references carriers(id) on delete set null,
  equipment_type_id uuid references equipment_types(id) on delete set null,

  pickup_location_id uuid references locations(id) on delete set null,
  delivery_location_id uuid references locations(id) on delete set null,
  pickup_date date,
  delivery_date date,

  status load_status not null default 'Quoted',

  commodity text,
  weight numeric,
  pieces integer,
  po_number text,
  bol_number text,

  customer_rate numeric(10, 2),
  carrier_cost numeric(10, 2),
  margin numeric(10, 2) generated always as
    (coalesce(customer_rate, 0) - coalesce(carrier_cost, 0)) stored,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists loads_customer_idx on loads(customer_id);
create index if not exists loads_carrier_idx on loads(carrier_id);
create index if not exists loads_status_idx on loads(status);
create index if not exists loads_pickup_date_idx on loads(pickup_date);
create index if not exists loads_number_idx on loads(load_number);

drop trigger if exists trg_loads_updated_at on loads;
create trigger trg_loads_updated_at
  before update on loads
  for each row execute function set_updated_at();

create table if not exists load_notes (
  id uuid primary key default gen_random_uuid(),
  load_id uuid not null references loads(id) on delete cascade,
  content text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists load_notes_load_idx on load_notes(load_id);

alter table locations enable row level security;
alter table loads enable row level security;
alter table load_notes enable row level security;

drop policy if exists "authenticated read locations" on locations;
create policy "authenticated read locations" on locations
  for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated write locations" on locations;
create policy "authenticated write locations" on locations
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated update locations" on locations;
create policy "authenticated update locations" on locations
  for update using (auth.role() = 'authenticated');
drop policy if exists "authenticated delete locations" on locations;
create policy "authenticated delete locations" on locations
  for delete using (auth.role() = 'authenticated');

drop policy if exists "authenticated read loads" on loads;
create policy "authenticated read loads" on loads
  for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated write loads" on loads;
create policy "authenticated write loads" on loads
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated update loads" on loads;
create policy "authenticated update loads" on loads
  for update using (auth.role() = 'authenticated');
drop policy if exists "authenticated delete loads" on loads;
create policy "authenticated delete loads" on loads
  for delete using (auth.role() = 'authenticated');

drop policy if exists "authenticated read load_notes" on load_notes;
create policy "authenticated read load_notes" on load_notes
  for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated write load_notes" on load_notes;
create policy "authenticated write load_notes" on load_notes
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated delete load_notes" on load_notes;
create policy "authenticated delete load_notes" on load_notes
  for delete using (auth.role() = 'authenticated');

create or replace view carrier_stats as
select
  c.id as carrier_id,
  count(l.id) as total_loads,
  max(l.pickup_date)::timestamptz as last_used
from carriers c
left join loads l on l.carrier_id = c.id
group by c.id;

-- ============================================================================
-- public_notes / private_notes on carriers
-- (For an existing project that already ran the sections above, run
--  supabase/migration_009_carrier_notes_fields.sql instead of this whole file.)
-- ============================================================================

alter table carriers add column if not exists public_notes text;
alter table carriers add column if not exists private_notes text;

-- ============================================================================
-- Location contacts, Location types, location notes, carrier document
-- descriptions
-- (For an existing project that already ran the sections above, run
--  supabase/migration_010_location_features.sql instead of this whole file.)
-- ============================================================================

alter table carrier_documents add column if not exists description text;

alter table locations add column if not exists public_notes text;
alter table locations add column if not exists private_notes text;

create table if not exists location_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

insert into location_types (name) values
  ('Residential'), ('Business'), ('Business with Dock'), ('Business with Forklift'), ('Construction Site'),
  ('Apartment'), ('Warehouse with Dock')
on conflict (name) do nothing;

alter table locations add column if not exists location_type_id uuid references location_types(id) on delete set null;

create table if not exists location_contacts (
  id uuid primary key default gen_random_uuid(),
  location_id uuid not null references locations(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists location_contacts_location_idx on location_contacts(location_id);

drop trigger if exists trg_location_contacts_updated_at on location_contacts;
create trigger trg_location_contacts_updated_at
  before update on location_contacts
  for each row execute function set_updated_at();

alter table location_types enable row level security;
alter table location_contacts enable row level security;

drop policy if exists "authenticated read location_types" on location_types;
create policy "authenticated read location_types" on location_types
  for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated write location_types" on location_types;
create policy "authenticated write location_types" on location_types
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated delete location_types" on location_types;
create policy "authenticated delete location_types" on location_types
  for delete using (auth.role() = 'authenticated');

drop policy if exists "authenticated read location_contacts" on location_contacts;
create policy "authenticated read location_contacts" on location_contacts
  for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated write location_contacts" on location_contacts;
create policy "authenticated write location_contacts" on location_contacts
  for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated update location_contacts" on location_contacts;
create policy "authenticated update location_contacts" on location_contacts
  for update using (auth.role() = 'authenticated');
drop policy if exists "authenticated delete location_contacts" on location_contacts;
create policy "authenticated delete location_contacts" on location_contacts
  for delete using (auth.role() = 'authenticated');

-- ============================================================================
-- Load form overhaul: references, commodity type, load size, declared
-- value, equipment length, public/private notes, handling units,
-- pickup/delivery time windows, driver info, financial line items.
-- (For an existing project that already ran the sections above, run
--  supabase/migration_012_load_overhaul.sql instead of this whole file —
--  that migration also renames the "Booked" status to "Ordered", which
--  this fresh-install schema already has built in above.)
-- ============================================================================

create table if not exists commodity_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
insert into commodity_types (name) values
  ('Dry Goods (General)'), ('Dry Goods (Food)'), ('Refrigerated (General)'), ('Refrigerated (Food)')
on conflict (name) do nothing;

create table if not exists piece_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
insert into piece_types (name) values
  ('Pallets'), ('Boxes'), ('Crates'), ('Drums'), ('Rolls'), ('Bundles'), ('Pieces'), ('Other')
on conflict (name) do nothing;

create table if not exists load_line_item_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);
insert into load_line_item_types (name) values
  ('Flat Rate'), ('Extra Stop'), ('Lumper'), ('Detention'), ('Layover'), ('Fuel Surcharge'), ('TONU'), ('Other')
on conflict (name) do nothing;

alter table loads add column if not exists commodity_type_id uuid references commodity_types(id) on delete set null;
alter table loads add column if not exists load_size text check (load_size in ('Full', 'Partial'));
alter table loads add column if not exists declared_value numeric(10, 2);
alter table loads add column if not exists equipment_length text;
alter table loads add column if not exists public_notes text;
alter table loads add column if not exists private_notes text;

alter table loads add column if not exists pickup_date_end date;
alter table loads add column if not exists pickup_time_start time;
alter table loads add column if not exists pickup_time_end time;
alter table loads add column if not exists delivery_date_end date;
alter table loads add column if not exists delivery_time_start time;
alter table loads add column if not exists delivery_time_end time;

alter table loads add column if not exists driver_name text;
alter table loads add column if not exists driver_phone text;

create table if not exists load_references (
  id uuid primary key default gen_random_uuid(),
  load_id uuid not null references loads(id) on delete cascade,
  label text not null default 'PO #',
  value text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists load_references_load_idx on load_references(load_id);

create table if not exists load_handling_units (
  id uuid primary key default gen_random_uuid(),
  load_id uuid not null references loads(id) on delete cascade,
  piece_type_id uuid references piece_types(id) on delete set null,
  quantity int not null default 1,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists load_handling_units_load_idx on load_handling_units(load_id);

create table if not exists load_line_items (
  id uuid primary key default gen_random_uuid(),
  load_id uuid not null references loads(id) on delete cascade,
  type_id uuid references load_line_item_types(id) on delete set null,
  quantity int not null default 1,
  amount numeric(10, 2) not null default 0,
  notes text,
  include_on_paperwork boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists load_line_items_load_idx on load_line_items(load_id);

alter table commodity_types enable row level security;
alter table piece_types enable row level security;
alter table load_line_item_types enable row level security;
alter table load_references enable row level security;
alter table load_handling_units enable row level security;
alter table load_line_items enable row level security;

drop policy if exists "authenticated read commodity_types" on commodity_types;
create policy "authenticated read commodity_types" on commodity_types for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated write commodity_types" on commodity_types;
create policy "authenticated write commodity_types" on commodity_types for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated delete commodity_types" on commodity_types;
create policy "authenticated delete commodity_types" on commodity_types for delete using (auth.role() = 'authenticated');

drop policy if exists "authenticated read piece_types" on piece_types;
create policy "authenticated read piece_types" on piece_types for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated write piece_types" on piece_types;
create policy "authenticated write piece_types" on piece_types for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated delete piece_types" on piece_types;
create policy "authenticated delete piece_types" on piece_types for delete using (auth.role() = 'authenticated');

drop policy if exists "authenticated read load_line_item_types" on load_line_item_types;
create policy "authenticated read load_line_item_types" on load_line_item_types for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated write load_line_item_types" on load_line_item_types;
create policy "authenticated write load_line_item_types" on load_line_item_types for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated delete load_line_item_types" on load_line_item_types;
create policy "authenticated delete load_line_item_types" on load_line_item_types for delete using (auth.role() = 'authenticated');

drop policy if exists "authenticated read load_references" on load_references;
create policy "authenticated read load_references" on load_references for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated write load_references" on load_references;
create policy "authenticated write load_references" on load_references for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated update load_references" on load_references;
create policy "authenticated update load_references" on load_references for update using (auth.role() = 'authenticated');
drop policy if exists "authenticated delete load_references" on load_references;
create policy "authenticated delete load_references" on load_references for delete using (auth.role() = 'authenticated');

drop policy if exists "authenticated read load_handling_units" on load_handling_units;
create policy "authenticated read load_handling_units" on load_handling_units for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated write load_handling_units" on load_handling_units;
create policy "authenticated write load_handling_units" on load_handling_units for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated update load_handling_units" on load_handling_units;
create policy "authenticated update load_handling_units" on load_handling_units for update using (auth.role() = 'authenticated');
drop policy if exists "authenticated delete load_handling_units" on load_handling_units;
create policy "authenticated delete load_handling_units" on load_handling_units for delete using (auth.role() = 'authenticated');

drop policy if exists "authenticated read load_line_items" on load_line_items;
create policy "authenticated read load_line_items" on load_line_items for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated write load_line_items" on load_line_items;
create policy "authenticated write load_line_items" on load_line_items for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated update load_line_items" on load_line_items;
create policy "authenticated update load_line_items" on load_line_items for update using (auth.role() = 'authenticated');
drop policy if exists "authenticated delete load_line_items" on load_line_items;
create policy "authenticated delete load_line_items" on load_line_items for delete using (auth.role() = 'authenticated');

-- ============================================================================
-- CRM lifecycle history, carrier payment/factoring, load stops, and the
-- income/expense line-item financial model.
-- (For an existing project that already ran the sections above, run
--  supabase/migration_013_lifecycle_and_stops.sql instead of this whole
--  file — that migration also adds the 'Quoted'/'Work Received' activity
--  types, which this fresh-install schema already has built in above.)
-- ============================================================================

create table if not exists company_status_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references companies(id) on delete cascade,
  from_status company_status,
  to_status company_status not null,
  changed_by uuid references auth.users(id) on delete set null,
  changed_at timestamptz not null default now()
);
create index if not exists company_status_history_company_idx on company_status_history(company_id);

create or replace function log_company_status_change()
returns trigger as $$
begin
  if old.status is distinct from new.status then
    insert into company_status_history (company_id, from_status, to_status)
    values (new.id, old.status, new.status);
  end if;
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_log_company_status_change on companies;
create trigger trg_log_company_status_change
  after update on companies
  for each row execute function log_company_status_change();

create table if not exists factoring_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table carriers add column if not exists payment_method text check (payment_method in ('Factoring', 'ACH'));
alter table carriers add column if not exists factoring_company_id uuid references factoring_companies(id) on delete set null;

create table if not exists load_stops (
  id uuid primary key default gen_random_uuid(),
  load_id uuid not null references loads(id) on delete cascade,
  stop_type text not null check (stop_type in ('Pickup', 'Delivery')),
  sequence int not null default 0,
  location_id uuid references locations(id) on delete set null,
  date_start date,
  date_end date,
  time_start time,
  time_end time,
  created_at timestamptz not null default now()
);
create index if not exists load_stops_load_idx on load_stops(load_id);

alter table loads add column if not exists freight_charge_terms text
  check (freight_charge_terms in ('Prepaid', 'Collect', '3rd Party'));

alter table load_line_items add column if not exists side text not null default 'income' check (side in ('income', 'expense'));

alter table factoring_companies enable row level security;
alter table load_stops enable row level security;
alter table company_status_history enable row level security;

drop policy if exists "authenticated read factoring_companies" on factoring_companies;
create policy "authenticated read factoring_companies" on factoring_companies for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated write factoring_companies" on factoring_companies;
create policy "authenticated write factoring_companies" on factoring_companies for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated delete factoring_companies" on factoring_companies;
create policy "authenticated delete factoring_companies" on factoring_companies for delete using (auth.role() = 'authenticated');

drop policy if exists "authenticated read load_stops" on load_stops;
create policy "authenticated read load_stops" on load_stops for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated write load_stops" on load_stops;
create policy "authenticated write load_stops" on load_stops for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated update load_stops" on load_stops;
create policy "authenticated update load_stops" on load_stops for update using (auth.role() = 'authenticated');
drop policy if exists "authenticated delete load_stops" on load_stops;
create policy "authenticated delete load_stops" on load_stops for delete using (auth.role() = 'authenticated');

drop policy if exists "authenticated read company_status_history" on company_status_history;
create policy "authenticated read company_status_history" on company_status_history for select using (auth.role() = 'authenticated');

create or replace view carrier_stats as
select
  c.id as carrier_id,
  count(distinct l.id) as total_loads,
  max(ls.date_start)::timestamptz as last_used
from carriers c
left join loads l on l.carrier_id = c.id
left join load_stops ls on ls.load_id = l.id and ls.stop_type = 'Pickup'
group by c.id;

-- ============================================================================
-- Per-stop notes/contact info, and the full factoring company seed list.
-- (For an existing project that already ran the sections above, run
--  supabase/migration_014_tms_customers_and_stop_details.sql instead of
--  this whole file — that migration also creates tms_customers from
--  scratch and migrates existing loads onto it, which this fresh-install
--  schema already has built in above.)
-- ============================================================================

alter table load_stops add column if not exists notes text;
alter table load_stops add column if not exists contact_name text;
alter table load_stops add column if not exists contact_phone text;

insert into factoring_companies (name) values
  ('None'),
  ('Advanced Capital Solutions'),
  ('Apex Capital Corp.'),
  ('BasicBlock'),
  ('Blue Water Capital'),
  ('Bobtail'),
  ('BridgeHaul'),
  ('Cashway Funding'),
  ('Century Finance'),
  ('ComFreight HaulPay'),
  ('Dorado Finance'),
  ('eCapital'),
  ('Engaged Financial'),
  ('England Logistics'),
  ('Express Freight Finance'),
  ('Factoring Express LLC'),
  ('Financial Carrier Services'),
  ('FirstLine Funding Group'),
  ('Flat Rate Funding Group'),
  ('Freight Factors'),
  ('G Squared Funding'),
  ('GH Factor'),
  ('HMD Financial'),
  ('Insight Financial'),
  ('Integrity Factoring'),
  ('Integra Funding'),
  ('iThrive Funding'),
  ('JD Factors'),
  ('Little Mountain Logistics'),
  ('Love''s Financial / Love''s Solutions'),
  ('Orange Commercial Credit'),
  ('OTR Solutions'),
  ('Outgo'),
  ('Phoenix Capital Group'),
  ('Porter Freight Funding'),
  ('Provident Commercial Finance'),
  ('QuickPay Funding'),
  ('RTS Financial'),
  ('Saint John Capital'),
  ('Smart Freight Funding'),
  ('Steelhead Finance'),
  ('Strato Pay'),
  ('Sunbelt Finance'),
  ('TAFS'),
  ('TBS Factoring'),
  ('Thunder Funding'),
  ('Treadstone Funding'),
  ('TRILOGY'),
  ('TRU Funding'),
  ('Triumph Business Capital'),
  ('Truckstop Factoring'),
  ('WEX Capital'),
  ('Yankton Factoring')
on conflict (name) do nothing;

-- ============================================================================
-- TMS customer billing details + accounting contacts list, and load pay
-- status fields.
-- (For an existing project that already ran the sections above, run
--  supabase/migration_015_tms_billing_and_pay_status.sql instead of this
--  whole file.)
-- ============================================================================

alter table tms_customers add column if not exists billing_cycle text
  check (billing_cycle in ('Per Load', 'Weekly', 'Bi-Weekly', 'Monthly'));
alter table tms_customers add column if not exists payment_method text
  check (payment_method in ('ACH', 'Check', 'QuickBooks Portal'));
alter table tms_customers add column if not exists credit_limit numeric(12, 2);

create table if not exists tms_customer_contacts (
  id uuid primary key default gen_random_uuid(),
  tms_customer_id uuid not null references tms_customers(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tms_customer_contacts_customer_idx on tms_customer_contacts(tms_customer_id);

drop trigger if exists trg_tms_customer_contacts_updated_at on tms_customer_contacts;
create trigger trg_tms_customer_contacts_updated_at
  before update on tms_customer_contacts
  for each row execute function set_updated_at();

alter table tms_customer_contacts enable row level security;
drop policy if exists "authenticated read tms_customer_contacts" on tms_customer_contacts;
create policy "authenticated read tms_customer_contacts" on tms_customer_contacts for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated write tms_customer_contacts" on tms_customer_contacts;
create policy "authenticated write tms_customer_contacts" on tms_customer_contacts for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated update tms_customer_contacts" on tms_customer_contacts;
create policy "authenticated update tms_customer_contacts" on tms_customer_contacts for update using (auth.role() = 'authenticated');
drop policy if exists "authenticated delete tms_customer_contacts" on tms_customer_contacts;
create policy "authenticated delete tms_customer_contacts" on tms_customer_contacts for delete using (auth.role() = 'authenticated');

alter table loads add column if not exists carrier_pay_status text
  check (carrier_pay_status is null or carrier_pay_status in ('Invoiced', 'Paid', 'N/A'));
alter table loads add column if not exists pgl_pay_status text
  check (pgl_pay_status is null or pgl_pay_status in ('Invoiced', 'Paid', 'N/A'));

-- ============================================================================
-- Load Documents module.
-- (For an existing project that already ran the sections above, run
--  supabase/migration_016_pay_status_and_load_documents.sql instead of
--  this whole file.)
-- ============================================================================

do $$ begin
  create type load_document_type as enum ('Load Confirmation', 'POD', 'Carrier Invoice', 'Other');
exception
  when duplicate_object then null;
end $$;

create table if not exists load_documents (
  id uuid primary key default gen_random_uuid(),
  load_id uuid not null references loads(id) on delete cascade,
  document_type load_document_type not null,
  description text,
  file_name text not null,
  file_path text not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_at timestamptz not null default now()
);
create index if not exists load_documents_load_idx on load_documents(load_id);
create index if not exists load_documents_type_idx on load_documents(document_type);

alter table load_documents enable row level security;
drop policy if exists "authenticated read load_documents" on load_documents;
create policy "authenticated read load_documents" on load_documents for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated write load_documents" on load_documents;
create policy "authenticated write load_documents" on load_documents for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated delete load_documents" on load_documents;
create policy "authenticated delete load_documents" on load_documents for delete using (auth.role() = 'authenticated');

-- ============================================================================
-- Carrier ratings.
-- (For an existing project that already ran the sections above, run
--  supabase/migration_017_load_status_and_carrier_ratings.sql instead of
--  this whole file — that migration also handles remapping the old load
--  status values, which this fresh-install schema doesn't need since
--  there's no existing data.)
-- ============================================================================

create table if not exists carrier_ratings (
  id uuid primary key default gen_random_uuid(),
  carrier_id uuid not null references carriers(id) on delete cascade,
  load_id uuid references loads(id) on delete set null,
  stars int not null check (stars between 1 and 5),
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists carrier_ratings_carrier_idx on carrier_ratings(carrier_id);
create index if not exists carrier_ratings_load_idx on carrier_ratings(load_id);

alter table carrier_ratings enable row level security;
drop policy if exists "authenticated read carrier_ratings" on carrier_ratings;
create policy "authenticated read carrier_ratings" on carrier_ratings for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated write carrier_ratings" on carrier_ratings;
create policy "authenticated write carrier_ratings" on carrier_ratings for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated delete carrier_ratings" on carrier_ratings;
create policy "authenticated delete carrier_ratings" on carrier_ratings for delete using (auth.role() = 'authenticated');

create or replace view carrier_stats as
select
  c.id as carrier_id,
  count(distinct l.id) as total_loads,
  max(ls.date_start)::timestamptz as last_used,
  round(avg(cr.stars)::numeric, 1) as avg_rating,
  count(distinct cr.id) as rating_count
from carriers c
left join loads l on l.carrier_id = c.id
left join load_stops ls on ls.load_id = l.id and ls.stop_type = 'Pickup'
left join carrier_ratings cr on cr.carrier_id = c.id
group by c.id;
