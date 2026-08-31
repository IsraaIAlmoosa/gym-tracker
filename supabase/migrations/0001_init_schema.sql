-- Gym Tracker: initial schema (exercises, workout_sessions, workout_sets, smart_insights)
-- Enables Row Level Security so each user only sees their own rows,
-- except `exercises` where `is_default = true` rows are shared with everyone.
--
-- This migration is written to be safely re-runnable: every CREATE POLICY is
-- preceded by DROP POLICY IF EXISTS, since Postgres has no
-- "CREATE POLICY IF NOT EXISTS" syntax.

create extension if not exists pgcrypto with schema extensions;

-- ---------------------------------------------------------------------------
-- exercises
-- ---------------------------------------------------------------------------
create table if not exists public.exercises (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text not null,
  muscle_group_ar text not null,
  muscle_group_en text not null,
  type_ar text not null,
  type_en text not null,
  affects_areas text[] not null default '{}',
  impact_level smallint not null check (impact_level between 1 and 5),
  is_default boolean not null default false,
  created_by_user_id uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint exercises_owner_or_default check (
    is_default = true or created_by_user_id is not null
  )
);

create index if not exists exercises_created_by_user_id_idx on public.exercises (created_by_user_id);
create index if not exists exercises_is_default_idx on public.exercises (is_default);

alter table public.exercises enable row level security;

-- Everyone (any authenticated user) can see default exercises plus their own custom ones.
drop policy if exists "exercises_select_own_or_default" on public.exercises;
create policy "exercises_select_own_or_default"
  on public.exercises for select
  to authenticated
  using (is_default = true or created_by_user_id = auth.uid());

-- Users may only create their own (non-default) exercises.
-- Default/shared exercises are seeded separately with elevated privileges.
drop policy if exists "exercises_insert_own" on public.exercises;
create policy "exercises_insert_own"
  on public.exercises for insert
  to authenticated
  with check (is_default = false and created_by_user_id = auth.uid());

drop policy if exists "exercises_update_own" on public.exercises;
create policy "exercises_update_own"
  on public.exercises for update
  to authenticated
  using (is_default = false and created_by_user_id = auth.uid())
  with check (is_default = false and created_by_user_id = auth.uid());

drop policy if exists "exercises_delete_own" on public.exercises;
create policy "exercises_delete_own"
  on public.exercises for delete
  to authenticated
  using (is_default = false and created_by_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- workout_sessions
-- ---------------------------------------------------------------------------
create table if not exists public.workout_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  date date not null default current_date,
  duration integer check (duration >= 0), -- minutes
  created_at timestamptz not null default now()
);

create index if not exists workout_sessions_user_id_idx on public.workout_sessions (user_id);
create index if not exists workout_sessions_date_idx on public.workout_sessions (date);

alter table public.workout_sessions enable row level security;

drop policy if exists "workout_sessions_select_own" on public.workout_sessions;
create policy "workout_sessions_select_own"
  on public.workout_sessions for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "workout_sessions_insert_own" on public.workout_sessions;
create policy "workout_sessions_insert_own"
  on public.workout_sessions for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "workout_sessions_update_own" on public.workout_sessions;
create policy "workout_sessions_update_own"
  on public.workout_sessions for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "workout_sessions_delete_own" on public.workout_sessions;
create policy "workout_sessions_delete_own"
  on public.workout_sessions for delete
  to authenticated
  using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- workout_sets
-- (no direct user_id column; ownership is derived through workout_sessions)
-- ---------------------------------------------------------------------------
create table if not exists public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.workout_sessions (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  set_number smallint not null check (set_number > 0),
  weight numeric(6, 2) not null check (weight >= 0),
  reps smallint not null check (reps >= 0),
  created_at timestamptz not null default now()
);

create index if not exists workout_sets_session_id_idx on public.workout_sets (session_id);
create index if not exists workout_sets_exercise_id_idx on public.workout_sets (exercise_id);

alter table public.workout_sets enable row level security;

drop policy if exists "workout_sets_select_own" on public.workout_sets;
create policy "workout_sets_select_own"
  on public.workout_sets for select
  to authenticated
  using (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = workout_sets.session_id and ws.user_id = auth.uid()
    )
  );

drop policy if exists "workout_sets_insert_own" on public.workout_sets;
create policy "workout_sets_insert_own"
  on public.workout_sets for insert
  to authenticated
  with check (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = workout_sets.session_id and ws.user_id = auth.uid()
    )
  );

drop policy if exists "workout_sets_update_own" on public.workout_sets;
create policy "workout_sets_update_own"
  on public.workout_sets for update
  to authenticated
  using (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = workout_sets.session_id and ws.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = workout_sets.session_id and ws.user_id = auth.uid()
    )
  );

drop policy if exists "workout_sets_delete_own" on public.workout_sets;
create policy "workout_sets_delete_own"
  on public.workout_sets for delete
  to authenticated
  using (
    exists (
      select 1 from public.workout_sessions ws
      where ws.id = workout_sets.session_id and ws.user_id = auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- smart_insights
-- ---------------------------------------------------------------------------
create table if not exists public.smart_insights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  type text not null,
  message text not null,
  exercise_id uuid references public.exercises (id) on delete set null,
  created_at timestamptz not null default now(),
  is_read boolean not null default false
);

create index if not exists smart_insights_user_id_idx on public.smart_insights (user_id);
create index if not exists smart_insights_is_read_idx on public.smart_insights (is_read);

alter table public.smart_insights enable row level security;

drop policy if exists "smart_insights_select_own" on public.smart_insights;
create policy "smart_insights_select_own"
  on public.smart_insights for select
  to authenticated
  using (user_id = auth.uid());

-- Insights are normally generated server-side (service role bypasses RLS),
-- but this allows a client to insert its own if ever needed.
drop policy if exists "smart_insights_insert_own" on public.smart_insights;
create policy "smart_insights_insert_own"
  on public.smart_insights for insert
  to authenticated
  with check (user_id = auth.uid());

-- Clients only need to update `is_read` on their own insights.
drop policy if exists "smart_insights_update_own" on public.smart_insights;
create policy "smart_insights_update_own"
  on public.smart_insights for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "smart_insights_delete_own" on public.smart_insights;
create policy "smart_insights_delete_own"
  on public.smart_insights for delete
  to authenticated
  using (user_id = auth.uid());
