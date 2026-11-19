-- MatchMetric initial schema
-- Run this file in Supabase SQL Editor. Never put the service_role key in the browser.

create extension if not exists pgcrypto;

do $$ begin
  create type public.prediction_market as enum ('Goals', 'Double Chance', '1X2', 'Other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.prediction_status as enum ('pending', 'won', 'lost', 'void');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.accumulator_status as enum ('pending', 'won', 'lost', 'void');
exception when duplicate_object then null; end $$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now()
);

create table if not exists public.predictions (
  id uuid primary key default gen_random_uuid(),
  home_team text not null,
  away_team text not null,
  competition text not null,
  country text,
  kickoff_at timestamptz not null,
  market public.prediction_market not null,
  selection text not null,
  odds numeric(8,2) not null check (odds >= 1.01),
  confidence integer check (confidence between 0 and 100),
  analysis text,
  status public.prediction_status not null default 'pending',
  home_score integer check (home_score is null or home_score >= 0),
  away_score integer check (away_score is null or away_score >= 0),
  is_published boolean not null default false,
  published_at timestamptz,
  settled_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint different_teams check (home_team <> away_team)
);

create table if not exists public.accumulators (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  risk_label text not null default 'Standard',
  status public.accumulator_status not null default 'pending',
  is_published boolean not null default false,
  published_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.accumulator_selections (
  id uuid primary key default gen_random_uuid(),
  accumulator_id uuid not null references public.accumulators(id) on delete cascade,
  prediction_id uuid not null references public.predictions(id),
  selection_order integer not null default 0,
  unique (accumulator_id, prediction_id)
);

create table if not exists public.prediction_audit_logs (
  id uuid primary key default gen_random_uuid(),
  prediction_id uuid not null references public.predictions(id) on delete cascade,
  changed_by uuid references auth.users(id),
  action text not null,
  old_values jsonb,
  new_values jsonb,
  reason text,
  created_at timestamptz not null default now()
);

create table if not exists public.site_settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

create table if not exists public.ad_placements (
  id uuid primary key default gen_random_uuid(),
  placement_key text not null unique,
  label text not null,
  enabled boolean not null default false,
  publisher_id text,
  slot_id text,
  created_at timestamptz not null default now()
);

create index if not exists predictions_published_kickoff_idx
  on public.predictions (kickoff_at) where is_published = true;
create index if not exists predictions_status_idx on public.predictions(status);
create index if not exists predictions_market_idx on public.predictions(market);
create index if not exists predictions_published_at_idx on public.predictions(published_at desc);
create index if not exists accumulator_published_idx
  on public.accumulators(published_at desc) where is_published = true;

-- Updated timestamp helper.
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end;
$$;

drop trigger if exists predictions_set_updated_at on public.predictions;
create trigger predictions_set_updated_at before update on public.predictions
for each row execute function public.set_updated_at();

-- Create a profile automatically for new auth users. New users are NOT admins.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = ''
as $$
begin
  insert into public.profiles (id, email, role)
  values (new.id, new.email, 'user')
  on conflict (id) do update set email = excluded.email;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
for each row execute procedure public.handle_new_user();

-- Admin predicate is security-definer to avoid RLS recursion through profiles.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

alter table public.profiles enable row level security;
alter table public.predictions enable row level security;
alter table public.accumulators enable row level security;
alter table public.accumulator_selections enable row level security;
alter table public.prediction_audit_logs enable row level security;
alter table public.site_settings enable row level security;
alter table public.ad_placements enable row level security;

-- Profiles: users can read their own profile; admins can read all.
create policy "profile read own or admin" on public.profiles
for select to authenticated using (id = (select auth.uid()) or public.is_admin());
create policy "admin update profiles" on public.profiles
for update to authenticated using (public.is_admin()) with check (public.is_admin());

-- Predictions: public can read published rows; admins manage all.
create policy "public read published predictions" on public.predictions
for select to anon, authenticated using (is_published = true or public.is_admin());
create policy "admin insert predictions" on public.predictions
for insert to authenticated with check (public.is_admin());
create policy "admin update predictions" on public.predictions
for update to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "admin delete predictions" on public.predictions
for delete to authenticated using (public.is_admin());

-- Accumulators and their legs.
create policy "public read published accumulators" on public.accumulators
for select to anon, authenticated using (is_published = true or public.is_admin());
create policy "admin manage accumulators" on public.accumulators
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public read legs for published accumulators" on public.accumulator_selections
for select to anon, authenticated using (
  exists (select 1 from public.accumulators a where a.id = accumulator_id and a.is_published = true)
  or public.is_admin()
);
create policy "admin manage accumulator legs" on public.accumulator_selections
for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Audit trail is readable only by admins; only admins can write.
create policy "admin read audit" on public.prediction_audit_logs
for select to authenticated using (public.is_admin());
create policy "admin insert audit" on public.prediction_audit_logs
for insert to authenticated with check (public.is_admin());

create policy "public read site settings" on public.site_settings
for select to anon, authenticated using (true);
create policy "admin manage site settings" on public.site_settings
for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "public read enabled ad placements" on public.ad_placements
for select to anon, authenticated using (enabled = true or public.is_admin());
create policy "admin manage ad placements" on public.ad_placements
for all to authenticated using (public.is_admin()) with check (public.is_admin());

grant usage on schema public to anon, authenticated;
grant select on public.predictions, public.accumulators, public.accumulator_selections, public.site_settings, public.ad_placements to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant insert, update, delete on public.predictions, public.accumulators, public.accumulator_selections, public.site_settings, public.ad_placements to authenticated;
grant select, insert on public.prediction_audit_logs to authenticated;

-- NOTE: Bootstrap your first admin manually after creating the Auth user:
-- update public.profiles set role = 'admin' where email = 'YOUR_ADMIN_EMAIL';
