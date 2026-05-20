-- LAVA CarrierOps Portal Simulator - Supabase Setup
-- Run this entire file in Supabase SQL Editor.
-- This is for a training simulator. Do not store real insured/customer data.

create extension if not exists pgcrypto;

create table if not exists public.carrier_va_users (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  email text unique not null,
  role text not null default 'VA',
  last_login_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.carrier_login_logs (
  id uuid primary key default gen_random_uuid(),
  name text,
  full_name text,
  email text,
  role text,
  created_at timestamptz not null default now()
);

create table if not exists public.carrier_policies (
  id uuid primary key default gen_random_uuid(),
  policy_number text unique not null,
  quote_number text,
  named_insured text not null,
  email text,
  phone text,
  line_of_business text not null,
  policy_status text not null default 'Active',
  effective_date date,
  expiration_date date,
  mailing_address text,
  risk_address text,
  garaging_address text,
  premium numeric default 0,
  policy_data jsonb not null default '{}'::jsonb,
  created_by_email text,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.carrier_quotes (
  id uuid primary key default gen_random_uuid(),
  quote_number text unique not null,
  line_of_business text not null,
  named_insured text,
  email text,
  phone text,
  status text not null default 'Draft',
  premium numeric default 0,
  monthly numeric default 0,
  risk_score numeric default 0,
  qa_score numeric default 0,
  quote_data jsonb not null default '{}'::jsonb,
  created_by_email text,
  created_by_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.carrier_payments (
  id uuid primary key default gen_random_uuid(),
  policy_number text not null,
  named_insured text,
  amount numeric not null default 0,
  method text,
  payment_date date,
  reference_number text,
  received_from text,
  apply_to text,
  notes text,
  status text not null default 'Posted',
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.carrier_endorsements (
  id uuid primary key default gen_random_uuid(),
  policy_number text not null,
  named_insured text,
  endorsement_type text not null,
  effective_date date,
  premium_impact text,
  description text,
  status text not null default 'Submitted',
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.carrier_cancellations (
  id uuid primary key default gen_random_uuid(),
  policy_number text not null,
  named_insured text,
  reason text not null,
  effective_date date,
  requested_by text,
  signed_request text,
  replacement_known text,
  refund_method text,
  notes text,
  status text not null default 'Pending Cancellation',
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.carrier_documents (
  id uuid primary key default gen_random_uuid(),
  policy_number text,
  module text,
  file_name text not null,
  file_path text not null,
  file_type text,
  file_size bigint default 0,
  uploaded_by_email text,
  local_note text,
  created_at timestamptz not null default now()
);

create table if not exists public.carrier_remarketing (
  id uuid primary key default gen_random_uuid(),
  policy_number text not null,
  named_insured text,
  line_of_business text,
  target_date date,
  reason text,
  current_premium numeric default 0,
  markets text,
  notes text,
  status text not null default 'Open',
  created_by_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.carrier_audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  entity text,
  details jsonb not null default '{}'::jsonb,
  user_name text,
  user_email text,
  user_role text,
  created_at timestamptz not null default now()
);

create table if not exists public.carrier_qa_reviews (
  id uuid primary key default gen_random_uuid(),
  reference_number text not null,
  va_name text,
  qa_score numeric,
  comments text,
  trainer_name text,
  trainer_email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Helpful indexes for portal search
create index if not exists idx_carrier_policies_policy_number on public.carrier_policies(policy_number);
create index if not exists idx_carrier_policies_named_insured on public.carrier_policies using gin (to_tsvector('simple', coalesce(named_insured,'')));
create index if not exists idx_carrier_quotes_quote_number on public.carrier_quotes(quote_number);
create index if not exists idx_carrier_documents_policy_number on public.carrier_documents(policy_number);

-- Enable RLS
alter table public.carrier_va_users enable row level security;
alter table public.carrier_login_logs enable row level security;
alter table public.carrier_policies enable row level security;
alter table public.carrier_quotes enable row level security;
alter table public.carrier_payments enable row level security;
alter table public.carrier_endorsements enable row level security;
alter table public.carrier_cancellations enable row level security;
alter table public.carrier_documents enable row level security;
alter table public.carrier_remarketing enable row level security;
alter table public.carrier_audit_logs enable row level security;
alter table public.carrier_qa_reviews enable row level security;

-- Training-mode policies: allow anon/authenticated read/write.
-- This keeps the static Netlify app simple for classroom training.
-- Do NOT use this policy design for a real production carrier system with real data.

drop policy if exists "carrier_va_users_training_all" on public.carrier_va_users;
create policy "carrier_va_users_training_all" on public.carrier_va_users
for all to anon, authenticated using (true) with check (true);

drop policy if exists "carrier_login_logs_training_all" on public.carrier_login_logs;
create policy "carrier_login_logs_training_all" on public.carrier_login_logs
for all to anon, authenticated using (true) with check (true);

drop policy if exists "carrier_policies_training_all" on public.carrier_policies;
create policy "carrier_policies_training_all" on public.carrier_policies
for all to anon, authenticated using (true) with check (true);

drop policy if exists "carrier_quotes_training_all" on public.carrier_quotes;
create policy "carrier_quotes_training_all" on public.carrier_quotes
for all to anon, authenticated using (true) with check (true);

drop policy if exists "carrier_payments_training_all" on public.carrier_payments;
create policy "carrier_payments_training_all" on public.carrier_payments
for all to anon, authenticated using (true) with check (true);

drop policy if exists "carrier_endorsements_training_all" on public.carrier_endorsements;
create policy "carrier_endorsements_training_all" on public.carrier_endorsements
for all to anon, authenticated using (true) with check (true);

drop policy if exists "carrier_cancellations_training_all" on public.carrier_cancellations;
create policy "carrier_cancellations_training_all" on public.carrier_cancellations
for all to anon, authenticated using (true) with check (true);

drop policy if exists "carrier_documents_training_all" on public.carrier_documents;
create policy "carrier_documents_training_all" on public.carrier_documents
for all to anon, authenticated using (true) with check (true);

drop policy if exists "carrier_remarketing_training_all" on public.carrier_remarketing;
create policy "carrier_remarketing_training_all" on public.carrier_remarketing
for all to anon, authenticated using (true) with check (true);

drop policy if exists "carrier_audit_logs_training_all" on public.carrier_audit_logs;
create policy "carrier_audit_logs_training_all" on public.carrier_audit_logs
for all to anon, authenticated using (true) with check (true);

drop policy if exists "carrier_qa_reviews_training_all" on public.carrier_qa_reviews;
create policy "carrier_qa_reviews_training_all" on public.carrier_qa_reviews
for all to anon, authenticated using (true) with check (true);

-- Storage bucket for endorsement and carrier workflow documents.
insert into storage.buckets (id, name, public, file_size_limit)
values ('carrier-documents', 'carrier-documents', false, 10485760)
on conflict (id) do update
set public = false, file_size_limit = 10485760;

drop policy if exists "carrier_docs_select_training" on storage.objects;
create policy "carrier_docs_select_training" on storage.objects
for select to anon, authenticated
using (bucket_id = 'carrier-documents');

drop policy if exists "carrier_docs_insert_training" on storage.objects;
create policy "carrier_docs_insert_training" on storage.objects
for insert to anon, authenticated
with check (bucket_id = 'carrier-documents');

drop policy if exists "carrier_docs_update_training" on storage.objects;
create policy "carrier_docs_update_training" on storage.objects
for update to anon, authenticated
using (bucket_id = 'carrier-documents')
with check (bucket_id = 'carrier-documents');

drop policy if exists "carrier_docs_delete_training" on storage.objects;
create policy "carrier_docs_delete_training" on storage.objects
for delete to anon, authenticated
using (bucket_id = 'carrier-documents');
