-- Gym Tracker: InBody / body composition measurements (weight, skeletal muscle
-- mass, body fat %, BMI, BMR, body water, visceral fat, waist/hip ratio,
-- protein/mineral mass, optional segmental analysis). Distinct from
-- body_measurements (0005), which tracks simple tape-measure circumferences.

create table if not exists public.inbody_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  measurement_date date not null default current_date,
  height_cm numeric(5, 1) check (height_cm >= 0),
  weight_kg numeric(6, 2) check (weight_kg >= 0),
  skeletal_muscle_mass_kg numeric(5, 2) check (skeletal_muscle_mass_kg >= 0),
  body_fat_percentage numeric(4, 1) check (body_fat_percentage between 0 and 100),
  body_fat_mass_kg numeric(5, 2) check (body_fat_mass_kg >= 0),
  bmi numeric(4, 1) check (bmi >= 0),
  basal_metabolic_rate_kcal integer check (basal_metabolic_rate_kcal >= 0),
  body_water_liters numeric(5, 2) check (body_water_liters >= 0),
  visceral_fat_level numeric(4, 1) check (visceral_fat_level >= 0),
  waist_hip_ratio numeric(4, 2) check (waist_hip_ratio >= 0),
  protein_mass_kg numeric(5, 2) check (protein_mass_kg >= 0),
  mineral_mass_kg numeric(5, 2) check (mineral_mass_kg >= 0),
  segmental_data jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists inbody_measurements_user_id_idx on public.inbody_measurements (user_id);
create index if not exists inbody_measurements_date_idx on public.inbody_measurements (measurement_date);

alter table public.inbody_measurements enable row level security;

drop policy if exists "inbody_measurements_select_own" on public.inbody_measurements;
create policy "inbody_measurements_select_own"
  on public.inbody_measurements for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "inbody_measurements_insert_own" on public.inbody_measurements;
create policy "inbody_measurements_insert_own"
  on public.inbody_measurements for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "inbody_measurements_update_own" on public.inbody_measurements;
create policy "inbody_measurements_update_own"
  on public.inbody_measurements for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "inbody_measurements_delete_own" on public.inbody_measurements;
create policy "inbody_measurements_delete_own"
  on public.inbody_measurements for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.inbody_measurements to authenticated;
