-- ============================================================================
-- Migration: TMS customer billing details (cycle, payment method, credit
-- limit) + a proper accounting-contacts list, and Carrier Pay / PGL Pay
-- status fields on loads.
-- ============================================================================

alter table tms_customers add column if not exists billing_cycle text
  check (billing_cycle in ('Per Load', 'Weekly', 'Bi-Weekly', 'Monthly'));
alter table tms_customers add column if not exists payment_method text
  check (payment_method in ('ACH', 'Check', 'QuickBooks Portal'));
alter table tms_customers add column if not exists credit_limit numeric(12, 2);

-- Accounting contacts — a real list now, not just one flat name/email/phone.
create table if not exists tms_customer_contacts (
  id uuid primary key default gen_random_uuid(),
  tms_customer_id uuid not null references tms_customers(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tms_customer_contacts_customer_idx on tms_customer_contacts(tms_customer_id);

drop trigger if exists trg_tms_customer_contacts_updated_at on tms_customer_contacts;
create trigger trg_tms_customer_contacts_updated_at
  before update on tms_customer_contacts
  for each row execute function set_updated_at();

alter table tms_customer_contacts enable row level security;
drop policy if exists "authenticated read tms_customer_contacts" on tms_customer_contacts;
create policy "authenticated read tms_customer_contacts" on tms_customer_contacts for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated write tms_customer_contacts" on tms_customer_contacts;
create policy "authenticated write tms_customer_contacts" on tms_customer_contacts for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated update tms_customer_contacts" on tms_customer_contacts;
create policy "authenticated update tms_customer_contacts" on tms_customer_contacts for update using (auth.role() = 'authenticated');
drop policy if exists "authenticated delete tms_customer_contacts" on tms_customer_contacts;
create policy "authenticated delete tms_customer_contacts" on tms_customer_contacts for delete using (auth.role() = 'authenticated');

-- Migrate any existing single accounting_contact_* values into the new
-- contacts list, so nothing already filled in gets lost.
insert into tms_customer_contacts (tms_customer_id, name, phone, email)
select id, accounting_contact_name, accounting_contact_phone, accounting_contact_email
from tms_customers
where accounting_contact_name is not null;

-- ----------------------------------------------------------------------------
-- Carrier Pay / PGL Pay status on loads
-- ----------------------------------------------------------------------------
alter table loads add column if not exists carrier_pay_status text
  check (carrier_pay_status in ('Invoiced', 'Paid')) not null default 'Invoiced';
alter table loads add column if not exists pgl_pay_status text
  check (pgl_pay_status in ('Invoiced', 'Paid')) not null default 'Invoiced';

notify pgrst, 'reload schema';
