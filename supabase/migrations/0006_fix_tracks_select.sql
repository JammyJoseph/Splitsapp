-- ===========================================================================
-- Tracklock — fix tracks_select self-reference
-- The previous policy used can_view_track(id), which re-queries the tracks
-- table by id. During INSERT ... RETURNING (supabase-js default) the new row
-- isn't visible to that sub-query yet, so the SELECT check failed and the whole
-- insert was rejected ("new row violates row-level security policy").
-- Fix: evaluate ownership/visibility against the row's OWN columns directly.
-- ===========================================================================

drop policy if exists tracks_select on public.tracks;
create policy tracks_select on public.tracks for select
  using (
    created_by_user_id = auth.uid()
    or (organisation_id is not null and public.is_org_member(organisation_id))
    or public.is_admin()
    or exists (
      select 1 from public.collaborators c
      where c.track_id = tracks.id
        and lower(c.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    )
    or public.manages_user(created_by_user_id)
  );
