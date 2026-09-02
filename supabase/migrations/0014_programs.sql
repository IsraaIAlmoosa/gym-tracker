-- Gym Tracker: multi-week workout programs (Push/Pull/Legs, Upper/Lower, Full
-- Body, Bro Split, Beginner, plus user-created custom programs).
--
-- Structure: programs -> program_days (a repeating weekly cycle of
-- day_index 1..days_per_week; the same days repeat every week — only the
-- weights the user logs change week to week, not the prescribed content) ->
-- program_exercises. A user "enrolls" in a program via program_enrollments,
-- which tracks current_week/current_day_index; workout_sessions gets two
-- new nullable columns linking a logged session back to the program day it
-- came from, so "sessions completed" is just a count query.
--
-- `programs` follows the same shared-default-vs-owned pattern as
-- `exercises` (is_default + nullable created_by_user_id). `program_days`/
-- `program_exercises` derive ownership through their parent `programs` row,
-- same as `routine_exercises` derives through `routines`.

-- ---------------------------------------------------------------------------
-- programs
-- ---------------------------------------------------------------------------
create table if not exists public.programs (
  id uuid primary key default gen_random_uuid(),
  is_default boolean not null default false,
  created_by_user_id uuid references auth.users (id) on delete cascade,
  slug text,
  category text not null check (
    category in ('ppl', 'upper_lower', 'full_body', 'bro_split', 'beginner', 'custom')
  ),
  name text not null,
  name_ar text,
  name_en text,
  description text,
  description_ar text,
  description_en text,
  duration_weeks smallint not null check (duration_weeks > 0),
  days_per_week smallint not null check (days_per_week between 1 and 7),
  created_at timestamptz not null default now(),
  constraint programs_owner_or_default check (
    is_default = true or created_by_user_id is not null
  )
);

create index if not exists programs_created_by_user_id_idx on public.programs (created_by_user_id);
create index if not exists programs_is_default_idx on public.programs (is_default);

alter table public.programs enable row level security;

drop policy if exists "programs_select_own_or_default" on public.programs;
create policy "programs_select_own_or_default"
  on public.programs for select
  to authenticated
  using (is_default = true or created_by_user_id = auth.uid());

drop policy if exists "programs_insert_own" on public.programs;
create policy "programs_insert_own"
  on public.programs for insert
  to authenticated
  with check (is_default = false and created_by_user_id = auth.uid());

drop policy if exists "programs_update_own" on public.programs;
create policy "programs_update_own"
  on public.programs for update
  to authenticated
  using (is_default = false and created_by_user_id = auth.uid())
  with check (is_default = false and created_by_user_id = auth.uid());

drop policy if exists "programs_delete_own" on public.programs;
create policy "programs_delete_own"
  on public.programs for delete
  to authenticated
  using (is_default = false and created_by_user_id = auth.uid());

grant select, insert, update, delete on public.programs to authenticated;

-- ---------------------------------------------------------------------------
-- program_days
-- day_index is the position in the repeating weekly cycle (1..days_per_week),
-- not tied to a specific week number.
-- ---------------------------------------------------------------------------
create table if not exists public.program_days (
  id uuid primary key default gen_random_uuid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  day_index smallint not null check (day_index > 0),
  name text not null,
  name_ar text,
  name_en text,
  created_at timestamptz not null default now(),
  unique (program_id, day_index)
);

create index if not exists program_days_program_id_idx on public.program_days (program_id);

alter table public.program_days enable row level security;

drop policy if exists "program_days_select_own_or_default" on public.program_days;
create policy "program_days_select_own_or_default"
  on public.program_days for select
  to authenticated
  using (
    exists (
      select 1 from public.programs p
      where p.id = program_days.program_id
        and (p.is_default = true or p.created_by_user_id = auth.uid())
    )
  );

drop policy if exists "program_days_insert_own" on public.program_days;
create policy "program_days_insert_own"
  on public.program_days for insert
  to authenticated
  with check (
    exists (
      select 1 from public.programs p
      where p.id = program_days.program_id
        and p.is_default = false and p.created_by_user_id = auth.uid()
    )
  );

drop policy if exists "program_days_update_own" on public.program_days;
create policy "program_days_update_own"
  on public.program_days for update
  to authenticated
  using (
    exists (
      select 1 from public.programs p
      where p.id = program_days.program_id
        and p.is_default = false and p.created_by_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.programs p
      where p.id = program_days.program_id
        and p.is_default = false and p.created_by_user_id = auth.uid()
    )
  );

