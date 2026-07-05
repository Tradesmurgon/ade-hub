-- ================================================================
-- ADE Hub — Supabase Schema
-- Run this entire file in your Supabase SQL Editor
-- Project Settings → SQL Editor → New query → paste → Run
-- ================================================================

-- ── PROFILES (extends Supabase Auth users) ────────────────────
create table if not exists public.profiles (
  id          uuid references auth.users(id) on delete cascade primary key,
  name        text        not null,
  email       text        not null,
  role        text        not null default 'staff'
              check (role in ('owner', 'staff')),
  permissions text[]      not null default '{}',
  created_at  timestamptz not null default now()
);

-- ── COMPANY SETTINGS (single row) ────────────────────────────
create table if not exists public.company_settings (
  id      integer primary key default 1 check (id = 1),
  name    text default 'ADE Multi Trade Services',
  address text default '',
  suburb  text default '',
  phone   text default '',
  email   text default '',
  abn     text default ''
);
insert into public.company_settings (id) values (1) on conflict do nothing;

-- ── CLIENTS ───────────────────────────────────────────────────
create table if not exists public.clients (
  id         text primary key,
  name       text        not null,
  phone      text        default '',
  email      text        default '',
  address    text        default '',
  notes      text        default '',
  created_at timestamptz not null default now()
);

-- ── PARTS & CONSUMABLES ───────────────────────────────────────
create table if not exists public.parts (
  id         text primary key,
  name       text        not null,
  sku        text        default '',
  cost       numeric     not null default 0,
  qty        integer     not null default 0,
  reorder_at integer     not null default 0,
  supplier   text        default '',
  category   text        default 'Other',
  created_at timestamptz not null default now()
);

-- ── JOBS ──────────────────────────────────────────────────────
create table if not exists public.jobs (
  id           text primary key,
  job_number   text        not null,
  client_id    text        references public.clients(id) on delete set null,
  title        text        not null,
  description  text        default '',
  status       text        not null default 'Booked In',
  priority     text        not null default 'Standard',
  assigned_to  text[]      not null default '{}',
  labor_hours  numeric     not null default 0,
  labor_rate   numeric     not null default 95,
  parts_used   jsonb       not null default '[]',
  time_entries jsonb       not null default '[]',
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

-- ================================================================
-- ROW LEVEL SECURITY
-- ================================================================

alter table public.profiles         enable row level security;
alter table public.company_settings enable row level security;
alter table public.clients          enable row level security;
alter table public.parts            enable row level security;
alter table public.jobs             enable row level security;

-- Helper: is the current user an owner?
create or replace function public.is_owner()
returns boolean
language sql security definer stable as $$
  select coalesce(
    (select role = 'owner' from public.profiles where id = auth.uid()),
    false
  );
$$;

-- Helper: does the current user have a specific permission?
create or replace function public.has_permission(perm text)
returns boolean
language sql security definer stable as $$
  select coalesce(
    (select role = 'owner' or perm = any(permissions)
     from public.profiles where id = auth.uid()),
    false
  );
$$;

-- PROFILES
-- Publicly readable so the login screen can show name dropdown before auth
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (true);

drop policy if exists "profiles_insert" on public.profiles;
create policy "profiles_insert" on public.profiles
  for insert with check (public.is_owner() or auth.uid() = id);

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update using (public.is_owner() or auth.uid() = id);

drop policy if exists "profiles_delete" on public.profiles;
create policy "profiles_delete" on public.profiles
  for delete using (public.is_owner() and id <> auth.uid());

-- COMPANY SETTINGS
drop policy if exists "company_select" on public.company_settings;
create policy "company_select" on public.company_settings
  for select using (auth.uid() is not null);

drop policy if exists "company_update" on public.company_settings;
create policy "company_update" on public.company_settings
  for update using (public.is_owner());

-- CLIENTS
drop policy if exists "clients_select" on public.clients;
create policy "clients_select" on public.clients
  for select using (auth.uid() is not null);

drop policy if exists "clients_all" on public.clients;
create policy "clients_all" on public.clients
  for all using (public.is_owner());

-- PARTS
drop policy if exists "parts_select" on public.parts;
create policy "parts_select" on public.parts
  for select using (auth.uid() is not null);

drop policy if exists "parts_owner_all" on public.parts;
create policy "parts_owner_all" on public.parts
  for all using (public.is_owner());

drop policy if exists "parts_staff_update" on public.parts;
create policy "parts_staff_update" on public.parts
  for update using (
    auth.uid() is not null
    and public.has_permission('parts')
  );

-- JOBS
drop policy if exists "jobs_select" on public.jobs;
create policy "jobs_select" on public.jobs
  for select using (auth.uid() is not null);

drop policy if exists "jobs_owner_all" on public.jobs;
create policy "jobs_owner_all" on public.jobs
  for all using (public.is_owner());

drop policy if exists "jobs_staff_update" on public.jobs;
create policy "jobs_staff_update" on public.jobs
  for update using (
    auth.uid() is not null
    and public.has_permission('jobs')
  );

drop policy if exists "jobs_staff_insert" on public.jobs;
create policy "jobs_staff_insert" on public.jobs
  for insert with check (
    auth.uid() is not null
    and public.has_permission('jobs')
  );
