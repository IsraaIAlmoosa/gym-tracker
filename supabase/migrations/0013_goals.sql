-- Gym Tracker: user fitness goals (weight, body fat %, exercise max weight,
-- workout frequency, or fully custom). "Current" value for most goal types is
-- resolved live from existing data (body_measurements/inbody_measurements/
-- workout_sets/workout_sessions) rather than stored here — manual_current_value
-- is only used for goal_type = 'custom'.

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  goal_type text not null check (
    goal_type in ('weight', 'body_fat_percentage', 'exercise_max_weight', 'workout_frequency', 'custom')
  ),
  title text not null,
  exercise_id uuid references public.exercises (id) on delete set null,
  start_value numeric not null,
  target_value numeric not null,
  manual_current_value numeric,
  unit text not null,
  start_date date not null default current_date,
  target_date date,
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goals_user_id_idx on public.goals (user_id);
create index if not exists goals_status_idx on public.goals (status);

alter table public.goals enable row level security;

drop policy if exists "goals_select_own" on public.goals;
create policy "goals_select_own"
  on public.goals for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "goals_insert_own" on public.goals;
create policy "goals_insert_own"
  on public.goals for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "goals_update_own" on public.goals;
create policy "goals_update_own"
  on public.goals for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "goals_delete_own" on public.goals;
create policy "goals_delete_own"
  on public.goals for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.goals to authenticated;
