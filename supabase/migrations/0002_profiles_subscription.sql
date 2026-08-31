-- Gym Tracker: user profiles + subscription/premium override support.
--
-- `auth.users` is managed internally by Supabase (GoTrue) and should not be
-- altered directly. Instead we keep a `public.profiles` table with one row
-- per user (id = auth.users.id), auto-created via a trigger on signup.
--
-- `is_premium_override` lets an admin manually grant full paid-feature
-- access to an account without a real subscription (toggled by hand from
-- the Supabase dashboard's Table Editor). No RLS policy allows regular
-- users to write to this table — only the trigger (SECURITY DEFINER) or an
-- admin/service-role connection can.
--
-- This migration is written to be safely re-runnable: CREATE POLICY is
-- preceded by DROP POLICY IF EXISTS, and functions use CREATE OR REPLACE.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  subscription_status text not null default 'free',
  is_premium_override boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- Users can see their own subscription status, but cannot insert/update/
-- delete it themselves — those columns are admin/billing-system controlled.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles for select
  to authenticated
  using (id = auth.uid());

-- Auto-create a profile row whenever a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id) values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Backfill profiles for any users who signed up before this migration existed.
insert into public.profiles (id)
select u.id from auth.users u
left join public.profiles p on p.id = u.id
where p.id is null
on conflict (id) do nothing;

-- Reusable predicate: true if the user has an active paid subscription
-- OR has been manually granted premium access.
create or replace function public.is_premium_user(user_id uuid)
returns boolean
language sql
stable
security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = user_id
      and (subscription_status = 'مدفوع' or is_premium_override = true)
  );
$$;
