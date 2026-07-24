-- ============================================================================
-- Migration: CRM activity types + lifecycle history, carrier payment
-- method/factoring, load stops (multi pickup/delivery), and the
-- income/expense line-item financial model.
-- ============================================================================

-- New activity types. Must run as their own statement (not combined with
-- anything using the new values in the same transaction).
alter type activity_type add value if not exists 'Quoted';
alter type activity_type add value if not exists 'Work Received';

-- ----------------------------------------------------------------------------
-- Company status history — records every status transition with a
-- timestamp, so a lifecycle timeline (first contact -> quotes -> Customer)
-- can be reconstructed later. Not reviewed/analyzed anywhere yet — this
-- migration just makes sure the data exists going forward.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Carrier payment method / factoring
-- ----------------------------------------------------------------------------
create table if not exists factoring_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table carriers add column if not exists payment_method text check (payment_method in ('Factoring', 'ACH'));
alter table carriers add column if not exists factoring_company_id uuid references factoring_companies(id) on delete set null;

-- ----------------------------------------------------------------------------
-- Load stops — replaces relying on the flat pickup_location_id/date/etc
-- columns on loads (those columns stay in place for backward compatibility
-- but the form now always uses stops, including for the first pickup and
-- first delivery, so more than one of either can be added later).
-- ----------------------------------------------------------------------------
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

-- income = charged to the customer, expense = paid to the carrier. Lets
-- customer_rate/carrier_cost on loads become denormalized totals (kept in
-- sync by the app whenever line items are saved) rather than directly
-- typed numbers, so the existing generated `margin` column keeps working
-- without needing to become a cross-table computation.
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

-- ----------------------------------------------------------------------------
-- carrier_stats: "last_used" now looks at load_stops (pickup stops) instead
-- of loads.pickup_date, since the new form populates stops going forward.
-- ----------------------------------------------------------------------------
create or replace view carrier_stats as
select
  c.id as carrier_id,
  count(distinct l.id) as total_loads,
  max(ls.date_start)::timestamptz as last_used
from carriers c
left join loads l on l.carrier_id = c.id
left join load_stops ls on ls.load_id = l.id and ls.stop_type = 'Pickup'
group by c.id;

notify pgrst, 'reload schema';
