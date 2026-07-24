-- ============================================================================
-- Migration: Carrier Management module (TMS phase 1).
-- Mirrors the existing Customer CRM's architecture closely (companies /
-- contacts / notes) so the two modules feel and behave consistently.
-- Shared team data, same RLS pattern as companies (authenticated = full
-- access) — not personal-per-user like user_settings/notepad.
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
  create type carrier_document_type as enum ('MC Certificate', 'W-9', 'COI', 'NOA / ACH', 'Other');
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
