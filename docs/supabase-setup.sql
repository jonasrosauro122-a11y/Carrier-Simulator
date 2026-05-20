-- LAVA CarrierOps Training Portal - Supabase Setup
-- Run this in Supabase SQL Editor.
-- This setup is intended for TRAINING / SIMULATOR use only.
-- It allows anonymous frontend access because the static Netlify site has no backend.
-- Do not use this policy design for real customer data.

create extension if not exists pgcrypto;

create table if not exists public.carrier_policies (
  id uuid primary key default gen_random_uuid(),
  policy_number text unique not null,
  policy_type text not null,
  named_insured text not null,
  email text,
  phone text,
  address text,
  status text default 'Active',
  carrier text default 'CarrierOps Mutual',
  agency text,
  effective_date date,
  expiration_date date,
  premium numeric default 0,
  balance numeric default 0,
  risk_score numeric default 0,
  data jsonb default '{}'::jsonb,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.carrier_quotes (
  id uuid primary key default gen_random_uuid(),
  quote_number text unique,
  quote_type text,
  named_insured text,
  status text,
  premium numeric default 0,
  data jsonb default '{}'::jsonb,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.carrier_endorsements (
  id uuid primary key default gen_random_uuid(),
  policy_number text,
  endorsement_type text,
  effective_date date,
  requested_by text,
  current_info text,
  new_info text,
  premium_impact text,
  premium_delta numeric default 0,
  status text default 'Pending Review',
  remark text,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.carrier_payments (
  id uuid primary key default gen_random_uuid(),
  policy_number text,
  amount numeric default 0,
  payment_method text,
  payment_date date,
  payer_name text,
  notes text,
  confirmation_number text unique,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.carrier_cancellations (
  id uuid primary key default gen_random_uuid(),
  policy_number text,
  cancellation_type text,
  effective_date date,
  requested_by text,
  proof_received text,
  refund_method text,
  status text default 'Pending Review',
  reason text,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.carrier_documents (
  id uuid primary key default gen_random_uuid(),
  policy_number text,
  document_type text,
  file_name text,
  mime_type text,
  size_bytes bigint default 0,
  storage_path text,
  data_url text,
  uploaded_by text,
  related_record_id text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.carrier_remarketing (
  id uuid primary key default gen_random_uuid(),
  policy_number text,
  reason text,
  target_effective date,
  target_premium numeric default 0,
  notes text,
  markets jsonb default '[]'::jsonb,
  created_by text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists public.carrier_audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  policy_number text,
  details jsonb default '{}'::jsonb,
  performed_by text,
  user_email text,
  created_at timestamptz default now()
);

create table if not exists public.carrier_login_logs (
  id uuid primary key default gen_random_uuid(),
  user_name text,
  user_email text,
  role text,
  created_at timestamptz default now()
);

-- Useful indexes
create index if not exists idx_carrier_policies_policy_number on public.carrier_policies(policy_number);
create index if not exists idx_carrier_policies_named_insured on public.carrier_policies(named_insured);
create index if not exists idx_carrier_documents_policy_number on public.carrier_documents(policy_number);
create index if not exists idx_carrier_audit_policy_number on public.carrier_audit_logs(policy_number);

-- Enable RLS
alter table public.carrier_policies enable row level security;
alter table public.carrier_quotes enable row level security;
alter table public.carrier_endorsements enable row level security;
alter table public.carrier_payments enable row level security;
alter table public.carrier_cancellations enable row level security;
alter table public.carrier_documents enable row level security;
alter table public.carrier_remarketing enable row level security;
alter table public.carrier_audit_logs enable row level security;
alter table public.carrier_login_logs enable row level security;

-- Training policies: allow anon CRUD for simulator data.
-- Remove these and use Supabase Auth for production.
drop policy if exists "training read policies" on public.carrier_policies;
drop policy if exists "training write policies" on public.carrier_policies;
create policy "training read policies" on public.carrier_policies for select using (true);
create policy "training write policies" on public.carrier_policies for all using (true) with check (true);

drop policy if exists "training read quotes" on public.carrier_quotes;
drop policy if exists "training write quotes" on public.carrier_quotes;
create policy "training read quotes" on public.carrier_quotes for select using (true);
create policy "training write quotes" on public.carrier_quotes for all using (true) with check (true);

drop policy if exists "training read endorsements" on public.carrier_endorsements;
drop policy if exists "training write endorsements" on public.carrier_endorsements;
create policy "training read endorsements" on public.carrier_endorsements for select using (true);
create policy "training write endorsements" on public.carrier_endorsements for all using (true) with check (true);

drop policy if exists "training read payments" on public.carrier_payments;
drop policy if exists "training write payments" on public.carrier_payments;
create policy "training read payments" on public.carrier_payments for select using (true);
create policy "training write payments" on public.carrier_payments for all using (true) with check (true);

drop policy if exists "training read cancellations" on public.carrier_cancellations;
drop policy if exists "training write cancellations" on public.carrier_cancellations;
create policy "training read cancellations" on public.carrier_cancellations for select using (true);
create policy "training write cancellations" on public.carrier_cancellations for all using (true) with check (true);

drop policy if exists "training read documents" on public.carrier_documents;
drop policy if exists "training write documents" on public.carrier_documents;
create policy "training read documents" on public.carrier_documents for select using (true);
create policy "training write documents" on public.carrier_documents for all using (true) with check (true);

drop policy if exists "training read remarketing" on public.carrier_remarketing;
drop policy if exists "training write remarketing" on public.carrier_remarketing;
create policy "training read remarketing" on public.carrier_remarketing for select using (true);
create policy "training write remarketing" on public.carrier_remarketing for all using (true) with check (true);

drop policy if exists "training read audit" on public.carrier_audit_logs;
drop policy if exists "training write audit" on public.carrier_audit_logs;
create policy "training read audit" on public.carrier_audit_logs for select using (true);
create policy "training write audit" on public.carrier_audit_logs for all using (true) with check (true);

drop policy if exists "training read logins" on public.carrier_login_logs;
drop policy if exists "training write logins" on public.carrier_login_logs;
create policy "training read logins" on public.carrier_login_logs for select using (true);
create policy "training write logins" on public.carrier_login_logs for all using (true) with check (true);

-- Storage bucket for endorsement/payment/cancellation documents.
insert into storage.buckets (id, name, public)
values ('carrier-documents', 'carrier-documents', false)
on conflict (id) do nothing;

drop policy if exists "training storage read" on storage.objects;
drop policy if exists "training storage insert" on storage.objects;
drop policy if exists "training storage update" on storage.objects;
drop policy if exists "training storage delete" on storage.objects;

create policy "training storage read"
on storage.objects for select
using (bucket_id = 'carrier-documents');

create policy "training storage insert"
on storage.objects for insert
with check (bucket_id = 'carrier-documents');

create policy "training storage update"
on storage.objects for update
using (bucket_id = 'carrier-documents')
with check (bucket_id = 'carrier-documents');

create policy "training storage delete"
on storage.objects for delete
using (bucket_id = 'carrier-documents');
