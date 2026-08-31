-- Gym Tracker: self-service profile fields (gender, age, preferred_weight_unit)
-- plus the RLS/GRANT needed for users to actually update them.
--
-- `gender`/`age` were referenced by app code (saveProfileInfo, GenderSettingsForm)
-- but never actually added to the table, and `profiles` only ever had a SELECT
-- policy (see 0002) — so those saves were silently blocked by RLS. This adds a
-- scoped UPDATE policy + column-level GRANT so users can only ever update these
-- three self-service columns on their own row, never subscription_status /
-- is_premium_override (which stay admin/billing-system controlled).

alter table public.profiles
  add column if not exists gender text check (gender in ('male', 'female')),
  add column if not exists age integer check (age between 13 and 100),
  add column if not exists preferred_weight_unit text not null default 'kg'
    check (preferred_weight_unit in ('kg', 'lb'));

drop policy if exists "profiles_update_own_self_service" on public.profiles;
create policy "profiles_update_own_self_service"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

grant update (gender, age, preferred_weight_unit) on public.profiles to authenticated;
