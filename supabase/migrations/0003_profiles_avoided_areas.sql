alter table public.profiles
  add column if not exists avoided_areas text[] not null default '{}';
