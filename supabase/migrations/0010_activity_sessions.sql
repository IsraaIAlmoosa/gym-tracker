-- Gym Tracker: time-based activity sessions (yoga, pilates, tai chi, walking)
-- Separate from weight-based workout_sessions/workout_sets — no PR/streak logic touches this table.

create table if not exists public.activity_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  activity_type text not null check (activity_type in ('yoga', 'pilates', 'tai_chi', 'walking')),
  duration_minutes integer not null check (duration_minutes > 0),
  session_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists activity_sessions_user_id_idx on public.activity_sessions (user_id);
create index if not exists activity_sessions_date_idx on public.activity_sessions (session_date);

alter table public.activity_sessions enable row level security;

drop policy if exists "activity_sessions_select_own" on public.activity_sessions;
create policy "activity_sessions_select_own"
  on public.activity_sessions for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "activity_sessions_insert_own" on public.activity_sessions;
create policy "activity_sessions_insert_own"
  on public.activity_sessions for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "activity_sessions_update_own" on public.activity_sessions;
create policy "activity_sessions_update_own"
  on public.activity_sessions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "activity_sessions_delete_own" on public.activity_sessions;
create policy "activity_sessions_delete_own"
  on public.activity_sessions for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.activity_sessions to authenticated;
