-- Gym Tracker: 0015_program_seed_data.sql was run more than once against
-- this project (it had no duplicate protection), so each default program
-- (is_default = true) ended up with 2-4 copies under the same slug.
--
-- This migration:
--   1. Repoints any program_enrollments/workout_sessions that reference a
--      duplicate program (or one of its days) onto the single surviving
--      "keeper" row, so no user progress or workout history is lost.
--   2. Deletes the duplicate `programs` rows — cascades remove their
--      program_days/program_exercises automatically (see 0014's `on delete
--      cascade`), and any program_enrollments still pointing at a deleted
--      duplicate (there shouldn't be any left after step 1 — this is just
--      the safety net) get cascade-deleted too, with the workout_sessions
--      that reference them falling back to `program_enrollment_id = null`
--      per the existing `on delete set null` — actual logged sets/reps are
--      never touched either way.
--   3. Adds a partial unique index on `programs.slug` (custom programs
--      always have slug = null, so this only constrains the 5 built-in
--      programs) so this can't happen again.
--
-- Only targets is_default = true rows — custom (user-created) programs
-- have slug = null and are never touched here.

-- Step 1: for each slug, the "keeper" is the oldest row (first ever seeded).
create temporary table _program_dedup as
select
  p.id as program_id,
  p.slug,
  first_value(p.id) over (
    partition by p.slug order by p.created_at asc, p.id asc
  ) as keeper_id
from public.programs p
where p.is_default = true and p.slug is not null;

-- Step 2: move any enrollment that points at a duplicate onto the keeper.
update public.program_enrollments pe
set program_id = d.keeper_id
from _program_dedup d
where pe.program_id = d.program_id
  and d.program_id <> d.keeper_id;

-- Step 3: repoint logged sessions from a duplicate's program_day onto the
-- keeper's equivalent day (same day_index — every re-seed of 0015 produces
-- an identical day_index layout per slug).
update public.workout_sessions ws
set program_day_id = kd.id
from public.program_days dd
join _program_dedup d on d.program_id = dd.program_id and d.program_id <> d.keeper_id
join public.program_days kd on kd.program_id = d.keeper_id and kd.day_index = dd.day_index
where ws.program_day_id = dd.id;

-- Step 4: delete the duplicates (cascades handle program_days/program_exercises).
delete from public.programs p
using _program_dedup d
where p.id = d.program_id
  and d.program_id <> d.keeper_id;

drop table _program_dedup;

-- Step 5: prevent this from happening again.
create unique index if not exists programs_slug_unique_idx
  on public.programs (slug)
  where slug is not null;
