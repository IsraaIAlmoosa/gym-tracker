-- Gym Tracker: seed the 5 built-in workout programs (Push Pull Legs,
-- Upper/Lower, Full Body, Bro Split, Beginner).
--
-- Each program repeats the same day_index cycle every week (see comment in
-- 0014_programs.sql) — duration_weeks just says how many times the cycle
-- repeats before the enrollment auto-completes.
--
-- Every exercise referenced here must already exist in `exercises`
-- (seeded by 0007_exercises_equipment_seed.sql's default set).
--
-- Idempotent: each program insert targets the partial unique index on
-- `programs.slug` below and does nothing on conflict. When a program insert
-- is skipped this way, its `returning id` CTE produces no row, which
-- naturally short-circuits the day/exercise inserts chained off of it — so
-- re-running this file is safe and a no-op once the 5 programs already
-- exist. Safe to use as-is when seeding a fresh project. On a project where
-- 0015 already ran before this idempotency was added (i.e. duplicates
-- already exist), run 0016_dedupe_default_programs.sql first — it cleans up
-- the duplicates and then creates the same index (`if not exists`, so
-- harmless if this file already created it).
create unique index if not exists programs_slug_unique_idx
  on public.programs (slug)
  where slug is not null;

-- ---------------------------------------------------------------------------
-- Push Pull Legs
-- ---------------------------------------------------------------------------
with new_program as (
  insert into public.programs (
    is_default, slug, category, name, name_ar, name_en,
    description_ar, description_en, duration_weeks, days_per_week
  )
  values (
    true, 'ppl', 'ppl', 'Push Pull Legs', 'دفع سحب أرجل', 'Push Pull Legs',
    'برنامج تقسيم دفع/سحب/أرجل على 6 أيام أسبوعيًا، مناسب لمن عنده خبرة تمرين سابقة.',
    'A 6-day push/pull/legs split for lifters with some training experience.',
    6, 6
  )
  on conflict (slug) where slug is not null do nothing
  returning id
),
new_days as (
  insert into public.program_days (program_id, day_index, name, name_ar, name_en)
  select np.id, d.day_index, d.name_en, d.name_ar, d.name_en
  from new_program np
  cross join (values
    (1, 'يوم الدفع أ', 'Push Day A'),
    (2, 'يوم السحب أ', 'Pull Day A'),
    (3, 'يوم الأرجل أ', 'Legs Day A'),
    (4, 'يوم الدفع ب', 'Push Day B'),
    (5, 'يوم السحب ب', 'Pull Day B'),
    (6, 'يوم الأرجل ب', 'Legs Day B')
  ) as d(day_index, name_ar, name_en)
  returning id, day_index
)
insert into public.program_exercises (program_day_id, exercise_id, order_index, target_sets, target_reps)
select nd.id, ex.id, x.order_index, x.target_sets, x.target_reps
from new_days nd
join (values
  (1, 'Bench Press', 1, 3, '8-12'),
  (1, 'Overhead Press', 2, 3, '8-12'),
  (1, 'Incline Bench Press', 3, 3, '8-12'),
  (1, 'Lateral Raise', 4, 3, '12-15'),
  (1, 'Tricep Pushdown', 5, 3, '12-15'),
  (2, 'Deadlift', 1, 3, '5-8'),
  (2, 'Barbell Row', 2, 3, '8-12'),
  (2, 'Lat Pulldown', 3, 3, '8-12'),
  (2, 'Face Pull', 4, 3, '12-15'),
  (2, 'Bicep Curl', 5, 3, '12-15'),
  (3, 'Barbell Squat', 1, 3, '8-12'),
  (3, 'Leg Press', 2, 3, '10-12'),
  (3, 'Leg Extension', 3, 3, '12-15'),
  (3, 'Leg Curl', 4, 3, '12-15'),
  (3, 'Calf Raise', 5, 3, '15-20'),
  (4, 'Incline Bench Press', 1, 3, '8-12'),
  (4, 'Overhead Press', 2, 3, '8-12'),
  (4, 'Push Up', 3, 3, '12-15'),
  (4, 'Dumbbell Fly', 4, 3, '12-15'),
  (4, 'Skull Crusher', 5, 3, '12-15'),
  (5, 'Barbell Row', 1, 3, '8-12'),
  (5, 'Pull Up', 2, 3, '6-10'),
  (5, 'Seated Cable Row', 3, 3, '10-12'),
  (5, 'Face Pull', 4, 3, '12-15'),
  (5, 'Hammer Curl', 5, 3, '12-15'),
  (6, 'Romanian Deadlift', 1, 3, '8-10'),
  (6, 'Bulgarian Split Squat', 2, 3, '10-12'),
  (6, 'Leg Extension', 3, 3, '12-15'),
  (6, 'Hip Thrust', 4, 3, '10-12'),
  (6, 'Calf Raise', 5, 3, '15-20')
) as x(day_index, exercise_name, order_index, target_sets, target_reps) on x.day_index = nd.day_index
join public.exercises ex on ex.name_en = x.exercise_name;

-- ---------------------------------------------------------------------------
-- Upper/Lower
-- ---------------------------------------------------------------------------
with new_program as (
  insert into public.programs (
    is_default, slug, category, name, name_ar, name_en,
    description_ar, description_en, duration_weeks, days_per_week
  )
  values (
    true, 'upper_lower', 'upper_lower', 'Upper/Lower Split', 'تقسيم علوي/سفلي', 'Upper/Lower Split',
    'برنامج تقسيم علوي/سفلي على 4 أيام أسبوعيًا يوازن بين القوة والحجم التدريبي.',
    'A 4-day upper/lower split balancing strength and volume across the week.',
    8, 4
  )
  on conflict (slug) where slug is not null do nothing
  returning id
),
new_days as (
  insert into public.program_days (program_id, day_index, name, name_ar, name_en)
  select np.id, d.day_index, d.name_en, d.name_ar, d.name_en
  from new_program np
  cross join (values
    (1, 'يوم الجزء العلوي أ', 'Upper Body A'),
    (2, 'يوم الجزء السفلي أ', 'Lower Body A'),
    (3, 'يوم الجزء العلوي ب', 'Upper Body B'),
    (4, 'يوم الجزء السفلي ب', 'Lower Body B')
  ) as d(day_index, name_ar, name_en)
  returning id, day_index
)
insert into public.program_exercises (program_day_id, exercise_id, order_index, target_sets, target_reps)
select nd.id, ex.id, x.order_index, x.target_sets, x.target_reps
from new_days nd
join (values
  (1, 'Bench Press', 1, 3, '8-12'),
  (1, 'Barbell Row', 2, 3, '8-12'),
  (1, 'Overhead Press', 3, 3, '8-12'),
  (1, 'Lat Pulldown', 4, 3, '10-12'),
  (1, 'Bicep Curl', 5, 3, '12-15'),
  (2, 'Barbell Squat', 1, 3, '8-12'),
  (2, 'Romanian Deadlift', 2, 3, '8-10'),
  (2, 'Leg Press', 3, 3, '10-12'),
  (2, 'Leg Curl', 4, 3, '12-15'),
  (2, 'Calf Raise', 5, 3, '15-20'),
  (3, 'Incline Bench Press', 1, 3, '8-12'),
  (3, 'Pull Up', 2, 3, '6-10'),
  (3, 'Lateral Raise', 3, 3, '12-15'),
  (3, 'Seated Cable Row', 4, 3, '10-12'),
  (3, 'Tricep Pushdown', 5, 3, '12-15'),
  (4, 'Deadlift', 1, 3, '5-8'),
  (4, 'Lunges', 2, 3, '10-12'),
  (4, 'Leg Extension', 3, 3, '12-15'),
  (4, 'Hip Thrust', 4, 3, '10-12'),
  (4, 'Plank', 5, 3, '30-45s')
) as x(day_index, exercise_name, order_index, target_sets, target_reps) on x.day_index = nd.day_index
join public.exercises ex on ex.name_en = x.exercise_name;

-- ---------------------------------------------------------------------------
-- Full Body
-- ---------------------------------------------------------------------------
with new_program as (
  insert into public.programs (
    is_default, slug, category, name, name_ar, name_en,
    description_ar, description_en, duration_weeks, days_per_week
  )
  values (
    true, 'full_body', 'full_body', 'Full Body', 'الجسم كامل', 'Full Body',
    'برنامج جسم كامل على 3 أيام أسبوعيًا يستهدف كل المجموعات العضلية الرئيسية كل جلسة.',
    'A 3-day full-body program hitting every major muscle group each session.',
    8, 3
  )
  on conflict (slug) where slug is not null do nothing
  returning id
),
new_days as (
  insert into public.program_days (program_id, day_index, name, name_ar, name_en)
  select np.id, d.day_index, d.name_en, d.name_ar, d.name_en
  from new_program np
  cross join (values
    (1, 'الجسم كامل أ', 'Full Body A'),
    (2, 'الجسم كامل ب', 'Full Body B'),
    (3, 'الجسم كامل ج', 'Full Body C')
  ) as d(day_index, name_ar, name_en)
  returning id, day_index
)
insert into public.program_exercises (program_day_id, exercise_id, order_index, target_sets, target_reps)
select nd.id, ex.id, x.order_index, x.target_sets, x.target_reps
from new_days nd
join (values
  (1, 'Barbell Squat', 1, 3, '8-12'),
  (1, 'Bench Press', 2, 3, '8-12'),
  (1, 'Barbell Row', 3, 3, '8-12'),
  (1, 'Plank', 4, 3, '30-45s'),
  (2, 'Deadlift', 1, 3, '5-8'),
  (2, 'Overhead Press', 2, 3, '8-12'),
  (2, 'Lat Pulldown', 3, 3, '10-12'),
  (2, 'Russian Twist', 4, 3, '15-20'),
  (3, 'Leg Press', 1, 3, '10-12'),
  (3, 'Incline Bench Press', 2, 3, '8-12'),
  (3, 'Seated Cable Row', 3, 3, '10-12'),
  (3, 'Leg Raise', 4, 3, '12-15')
) as x(day_index, exercise_name, order_index, target_sets, target_reps) on x.day_index = nd.day_index
join public.exercises ex on ex.name_en = x.exercise_name;

-- ---------------------------------------------------------------------------
-- Bro Split
-- ---------------------------------------------------------------------------
with new_program as (
  insert into public.programs (
    is_default, slug, category, name, name_ar, name_en,
    description_ar, description_en, duration_weeks, days_per_week
  )
  values (
    true, 'bro_split', 'bro_split', 'Bro Split', 'برو سبليت', 'Bro Split',
    'تقسيم كلاسيكي على 5 أيام أسبوعيًا — مجموعة عضلية واحدة كل يوم.',
    'A classic 5-day body-part split — one muscle group per day.',
    6, 5
  )
  on conflict (slug) where slug is not null do nothing
  returning id
),
new_days as (
  insert into public.program_days (program_id, day_index, name, name_ar, name_en)
  select np.id, d.day_index, d.name_en, d.name_ar, d.name_en
  from new_program np
  cross join (values
    (1, 'يوم الصدر', 'Chest Day'),
    (2, 'يوم الظهر', 'Back Day'),
    (3, 'يوم الأكتاف', 'Shoulders Day'),
    (4, 'يوم الأرجل', 'Legs Day'),
    (5, 'يوم الذراعين', 'Arms Day')
  ) as d(day_index, name_ar, name_en)
  returning id, day_index
)
insert into public.program_exercises (program_day_id, exercise_id, order_index, target_sets, target_reps)
select nd.id, ex.id, x.order_index, x.target_sets, x.target_reps
from new_days nd
join (values
  (1, 'Bench Press', 1, 4, '8-12'),
  (1, 'Incline Bench Press', 2, 3, '8-12'),
  (1, 'Dumbbell Fly', 3, 3, '12-15'),
  (1, 'Push Up', 4, 3, '12-15'),
  (2, 'Deadlift', 1, 3, '5-8'),
  (2, 'Barbell Row', 2, 4, '8-12'),
  (2, 'Lat Pulldown', 3, 3, '10-12'),
  (2, 'Pull Up', 4, 3, '6-10'),
  (3, 'Overhead Press', 1, 4, '8-12'),
  (3, 'Lateral Raise', 2, 3, '12-15'),
  (3, 'Face Pull', 3, 3, '12-15'),
  (4, 'Barbell Squat', 1, 4, '8-12'),
  (4, 'Leg Press', 2, 3, '10-12'),
  (4, 'Leg Curl', 3, 3, '12-15'),
  (4, 'Calf Raise', 4, 3, '15-20'),
  (5, 'Bicep Curl', 1, 3, '12-15'),
  (5, 'Hammer Curl', 2, 3, '12-15'),
  (5, 'Tricep Pushdown', 3, 3, '12-15'),
  (5, 'Skull Crusher', 4, 3, '12-15')
) as x(day_index, exercise_name, order_index, target_sets, target_reps) on x.day_index = nd.day_index
join public.exercises ex on ex.name_en = x.exercise_name;

-- ---------------------------------------------------------------------------
-- Beginner Program
-- ---------------------------------------------------------------------------
with new_program as (
  insert into public.programs (
    is_default, slug, category, name, name_ar, name_en,
    description_ar, description_en, duration_weeks, days_per_week
  )
  values (
    true, 'beginner', 'beginner', 'Beginner Program', 'برنامج المبتدئين', 'Beginner Program',
    'برنامج جسم كامل بسيط على 3 أيام أسبوعيًا لبناء عادة التمرين والقوة الأساسية.',
    'A simple 3-day full-body program for building a training habit and base strength.',
    8, 3
  )
  on conflict (slug) where slug is not null do nothing
  returning id
),
new_days as (
  insert into public.program_days (program_id, day_index, name, name_ar, name_en)
  select np.id, d.day_index, d.name_en, d.name_ar, d.name_en
  from new_program np
  cross join (values
    (1, 'اليوم الأول', 'Day 1'),
    (2, 'اليوم الثاني', 'Day 2'),
    (3, 'اليوم الثالث', 'Day 3')
  ) as d(day_index, name_ar, name_en)
  returning id, day_index
)
insert into public.program_exercises (program_day_id, exercise_id, order_index, target_sets, target_reps)
select nd.id, ex.id, x.order_index, x.target_sets, x.target_reps
from new_days nd
join (values
  (1, 'Barbell Squat', 1, 3, '10-12'),
  (1, 'Push Up', 2, 3, '10-15'),
  (1, 'Seated Cable Row', 3, 3, '10-12'),
  (1, 'Plank', 4, 2, '20-30s'),
  (2, 'Leg Press', 1, 3, '10-12'),
  (2, 'Bench Press', 2, 3, '10-12'),
  (2, 'Lat Pulldown', 3, 3, '10-12'),
  (2, 'Crunch', 4, 2, '15-20'),
  (3, 'Romanian Deadlift', 1, 3, '10-12'),
  (3, 'Overhead Press', 2, 3, '10-12'),
  (3, 'Barbell Row', 3, 3, '10-12'),
  (3, 'Leg Raise', 4, 2, '12-15')
) as x(day_index, exercise_name, order_index, target_sets, target_reps) on x.day_index = nd.day_index
join public.exercises ex on ex.name_en = x.exercise_name;
