-- ===========================================================================
-- Tracklock — Phase A
--   1. Audio upload (Supabase Storage)
--   2. Release metadata: ISRC / UPC / artwork + go-live detection
--   3. Manager <-> producer delegated access (request + consent)
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- 1 + 2. Track columns for audio + release metadata
-- ---------------------------------------------------------------------------
alter table public.tracks add column if not exists audio_path text;
alter table public.tracks add column if not exists spotify_track_id text;
alter table public.tracks add column if not exists isrc text;
alter table public.tracks add column if not exists upc text;
alter table public.tracks add column if not exists artwork_url text;
alter table public.tracks add column if not exists released_at timestamptz;
alter table public.tracks add column if not exists release_watch boolean not null default false;
alter table public.tracks add column if not exists last_release_check timestamptz;

-- ---------------------------------------------------------------------------
-- 3. account_access — a manager requests delegated access to a producer's
--    account; the producer consents. Read-only ('view') or 'manage'.
-- ---------------------------------------------------------------------------
create table if not exists public.account_access (
  id               uuid primary key default gen_random_uuid(),
  manager_user_id  uuid not null references public.users(id) on delete cascade,
  artist_email     text not null,
  artist_user_id   uuid references public.users(id) on delete cascade,
  scope            text not null default 'view' check (scope in ('view', 'manage')),
  status           text not null default 'pending'
                     check (status in ('pending', 'approved', 'declined', 'revoked')),
  message          text,
  created_at       timestamptz not null default now(),
  responded_at     timestamptz,
  unique (manager_user_id, artist_email)
);
create index if not exists account_access_artist_idx
  on public.account_access(artist_user_id);
create index if not exists account_access_artist_email_idx
  on public.account_access(lower(artist_email));

-- Does the current user manage `target` (approved delegation)?
create or replace function public.manages_user(target uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.account_access aa
    where aa.manager_user_id = auth.uid()
      and aa.artist_user_id = target
      and aa.status = 'approved'
  );
$$;

-- Extend view access: owner / org / collaborator-by-email / admin / manager.
create or replace function public.can_view_track(t uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_access_track(t)
    or exists (
      select 1 from public.collaborators c
      where c.track_id = t
        and lower(c.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
    or exists (
      select 1 from public.tracks tr
      where tr.id = t and public.manages_user(tr.created_by_user_id)
    );
$$;

alter table public.account_access enable row level security;

drop policy if exists account_access_select on public.account_access;
create policy account_access_select on public.account_access for select
  using (
    manager_user_id = auth.uid()
    or artist_user_id = auth.uid()
    or lower(artist_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or public.is_admin()
  );

-- Managers create their own requests.
drop policy if exists account_access_insert on public.account_access;
create policy account_access_insert on public.account_access for insert
  with check (manager_user_id = auth.uid());

-- The producer (by id or matching email) can respond; the manager can revoke.
drop policy if exists account_access_update on public.account_access;
create policy account_access_update on public.account_access for update
  using (
    artist_user_id = auth.uid()
    or lower(artist_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    or manager_user_id = auth.uid()
    or public.is_admin()
  )
  with check (true);

drop policy if exists account_access_delete on public.account_access;
create policy account_access_delete on public.account_access for delete
  using (manager_user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- Storage: private bucket for track audio
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('track-audio', 'track-audio', false)
on conflict (id) do nothing;

-- Path convention: "<track_id>/<filename>". Access gated by track access.
drop policy if exists "track audio read" on storage.objects;
create policy "track audio read" on storage.objects for select
  using (
    bucket_id = 'track-audio'
    and public.can_view_track(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "track audio insert" on storage.objects;
create policy "track audio insert" on storage.objects for insert
  with check (
    bucket_id = 'track-audio'
    and public.can_access_track(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "track audio update" on storage.objects;
create policy "track audio update" on storage.objects for update
  using (
    bucket_id = 'track-audio'
    and public.can_access_track(((storage.foldername(name))[1])::uuid)
  );

drop policy if exists "track audio delete" on storage.objects;
create policy "track audio delete" on storage.objects for delete
  using (
    bucket_id = 'track-audio'
    and public.can_access_track(((storage.foldername(name))[1])::uuid)
  );
