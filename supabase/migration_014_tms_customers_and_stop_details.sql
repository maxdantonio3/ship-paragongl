-- ============================================================================
-- Migration: TMS Customers (separate from CRM companies), stop-level notes
-- and pickup/delivery contact info, and a full factoring company seed list.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- TMS Customers — a separate, smaller list from CRM Companies. Loads
-- reference this table now, not companies directly. Existing loads keep
-- their customer via a one-time migration below (a tms_customer record is
-- created for every company any load already pointed to, and the load is
-- repointed at it).
-- ----------------------------------------------------------------------------
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

-- One-time data migration: create a tms_customer for every company any
-- existing load already references, then repoint those loads at the new
-- tms_customer instead of the CRM company.
insert into tms_customers (name, address, city, state, zip, phone, email, imported_from_company_id)
select distinct on (c.id) c.name, c.address, c.city, c.state, c.zip, c.phone, c.email, c.id
from companies c
where c.id in (select distinct customer_id from loads where customer_id is not null);

update loads l
set customer_id = tc.id
from tms_customers tc
where tc.imported_from_company_id = l.customer_id;

-- Repoint the FK itself from companies to tms_customers.
alter table loads drop constraint if exists loads_customer_id_fkey;
alter table loads add constraint loads_customer_id_fkey foreign key (customer_id) references tms_customers(id) on delete set null;

-- ----------------------------------------------------------------------------
-- Per-stop notes and contact info
-- ----------------------------------------------------------------------------
alter table load_stops add column if not exists notes text;
alter table load_stops add column if not exists contact_name text;
alter table load_stops add column if not exists contact_phone text;

-- ----------------------------------------------------------------------------
-- Factoring companies — full seed list.
-- ----------------------------------------------------------------------------
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

notify pgrst, 'reload schema';
