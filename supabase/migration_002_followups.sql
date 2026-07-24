-- ============================================================================
-- Migration: Follow-up dates + per-user settings
-- Run this in the Supabase SQL Editor on top of the existing schema.
-- Safe to re-run (uses if-not-exists / drop-if-exists guards throughout).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. companies.next_follow_up_date — the one field that drives "who's due"
-- ----------------------------------------------------------------------------
alter table companies add column if not exists next_follow_up_date date;
create index if not exists companies_next_follow_up_idx on companies(next_follow_up_date);

-- ----------------------------------------------------------------------------
-- 2. user_settings — per-person preferences (not shared across the team,
--    unlike everything else in this app)
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- 3. Auto-standardize next_follow_up_date whenever an activity is logged.
--
--    - If the activity itself specifies a follow-up date, that wins outright.
--    - Otherwise, it's set to (activity date + the logging user's
--      default_follow_up_days, or 7 if they haven't set a preference).
--
--    Logging a new activity always refreshes this value. A manual edit made
--    directly on the company profile sticks until the next activity comes in.
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- Notify PostgREST to pick up the new column/table immediately.
-- ----------------------------------------------------------------------------
notify pgrst, 'reload schema';
