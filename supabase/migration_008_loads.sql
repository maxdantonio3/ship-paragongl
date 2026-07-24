-- ============================================================================
-- Migration: Locations + Loads (TMS phase 2).
-- "Customers" reuses the existing companies table — no new customer
-- database. Loads reference companies, carriers, equipment_types, and
-- locations, all of which already exist except locations (new here).
-- Single pickup/delivery per load for now (95% real-world case) rather
-- than a flexible multi-stop table — see README for the tradeoff.
-- ============================================================================

do $$ begin
  create type load_status as enum (
    'Quoted', 'Booked', 'Dispatched', 'In Transit', 'Delivered', 'Invoiced', 'Paid', 'Cancelled'
  );
exception
  when duplicate_object then null;
end $$;

-- ----------------------------------------------------------------------------
-- Locations — reusable pickup/delivery addresses, same idea as Carriers:
-- pick one from Google Places once, reuse it on every future load instead
-- of retyping the same warehouse address every time.
-- ----------------------------------------------------------------------------
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
  notes text, -- hours, dock/appointment info, anything worth remembering

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists locations_name_idx on locations using gin (to_tsvector('english', name));

drop trigger if exists trg_locations_updated_at on locations;
create trigger trg_locations_updated_at
  before update on locations
  for each row execute function set_updated_at();

-- ----------------------------------------------------------------------------
-- Loads — the core TMS record.
-- ----------------------------------------------------------------------------
create sequence if not exists load_number_seq start 1001;

create table if not exists loads (
  id uuid primary key default gen_random_uuid(),
  load_number bigint not null unique default nextval('load_number_seq'),

  customer_id uuid references companies(id) on delete set null,
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

-- ----------------------------------------------------------------------------
-- Load notes (Quick Notes — same pattern as companies/carriers)
-- ----------------------------------------------------------------------------
create table if not exists load_notes (
  id uuid primary key default gen_random_uuid(),
  load_id uuid not null references loads(id) on delete cascade,
  content text not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists load_notes_load_idx on load_notes(load_id);

-- ----------------------------------------------------------------------------
-- Row Level Security — shared team data, same pattern as companies/carriers.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Now that loads exists, carrier_stats becomes real (was hardcoded zeros).
-- The dashboard/profile code that reads this view doesn't change at all —
-- only this definition does.
-- ----------------------------------------------------------------------------
create or replace view carrier_stats as
select
  c.id as carrier_id,
  count(l.id) as total_loads,
  max(l.pickup_date)::timestamptz as last_used
from carriers c
left join loads l on l.carrier_id = c.id
group by c.id;

notify pgrst, 'reload schema';
