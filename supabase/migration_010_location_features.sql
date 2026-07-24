-- ============================================================================
-- Migration: Location contacts, Location types (lookup table, like
-- equipment_types), public/private notes on locations, and a description
-- field on carrier_documents (so multiple "Other" documents can each have
-- their own label).
-- ============================================================================

alter table carrier_documents add column if not exists description text;

alter table locations add column if not exists public_notes text;
alter table locations add column if not exists private_notes text;

-- ----------------------------------------------------------------------------
-- Location types — a lookup table, same pattern as equipment_types, so more
-- can be added later without a code change.
-- ----------------------------------------------------------------------------
create table if not exists location_types (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

insert into location_types (name) values
  ('Residential'), ('Business'), ('Business with Dock'), ('Business with Forklift'), ('Construction Site')
on conflict (name) do nothing;

alter table locations add column if not exists location_type_id uuid references location_types(id) on delete set null;

-- ----------------------------------------------------------------------------
-- Location contacts — simpler than carrier contacts: just name/phone/email,
-- no position.
-- ----------------------------------------------------------------------------
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

notify pgrst, 'reload schema';
