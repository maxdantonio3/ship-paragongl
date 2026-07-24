-- ============================================================================
-- Migration: Notepad tool (Quick Notes checklist + Freeform sheet).
-- Personal to each user, like user_settings — not shared team data like
-- companies/contacts/activities.
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

notify pgrst, 'reload schema';
