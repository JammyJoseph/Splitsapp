-- ===========================================================================
-- Tracklock — initial schema
-- "Lock your splits before the song leaves the room."
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type user_type as enum ('creator', 'manager', 'organisation', 'admin');
exception when duplicate_object then null; end $$;

do $$ begin
  create type organisation_type as enum ('manager', 'label', 'publisher', 'studio', 'other');
exception when duplicate_object then null; end $$;

do $$ begin
  create type org_member_role as enum ('owner', 'admin', 'member');
exception when duplicate_object then null; end $$;

do $$ begin
  create type release_status as enum ('unreleased', 'planned', 'released', 'unknown');
exception when duplicate_object then null; end $$;

do $$ begin
  create type track_status as enum ('draft', 'sent', 'changes_requested', 'locked', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type collaborator_role as enum (
    'artist', 'featured_artist', 'producer', 'co_producer', 'songwriter',
    'topliner', 'composer', 'engineer', 'mixer', 'other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type signature_status as enum ('pending', 'signed', 'change_requested');
exception when duplicate_object then null; end $$;

do $$ begin
  create type agreement_status as enum ('draft', 'sent', 'changes_requested', 'locked', 'superseded', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type change_request_status as enum ('open', 'resolved', 'dismissed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type notification_status as enum ('queued', 'sent', 'failed');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- users  (mirror of auth.users, holds Tracklock profile data)
-- ---------------------------------------------------------------------------
create table if not exists public.users (
  id          uuid primary key references auth.users(id) on delete cascade,
  name        text,
  email       text not null,
  phone       text,
  user_type   user_type not null default 'creator',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- organisations
-- ---------------------------------------------------------------------------
create table if not exists public.organisations (
  id                 uuid primary key default gen_random_uuid(),
  name               text not null,
  organisation_type  organisation_type not null default 'manager',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);

create table if not exists public.organisation_users (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  user_id          uuid not null references public.users(id) on delete cascade,
  role             org_member_role not null default 'member',
  created_at       timestamptz not null default now(),
  unique (organisation_id, user_id)
);

create table if not exists public.clients (
  id               uuid primary key default gen_random_uuid(),
  organisation_id  uuid not null references public.organisations(id) on delete cascade,
  name             text not null,
  email            text,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- legal_templates  (immutable, version-controlled standard protection terms)
-- ---------------------------------------------------------------------------
create table if not exists public.legal_templates (
  id              uuid primary key default gen_random_uuid(),
  version         text not null unique,
  title           text not null,
  body            text not null,
  governing_law   text not null default 'England and Wales',
  effective_date  date not null default now(),
  active          boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- tracks
-- ---------------------------------------------------------------------------
create table if not exists public.tracks (
  id                    uuid primary key default gen_random_uuid(),
  created_by_user_id    uuid not null references public.users(id) on delete cascade,
  organisation_id       uuid references public.organisations(id) on delete set null,
  client_id             uuid references public.clients(id) on delete set null,
  title                 text not null,
  artist_project_name   text,
  session_date          date,
  audio_link            text,
  release_status        release_status default 'unknown',
  master_ownership_note text,
  notes                 text,
  status                track_status not null default 'draft',
  current_version       integer not null default 1,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- collaborators
-- ---------------------------------------------------------------------------
create table if not exists public.collaborators (
  id                    uuid primary key default gen_random_uuid(),
  track_id              uuid not null references public.tracks(id) on delete cascade,
  name                  text not null,
  email                 text not null,
  phone                 text,
  role                  collaborator_role not null default 'other',
  manager_email         text,
  publishing_percentage numeric(6,3) not null default 0 check (publishing_percentage >= 0 and publishing_percentage <= 100),
  signature_status      signature_status not null default 'pending',
  signed_at             timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists collaborators_track_id_idx on public.collaborators(track_id);
create index if not exists collaborators_email_idx on public.collaborators(lower(email));

-- ---------------------------------------------------------------------------
-- split_agreements  (one per track version)
-- ---------------------------------------------------------------------------
create table if not exists public.split_agreements (
  id                          uuid primary key default gen_random_uuid(),
  track_id                    uuid not null references public.tracks(id) on delete cascade,
  version                     integer not null default 1,
  legal_template_id           uuid references public.legal_templates(id),
  status                      agreement_status not null default 'draft',
  total_publishing_percentage numeric(6,3) not null default 0,
  locked_at                   timestamptz,
  pdf_url                     text,
  unique_agreement_reference  text not null unique,
  created_at                  timestamptz not null default now(),
  updated_at                  timestamptz not null default now(),
  unique (track_id, version)
);
create index if not exists split_agreements_track_id_idx on public.split_agreements(track_id);

-- ---------------------------------------------------------------------------
-- signing_tokens  (secure per-collaborator invite links)
-- ---------------------------------------------------------------------------
create table if not exists public.signing_tokens (
  id                 uuid primary key default gen_random_uuid(),
  token              text not null unique,
  split_agreement_id uuid not null references public.split_agreements(id) on delete cascade,
  collaborator_id    uuid not null references public.collaborators(id) on delete cascade,
  expires_at         timestamptz,
  created_at         timestamptz not null default now()
);
create index if not exists signing_tokens_token_idx on public.signing_tokens(token);

-- ---------------------------------------------------------------------------
-- signatures
-- ---------------------------------------------------------------------------
create table if not exists public.signatures (
  id                  uuid primary key default gen_random_uuid(),
  split_agreement_id  uuid not null references public.split_agreements(id) on delete cascade,
  -- Signatures are immutable evidence; if a collaborator row is later removed
  -- on a new version, the signature is preserved with name/email captured here.
  collaborator_id     uuid references public.collaborators(id) on delete set null,
  name                text not null,
  email               text not null,
  typed_signature     text not null,
  accepted_terms      boolean not null default false,
  accepted_e_signature boolean not null default false,
  confirmed_accuracy  boolean not null default false,
  ip_address          text,
  user_agent          text,
  signed_at           timestamptz not null default now(),
  unique (split_agreement_id, collaborator_id)
);

-- ---------------------------------------------------------------------------
-- change_requests
-- ---------------------------------------------------------------------------
create table if not exists public.change_requests (
  id                  uuid primary key default gen_random_uuid(),
  split_agreement_id  uuid not null references public.split_agreements(id) on delete cascade,
  collaborator_id     uuid references public.collaborators(id) on delete set null,
  reason              text not null,
  proposed_change     text,
  status              change_request_status not null default 'open',
  created_at          timestamptz not null default now(),
  resolved_at         timestamptz
);

-- ---------------------------------------------------------------------------
-- audit_events
-- ---------------------------------------------------------------------------
create table if not exists public.audit_events (
  id                  uuid primary key default gen_random_uuid(),
  split_agreement_id  uuid references public.split_agreements(id) on delete cascade,
  track_id            uuid references public.tracks(id) on delete cascade,
  actor_user_id       uuid references public.users(id) on delete set null,
  actor_email         text,
  event_type          text not null,
  event_data          jsonb not null default '{}'::jsonb,
  ip_address          text,
  user_agent          text,
  created_at          timestamptz not null default now()
);
create index if not exists audit_events_track_id_idx on public.audit_events(track_id);
create index if not exists audit_events_agreement_id_idx on public.audit_events(split_agreement_id);

-- ---------------------------------------------------------------------------
-- notifications
-- ---------------------------------------------------------------------------
create table if not exists public.notifications (
  id                   uuid primary key default gen_random_uuid(),
  recipient_email      text not null,
  recipient_phone      text,
  type                 text not null,
  status               notification_status not null default 'queued',
  related_track_id     uuid references public.tracks(id) on delete set null,
  related_agreement_id uuid references public.split_agreements(id) on delete set null,
  sent_at              timestamptz,
  created_at           timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- billing (stubbed for future Stripe integration)
-- ---------------------------------------------------------------------------
create table if not exists public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  user_id                uuid references public.users(id) on delete cascade,
  organisation_id        uuid references public.organisations(id) on delete cascade,
  plan                   text not null default 'free_creator',
  status                 text not null default 'active',
  stripe_customer_id     text,
  stripe_subscription_id text,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array[
    'users','organisations','clients','tracks','collaborators',
    'split_agreements','legal_templates','subscriptions'
  ] loop
    execute format(
      'drop trigger if exists set_updated_at on public.%I; create trigger set_updated_at before update on public.%I for each row execute function public.set_updated_at();',
      t, t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- New auth user -> create public.users profile row
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.users (id, email, name, user_type)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    coalesce((new.raw_user_meta_data->>'user_type')::user_type, 'creator')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
