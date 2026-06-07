-- ===========================================================================
-- Tracklock — artist profiles (Spotify-linked credentials/insights)
-- v1.1 M4. Public catalog data only — no earnings, no user tokens stored.
-- ===========================================================================

create table if not exists public.artist_profiles (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null unique references public.users(id) on delete cascade,
  spotify_artist_id text,
  name              text,
  image_url         text,
  followers         integer,
  popularity        integer,
  genres            text[],
  spotify_url       text,
  raw               jsonb,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

drop trigger if exists set_updated_at on public.artist_profiles;
create trigger set_updated_at before update on public.artist_profiles
  for each row execute function public.set_updated_at();

alter table public.artist_profiles enable row level security;

drop policy if exists artist_profiles_select on public.artist_profiles;
create policy artist_profiles_select on public.artist_profiles for select
  using (user_id = auth.uid() or public.is_admin());

drop policy if exists artist_profiles_write on public.artist_profiles;
create policy artist_profiles_write on public.artist_profiles for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
