-- ============================================================================
-- Migration: Carrier Pay / PGL Pay status can now be blank or "N/A" (not
-- just Invoiced/Paid), and a Load Documents module (mirrors Carrier
-- Documents: fixed types + unlimited "Other" with descriptions).
-- ============================================================================

alter table loads drop constraint if exists loads_carrier_pay_status_check;
alter table loads alter column carrier_pay_status drop not null;
alter table loads alter column carrier_pay_status drop default;
alter table loads add constraint loads_carrier_pay_status_check
  check (carrier_pay_status is null or carrier_pay_status in ('Invoiced', 'Paid', 'N/A'));

alter table loads drop constraint if exists loads_pgl_pay_status_check;
alter table loads alter column pgl_pay_status drop not null;
alter table loads alter column pgl_pay_status drop default;
alter table loads add constraint loads_pgl_pay_status_check
  check (pgl_pay_status is null or pgl_pay_status in ('Invoiced', 'Paid', 'N/A'));

-- ----------------------------------------------------------------------------
-- Load Documents — same pattern as Carrier Documents: a handful of fixed
-- single-slot types, plus unlimited "Other" documents each with their own
-- description. Reuses the existing private "carrier-documents" Storage
-- bucket under a "loads/" prefix rather than requiring a second bucket.
-- ----------------------------------------------------------------------------
do $$ begin
  create type load_document_type as enum ('Load Confirmation', 'POD', 'Carrier Invoice', 'Other');
exception
  when duplicate_object then null;
end $$;

create table if not exists load_documents (
  id uuid primary key default gen_random_uuid(),
  load_id uuid not null references loads(id) on delete cascade,
  document_type load_document_type not null,
  description text,
  file_name text not null,
  file_path text not null,
  uploaded_by uuid references auth.users(id) on delete set null,
  uploaded_at timestamptz not null default now()
);
create index if not exists load_documents_load_idx on load_documents(load_id);
create index if not exists load_documents_type_idx on load_documents(document_type);

alter table load_documents enable row level security;
drop policy if exists "authenticated read load_documents" on load_documents;
create policy "authenticated read load_documents" on load_documents for select using (auth.role() = 'authenticated');
drop policy if exists "authenticated write load_documents" on load_documents;
create policy "authenticated write load_documents" on load_documents for insert with check (auth.role() = 'authenticated');
drop policy if exists "authenticated delete load_documents" on load_documents;
create policy "authenticated delete load_documents" on load_documents for delete using (auth.role() = 'authenticated');

notify pgrst, 'reload schema';
