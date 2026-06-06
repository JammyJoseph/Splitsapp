-- ===========================================================================
-- Tracklock — Row Level Security
-- ===========================================================================
-- Visibility rules (section 17):
--   * tracks you created
--   * tracks belonging to an organisation you are a member of
--   * admins can see everything
--   * collaborators / invitees access a specific agreement via a secure token
--     (handled server-side with the service role, not via authenticated RLS)
-- ===========================================================================

-- --- helper: is the current user a Tracklock admin? ------------------------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.users u
    where u.id = auth.uid() and u.user_type = 'admin'
  );
$$;

-- --- helper: is the current user a member of an organisation? --------------
create or replace function public.is_org_member(org uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.organisation_users ou
    where ou.organisation_id = org and ou.user_id = auth.uid()
  );
$$;

-- --- helper: can the current user MANAGE this track? (owner/org/admin) -----
create or replace function public.can_access_track(t uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.tracks tr
    where tr.id = t
      and (
        tr.created_by_user_id = auth.uid()
        or (tr.organisation_id is not null and public.is_org_member(tr.organisation_id))
        or public.is_admin()
      )
  );
$$;

-- --- helper: can the current user VIEW this track? -------------------------
-- View access additionally includes collaborators matched by email, so a
-- signed-in collaborator can see splits awaiting their signature.
create or replace function public.can_view_track(t uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_access_track(t)
    or exists (
      select 1 from public.collaborators c
      where c.track_id = t
        and lower(c.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
    );
$$;

-- Enable RLS on all tables.
alter table public.users               enable row level security;
alter table public.organisations       enable row level security;
alter table public.organisation_users  enable row level security;
alter table public.clients             enable row level security;
alter table public.tracks              enable row level security;
alter table public.collaborators       enable row level security;
alter table public.split_agreements    enable row level security;
alter table public.signing_tokens      enable row level security;
alter table public.signatures          enable row level security;
alter table public.change_requests     enable row level security;
alter table public.audit_events        enable row level security;
alter table public.notifications       enable row level security;
alter table public.legal_templates     enable row level security;
alter table public.subscriptions       enable row level security;

-- ---------------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------------
drop policy if exists users_select_self on public.users;
create policy users_select_self on public.users for select
  using (id = auth.uid() or public.is_admin());

drop policy if exists users_update_self on public.users;
create policy users_update_self on public.users for update
  using (id = auth.uid()) with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- organisations + membership + clients
-- ---------------------------------------------------------------------------
drop policy if exists orgs_select on public.organisations;
create policy orgs_select on public.organisations for select
  using (public.is_org_member(id) or public.is_admin());

drop policy if exists org_users_select on public.organisation_users;
create policy org_users_select on public.organisation_users for select
  using (user_id = auth.uid() or public.is_org_member(organisation_id) or public.is_admin());

drop policy if exists clients_all on public.clients;
create policy clients_all on public.clients for all
  using (public.is_org_member(organisation_id) or public.is_admin())
  with check (public.is_org_member(organisation_id) or public.is_admin());

-- ---------------------------------------------------------------------------
-- tracks
-- ---------------------------------------------------------------------------
drop policy if exists tracks_select on public.tracks;
create policy tracks_select on public.tracks for select
  using (public.can_view_track(id));

drop policy if exists tracks_insert on public.tracks;
create policy tracks_insert on public.tracks for insert
  with check (created_by_user_id = auth.uid());

drop policy if exists tracks_update on public.tracks;
create policy tracks_update on public.tracks for update
  using (
    created_by_user_id = auth.uid()
    or (organisation_id is not null and public.is_org_member(organisation_id))
    or public.is_admin()
  );

drop policy if exists tracks_delete on public.tracks;
create policy tracks_delete on public.tracks for delete
  using (created_by_user_id = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------------
-- collaborators  (gated by parent track access)
-- ---------------------------------------------------------------------------
drop policy if exists collaborators_select on public.collaborators;
create policy collaborators_select on public.collaborators for select
  using (public.can_view_track(track_id));

drop policy if exists collaborators_write on public.collaborators;
create policy collaborators_write on public.collaborators for all
  using (public.can_access_track(track_id))
  with check (public.can_access_track(track_id));

-- ---------------------------------------------------------------------------
-- split_agreements  (gated by parent track access)
-- ---------------------------------------------------------------------------
drop policy if exists agreements_select on public.split_agreements;
create policy agreements_select on public.split_agreements for select
  using (public.can_view_track(track_id));

drop policy if exists agreements_modify on public.split_agreements;
create policy agreements_modify on public.split_agreements for all
  using (public.can_access_track(track_id))
  with check (public.can_access_track(track_id));

-- ---------------------------------------------------------------------------
-- signatures / change_requests / signing_tokens
-- Reads gated through the owning agreement's track.
-- Public (invitee) writes go through the service role server-side.
-- ---------------------------------------------------------------------------
drop policy if exists signatures_select on public.signatures;
create policy signatures_select on public.signatures for select
  using (exists (
    select 1 from public.split_agreements sa
    where sa.id = signatures.split_agreement_id and public.can_view_track(sa.track_id)
  ));

drop policy if exists change_requests_select on public.change_requests;
create policy change_requests_select on public.change_requests for select
  using (exists (
    select 1 from public.split_agreements sa
    where sa.id = change_requests.split_agreement_id and public.can_view_track(sa.track_id)
  ));

drop policy if exists signing_tokens_select on public.signing_tokens;
create policy signing_tokens_select on public.signing_tokens for select
  using (exists (
    select 1 from public.split_agreements sa
    where sa.id = signing_tokens.split_agreement_id and public.can_access_track(sa.track_id)
  ));

-- ---------------------------------------------------------------------------
-- audit_events  (read-only to track owners + admins; writes via service role)
-- ---------------------------------------------------------------------------
drop policy if exists audit_select on public.audit_events;
create policy audit_select on public.audit_events for select
  using (
    public.is_admin()
    or (track_id is not null and public.can_view_track(track_id))
  );

-- ---------------------------------------------------------------------------
-- notifications  (admin read only; everything else via service role)
-- ---------------------------------------------------------------------------
drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- legal_templates  (everyone authenticated may READ; only admins write,
-- and even then immutability is enforced in application + trigger layer)
-- ---------------------------------------------------------------------------
drop policy if exists legal_templates_select on public.legal_templates;
create policy legal_templates_select on public.legal_templates for select
  using (auth.role() = 'authenticated' or public.is_admin());

drop policy if exists legal_templates_admin_write on public.legal_templates;
create policy legal_templates_admin_write on public.legal_templates for all
  using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------------
drop policy if exists subscriptions_select on public.subscriptions;
create policy subscriptions_select on public.subscriptions for select
  using (user_id = auth.uid() or (organisation_id is not null and public.is_org_member(organisation_id)) or public.is_admin());
