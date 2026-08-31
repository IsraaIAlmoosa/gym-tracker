-- Gym Tracker: equipment type per exercise (e.g. barbell, dumbbell, machine, bodyweight).

alter table public.exercises
  add column if not exists equipment_ar text,
  add column if not exists equipment_en text;
