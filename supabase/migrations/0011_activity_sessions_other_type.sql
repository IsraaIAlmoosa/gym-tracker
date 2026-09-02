-- Gym Tracker: allow a free-text "other" activity type on activity_sessions.
--
-- activity_type stays a closed set (so the app's translated labels always match a
-- real value) — the free-text name for 'other' lives in custom_activity_name instead.
-- Written as ALTERs (not a table rewrite) so it's safe whether or not 0010 has run yet.

alter table public.activity_sessions
  add column if not exists custom_activity_name text;

alter table public.activity_sessions
  drop constraint if exists activity_sessions_activity_type_check;

alter table public.activity_sessions
  add constraint activity_sessions_activity_type_check
  check (activity_type in ('yoga', 'pilates', 'tai_chi', 'walking', 'other'));

alter table public.activity_sessions
  drop constraint if exists activity_sessions_custom_name_when_other;

alter table public.activity_sessions
  add constraint activity_sessions_custom_name_when_other check (
    (activity_type = 'other' and custom_activity_name is not null and length(trim(custom_activity_name)) > 0)
    or (activity_type <> 'other' and custom_activity_name is null)
  );
