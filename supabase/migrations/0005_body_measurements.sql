-- Gym Tracker: body measurements history (weight, waist, chest, arm, thigh, hip).

create table if not exists public.body_measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade default auth.uid(),
  measurement_date date not null default current_date,
  weight_kg numeric(6, 2) check (weight_kg >= 0),
  waist_cm numeric(6, 2) check (waist_cm >= 0),
  chest_cm numeric(6, 2) check (chest_cm >= 0),
  arm_cm numeric(6, 2) check (arm_cm >= 0),
  thigh_cm numeric(6, 2) check (thigh_cm >= 0),
  hip_cm numeric(6, 2) check (hip_cm >= 0),
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists body_measurements_user_id_idx on public.body_measurements (user_id);
create index if not exists body_measurements_date_idx on public.body_measurements (measurement_date);

alter table public.body_measurements enable row level security;

drop policy if exists "body_measurements_select_own" on public.body_measurements;
create policy "body_measurements_select_own"
  on public.body_measurements for select
  to authenticated
  using (user_id = auth.uid());

drop policy if exists "body_measurements_insert_own" on public.body_measurements;
create policy "body_measurements_insert_own"
  on public.body_measurements for insert
  to authenticated
  with check (user_id = auth.uid());

drop policy if exists "body_measurements_update_own" on public.body_measurements;
create policy "body_measurements_update_own"
  on public.body_measurements for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists "body_measurements_delete_own" on public.body_measurements;
create policy "body_measurements_delete_own"
  on public.body_measurements for delete
  to authenticated
  using (user_id = auth.uid());

grant select, insert, update, delete on public.body_measurements to authenticated;
