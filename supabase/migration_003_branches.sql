-- ============================================================================
-- Migration: Branches (optional divisions, e.g. Freight vs E-commerce
-- Fulfillment). Entirely opt-in — a company with no branch set behaves
-- exactly as before. Nothing in analytics or the dashboard requires a
-- branch to be set.
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

notify pgrst, 'reload schema';
