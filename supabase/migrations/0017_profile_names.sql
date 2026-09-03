-- Gym Tracker: optional first/last name on profiles, so the app can greet
-- users by name instead of falling back to their email. Same self-service
-- pattern as 0008 (gender/age/preferred_weight_unit): nullable columns +
-- column-level GRANT UPDATE, reusing the existing
-- "profiles_update_own_self_service" policy (id = auth.uid()) from 0008 —
-- no new policy needed.

alter table public.profiles
  add column if not exists first_name text,
  add column if not exists last_name text;

grant update (first_name, last_name) on public.profiles to authenticated;
