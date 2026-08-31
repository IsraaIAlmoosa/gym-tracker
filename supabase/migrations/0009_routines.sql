-- Gym Tracker: saved workout routines/templates (exercise lists, no weights/reps).

create table if not exists public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  name text not null,
  created_at timestamptz not null default now()
);

create index if not exists routines_user_id_idx on public.routines (user_id);

alter table public.routines enable row level security;

drop policy if exists "routines_select_own" on public.routines;
create policy "routines_select_own"
  on public.routines for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "routines_insert_own" on public.routines;
create policy "routines_insert_own"
  on public.routines for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "routines_update_own" on public.routines;
create policy "routines_update_own"
  on public.routines for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "routines_delete_own" on public.routines;
create policy "routines_delete_own"
  on public.routines for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.routines to authenticated;

-- ---------------------------------------------------------------------------
-- routine_exercises
-- (no direct user_id column; ownership is derived through routines)
-- "order" is a reserved SQL keyword, so this uses order_index instead.
-- ---------------------------------------------------------------------------
create table if not exists public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  order_index smallint not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists routine_exercises_routine_id_idx on public.routine_exercises (routine_id);
create index if not exists routine_exercises_exercise_id_idx on public.routine_exercises (exercise_id);

alter table public.routine_exercises enable row level security;

drop policy if exists "routine_exercises_select_own" on public.routine_exercises;
create policy "routine_exercises_select_own"
  on public.routine_exercises for select
  to authenticated
  using (
    exists (
      select 1 from public.routines r
      where r.id = routine_exercises.routine_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "routine_exercises_insert_own" on public.routine_exercises;
create policy "routine_exercises_insert_own"
  on public.routine_exercises for insert
  to authenticated
  with check (
    exists (
      select 1 from public.routines r
      where r.id = routine_exercises.routine_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "routine_exercises_update_own" on public.routine_exercises;
create policy "routine_exercises_update_own"
  on public.routine_exercises for update
  to authenticated
  using (
    exists (
      select 1 from public.routines r
      where r.id = routine_exercises.routine_id and r.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.routines r
      where r.id = routine_exercises.routine_id and r.user_id = auth.uid()
    )
  );

drop policy if exists "routine_exercises_delete_own" on public.routine_exercises;
create policy "routine_exercises_delete_own"
  on public.routine_exercises for delete
  to authenticated
  using (
    exists (
      select 1 from public.routines r
      where r.id = routine_exercises.routine_id and r.user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.routine_exercises to authenticated;
