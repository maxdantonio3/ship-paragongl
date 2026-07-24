-- ============================================================================
-- Migration: Load form overhaul.
-- Adds: multiple reference/PO numbers, commodity type (lookup), load size,
-- declared value, equipment length, public/private load notes, handling
-- units (piece type + qty, repeatable), pickup/delivery date+time windows,
-- driver info, and financial line items (repeatable, with paperwork flag).
-- Also renames the "Booked" load status to "Ordered".
-- ============================================================================

-- "Booked" -> "Ordered". Must run as its own statement (not combined with
-- anything that uses the renamed value in the same transaction).
alter type load_status rename value 'Booked' to 'Ordered';

-- ----------------------------------------------------------------------------
-- New lookup tables (same extensible pattern as equipment_types / location_types)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Loads table additions
-- ----------------------------------------------------------------------------
alter table loads add column if not exists commodity_type_id uuid references commodity_types(id) on delete set null;
alter table loads add column if not exists load_size text check (load_size in ('Full', 'Partial'));
alter table loads add column if not exists declared_value numeric(10, 2);
alter table loads add column if not exists equipment_length text;
alter table loads add column if not exists public_notes text;
alter table loads add column if not exists private_notes text;

-- Pickup/delivery: keep the existing pickup_date/delivery_date columns
-- (used for sorting, carrier_stats "last used", etc.) and add optional
-- time-window fields on top. If *_time_end is null, it's a specific time,
-- not a window. If *_date_end is set and differs from the start date, the
-- window spans multiple days.
alter table loads add column if not exists pickup_date_end date;
alter table loads add column if not exists pickup_time_start time;
alter table loads add column if not exists pickup_time_end time;
alter table loads add column if not exists delivery_date_end date;
alter table loads add column if not exists delivery_time_start time;
alter table loads add column if not exists delivery_time_end time;

alter table loads add column if not exists driver_name text;
alter table loads add column if not exists driver_phone text;

-- ----------------------------------------------------------------------------
-- Reference / PO numbers - multiple per load, each with its own label
-- (e.g. "PO #", "Ref #", "Pickup #"). Replaces the old single po_number
-- field going forward (that column stays in place, just unused by the new
-- form, so nothing breaks for any load that already has one set).
-- ----------------------------------------------------------------------------
create table if not exists load_references (
  id uuid primary key default gen_random_uuid(),
  load_id uuid not null references loads(id) on delete cascade,
  label text not null default 'PO #',
  value text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists load_references_load_idx on load_references(load_id);

-- ----------------------------------------------------------------------------
-- Handling units - piece type + quantity, repeatable per load
-- ----------------------------------------------------------------------------
create table if not exists load_handling_units (
  id uuid primary key default gen_random_uuid(),
  load_id uuid not null references loads(id) on delete cascade,
  piece_type_id uuid references piece_types(id) on delete set null,
  quantity int not null default 1,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists load_handling_units_load_idx on load_handling_units(load_id);

-- ----------------------------------------------------------------------------
-- Financial line items - accessorials on top of the base customer
-- rate/carrier cost (Flat Rate, Extra Stop, Lumper, etc.), each with a
-- quantity, a per-line amount, notes, and whether it should show up on
-- generated paperwork (invoices/rate confirmations) once that exists.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- RLS - shared team data, same pattern as everything else in this module.
-- ----------------------------------------------------------------------------
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

notify pgrst, 'reload schema';