drop policy if exists "program_days_delete_own" on public.program_days;
create policy "program_days_delete_own"
  on public.program_days for delete
  to authenticated
  using (
    exists (
      select 1 from public.programs p
      where p.id = program_days.program_id
        and p.is_default = false and p.created_by_user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.program_days to authenticated;

-- ---------------------------------------------------------------------------
-- program_exercises
-- target_sets/target_reps are only populated for default programs; custom
-- programs leave them null and the UI omits the target hint.
-- ---------------------------------------------------------------------------
create table if not exists public.program_exercises (
  id uuid primary key default gen_random_uuid(),
  program_day_id uuid not null references public.program_days (id) on delete cascade,
  exercise_id uuid not null references public.exercises (id) on delete restrict,
  order_index smallint not null default 0,
  target_sets smallint check (target_sets > 0),
  target_reps text,
  created_at timestamptz not null default now()
);

create index if not exists program_exercises_program_day_id_idx on public.program_exercises (program_day_id);
create index if not exists program_exercises_exercise_id_idx on public.program_exercises (exercise_id);

alter table public.program_exercises enable row level security;

drop policy if exists "program_exercises_select_own_or_default" on public.program_exercises;
create policy "program_exercises_select_own_or_default"
  on public.program_exercises for select
  to authenticated
  using (
    exists (
      select 1 from public.program_days d
      join public.programs p on p.id = d.program_id
      where d.id = program_exercises.program_day_id
        and (p.is_default = true or p.created_by_user_id = auth.uid())
    )
  );

drop policy if exists "program_exercises_insert_own" on public.program_exercises;
create policy "program_exercises_insert_own"
  on public.program_exercises for insert
  to authenticated
  with check (
    exists (
      select 1 from public.program_days d
      join public.programs p on p.id = d.program_id
      where d.id = program_exercises.program_day_id
        and p.is_default = false and p.created_by_user_id = auth.uid()
    )
  );

drop policy if exists "program_exercises_update_own" on public.program_exercises;
create policy "program_exercises_update_own"
  on public.program_exercises for update
  to authenticated
  using (
    exists (
      select 1 from public.program_days d
      join public.programs p on p.id = d.program_id
      where d.id = program_exercises.program_day_id
        and p.is_default = false and p.created_by_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.program_days d
      join public.programs p on p.id = d.program_id
      where d.id = program_exercises.program_day_id
        and p.is_default = false and p.created_by_user_id = auth.uid()
    )
  );

drop policy if exists "program_exercises_delete_own" on public.program_exercises;
create policy "program_exercises_delete_own"
  on public.program_exercises for delete
  to authenticated
  using (
    exists (
      select 1 from public.program_days d
      join public.programs p on p.id = d.program_id
      where d.id = program_exercises.program_day_id
        and p.is_default = false and p.created_by_user_id = auth.uid()
    )
  );

grant select, insert, update, delete on public.program_exercises to authenticated;

-- ---------------------------------------------------------------------------
-- program_enrollments
-- A user's run through a program: which week/day they're currently on.
-- App logic enforces "one active enrollment at a time" (starting a new
-- program abandons any existing active one) — not enforced at the DB level.
-- ---------------------------------------------------------------------------
create table if not exists public.program_enrollments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  program_id uuid not null references public.programs (id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'completed', 'abandoned')),
  current_week smallint not null default 1,
  current_day_index smallint not null default 1,
  started_at date not null default current_date,
  completed_at date,
  created_at timestamptz not null default now()
);

create index if not exists program_enrollments_user_id_idx on public.program_enrollments (user_id);
create index if not exists program_enrollments_status_idx on public.program_enrollments (status);

alter table public.program_enrollments enable row level security;

drop policy if exists "program_enrollments_select_own" on public.program_enrollments;
create policy "program_enrollments_select_own"
  on public.program_enrollments for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "program_enrollments_insert_own" on public.program_enrollments;
create policy "program_enrollments_insert_own"
  on public.program_enrollments for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "program_enrollments_update_own" on public.program_enrollments;
create policy "program_enrollments_update_own"
  on public.program_enrollments for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "program_enrollments_delete_own" on public.program_enrollments;
create policy "program_enrollments_delete_own"
  on public.program_enrollments for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.program_enrollments to authenticated;

-- ---------------------------------------------------------------------------
-- workout_sessions: link a logged session back to the program day it came
-- from, so progress (completed sessions, current week/day) can be derived
-- from real workout data instead of a separate log table.
-- ---------------------------------------------------------------------------
alter table public.workout_sessions
  add column if not exists program_enrollment_id uuid references public.program_enrollments (id) on delete set null;

alter table public.workout_sessions
  add column if not exists program_day_id uuid references public.program_days (id) on delete set null;

create index if not exists workout_sessions_program_enrollment_id_idx on public.workout_sessions (program_enrollment_id);
