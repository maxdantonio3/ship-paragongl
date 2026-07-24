-- ============================================================================
-- Migration: Load status overhaul + Carrier Rating system.
--
-- Load status: Quoted, Ordered, Pickup Scheduled, Picked Up, Delivery
-- Scheduled, Delivered, Cancelled. "Invoiced"/"Paid" are removed (Carrier
-- Pay Status / PGL Pay Status already track that separately), and
-- "Dispatched"/"In Transit" are replaced by the more specific new set.
-- Postgres can't drop enum values directly, so this rebuilds the column
-- with a new enum type and remaps existing data:
--   Dispatched -> Pickup Scheduled, In Transit -> Picked Up,
--   Invoiced/Paid -> Delivered (they were already delivered)
-- ============================================================================

create type load_status_new as enum (
  'Quoted', 'Ordered', 'Pickup Scheduled', 'Picked Up', 'Delivery Scheduled', 'Delivered', 'Cancelled'
);

alter table loads add column status_new load_status_new;

update loads set status_new = (
  case status::text
    when 'Quoted' then 'Quoted'
    when 'Ordered' then 'Ordered'
    when 'Dispatched' then 'Pickup Scheduled'
    when 'In Transit' then 'Picked Up'
    when 'Delivered' then 'Delivered'
    when 'Invoiced' then 'Delivered'
    when 'Paid' then 'Delivered'
    when 'Cancelled' then 'Cancelled'
    else 'Quoted'
  end
)::load_status_new;

alter table loads drop column status;
alter table loads rename column status_new to status;
alter table loads alter column status set not null;
alter table loads alter column status set default 'Quoted';

drop type load_status;
alter type load_status_new rename to load_status;

-- ----------------------------------------------------------------------------
-- Carrier ratings — 1-5 stars + an optional note, tied to the load that
-- prompted it (nullable, since a rating can also be added later on its
-- own, not just at the moment of marking a load Delivered).
-- ----------------------------------------------------------------------------
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

-- carrier_stats now also carries the average rating + rating count, so
-- the Carrier Dashboard's "Carrier Rating" column (currently a static
-- "Coming soon") can show something real.
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

notify pgrst, 'reload schema';
