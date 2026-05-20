-- LAVA CarrierOps Training Portal - Supabase Setup
-- Run this in Supabase SQL Editor.
-- Training/demo configuration: allows anon client read/write through RLS policies.
-- Use dummy data only. Do not store real customer/insured information.

create extension if not exists "pgcrypto";

create table if not exists carrier_login_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz,
  va_name text,
  va_email text,
  role text,
  login_at timestamptz,
  session_id text,
  details jsonb default '{}'::jsonb
);

create table if not exists carrier_quote_sessions (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz,
  va_name text,
  va_email text,
  role text,
  quote_type text,
  quote_number text,
  started_at timestamptz,
  rated_at timestamptz,
  duration_seconds integer default 0,
  premium numeric default 0,
  status text default 'Started',
  details jsonb default '{}'::jsonb
);

create table if not exists carrier_quotes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz,
  va_name text,
  va_email text,
  quote_session_id uuid,
  quote_type text,
  quote_number text,
  insured_name text,
  email text,
  phone text,
  status text,
  premium numeric default 0,
  duration_seconds integer default 0,
  details jsonb default '{}'::jsonb,
  rating_details jsonb default '{}'::jsonb
);

create table if not exists carrier_policies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz,
  va_name text,
  va_email text,
  policy_number text unique,
  quote_number text,
  line_of_business text,
  insured_name text,
  email text,
  phone text,
  effective_date date,
  expiration_date date,
  status text default 'Issued',
  premium numeric default 0,
  details jsonb default '{}'::jsonb
);

create table if not exists carrier_payments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz,
  va_name text,
  va_email text,
  policy_number text,
  amount numeric,
  payment_method text,
  paid_by text,
  payment_date date,
  notes text,
  status text,
  confirmation_number text,
  details jsonb default '{}'::jsonb
);

create table if not exists carrier_endorsements (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz,
  va_name text,
  va_email text,
  policy_number text,
  endorsement_type text,
  effective_date date,
  notes text,
  status text default 'Pending Review',
  details jsonb default '{}'::jsonb
);

create table if not exists carrier_cancellations (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz,
  va_name text,
  va_email text,
  policy_number text,
  reason text,
  effective_date date,
  notes text,
  status text default 'Pending Review',
  details jsonb default '{}'::jsonb
);

create table if not exists carrier_remarketing (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz,
  va_name text,
  va_email text,
  policy_number text,
  insured_name text,
  target_date date,
  reason text,
  notes text,
  status text default 'Open',
  details jsonb default '{}'::jsonb
);

create table if not exists carrier_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz,
  va_name text,
  va_email text,
  policy_number text,
  quote_number text,
  document_type text,
  file_name text,
  file_path text,
  file_url text,
  upload_status text,
  details jsonb default '{}'::jsonb
);

create table if not exists carrier_audit_logs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz,
  va_name text,
  va_email text,
  role text,
  action text,
  message text,
  details jsonb default '{}'::jsonb
);

create table if not exists carrier_trainer_reviews (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz default now(),
  updated_at timestamptz,
  va_name text,
  va_email text,
  trainer_name text,
  trainer_email text,
  quote_number text,
  quote_session_id uuid,
  score numeric,
  comments text,
  status text default 'Reviewed',
  details jsonb default '{}'::jsonb
);

-- Storage bucket for training uploads.
insert into storage.buckets (id, name, public)
values ('carrier-documents', 'carrier-documents', true)
on conflict (id) do update set public = true;

-- Enable RLS
alter table carrier_login_logs enable row level security;
alter table carrier_quote_sessions enable row level security;
alter table carrier_quotes enable row level security;
alter table carrier_policies enable row level security;
alter table carrier_payments enable row level security;
alter table carrier_endorsements enable row level security;
alter table carrier_cancellations enable row level security;
alter table carrier_remarketing enable row level security;
alter table carrier_documents enable row level security;
alter table carrier_audit_logs enable row level security;
alter table carrier_trainer_reviews enable row level security;

-- Training policies: allow public/publishable key to read/write.
-- For production, replace these with authenticated-user policies.
do $$
declare
  t text;
begin
  foreach t in array array[
    'carrier_login_logs',
    'carrier_quote_sessions',
    'carrier_quotes',
    'carrier_policies',
    'carrier_payments',
    'carrier_endorsements',
    'carrier_cancellations',
    'carrier_remarketing',
    'carrier_documents',
    'carrier_audit_logs',
    'carrier_trainer_reviews'
  ]
  loop
    execute format('drop policy if exists "%s_training_select" on %I', t, t);
    execute format('drop policy if exists "%s_training_insert" on %I', t, t);
    execute format('drop policy if exists "%s_training_update" on %I', t, t);
    execute format('drop policy if exists "%s_training_delete" on %I', t, t);

    execute format('create policy "%s_training_select" on %I for select to anon, authenticated using (true)', t, t);
    execute format('create policy "%s_training_insert" on %I for insert to anon, authenticated with check (true)', t, t);
    execute format('create policy "%s_training_update" on %I for update to anon, authenticated using (true) with check (true)', t, t);
    execute format('create policy "%s_training_delete" on %I for delete to anon, authenticated using (true)', t, t);
  end loop;
end $$;

-- Storage policies for the carrier-documents bucket.
drop policy if exists "carrier_documents_public_read" on storage.objects;
drop policy if exists "carrier_documents_public_insert" on storage.objects;
drop policy if exists "carrier_documents_public_update" on storage.objects;
drop policy if exists "carrier_documents_public_delete" on storage.objects;

create policy "carrier_documents_public_read"
on storage.objects for select
to anon, authenticated
using (bucket_id = 'carrier-documents');

create policy "carrier_documents_public_insert"
on storage.objects for insert
to anon, authenticated
with check (bucket_id = 'carrier-documents');

create policy "carrier_documents_public_update"
on storage.objects for update
to anon, authenticated
using (bucket_id = 'carrier-documents')
with check (bucket_id = 'carrier-documents');

create policy "carrier_documents_public_delete"
on storage.objects for delete
to anon, authenticated
using (bucket_id = 'carrier-documents');

-- Helpful indexes
create index if not exists idx_carrier_policies_policy_number on carrier_policies(policy_number);
create index if not exists idx_carrier_policies_insured on carrier_policies(insured_name);
create index if not exists idx_carrier_quote_sessions_va_email on carrier_quote_sessions(va_email);
create index if not exists idx_carrier_quote_sessions_started on carrier_quote_sessions(started_at desc);
create index if not exists idx_carrier_audit_created on carrier_audit_logs(created_at desc);
