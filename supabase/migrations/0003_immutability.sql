-- ===========================================================================
-- Tracklock — immutability guards
-- "Locked means locked." / "Standard protection terms cannot be edited."
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- legal_templates: once a row exists, its legal substance (body/version/
-- effective_date/title/governing_law) can NEVER be edited. Only the `active`
-- flag may be toggled. New terms => new row (new version).
-- ---------------------------------------------------------------------------
create or replace function public.guard_legal_template_immutable()
returns trigger language plpgsql as $$
begin
  if (new.body <> old.body
      or new.version <> old.version
      or new.title <> old.title
      or new.effective_date <> old.effective_date
      or coalesce(new.governing_law,'') <> coalesce(old.governing_law,'')) then
    raise exception 'Legal templates are immutable. Create a new version instead of editing %.', old.version;
  end if;
  return new;
end $$;

drop trigger if exists guard_legal_template_immutable on public.legal_templates;
create trigger guard_legal_template_immutable
  before update on public.legal_templates
  for each row execute function public.guard_legal_template_immutable();

-- ---------------------------------------------------------------------------
-- split_agreements: a LOCKED agreement is frozen. The only permitted
-- transition is locked -> superseded/archived (status only). Material fields
-- can never change after lock. New terms => new agreement version.
-- ---------------------------------------------------------------------------
create or replace function public.guard_locked_agreement()
returns trigger language plpgsql as $$
begin
  if old.status = 'locked' then
    if (new.version <> old.version
        or new.legal_template_id is distinct from old.legal_template_id
        or new.total_publishing_percentage <> old.total_publishing_percentage
        or new.unique_agreement_reference <> old.unique_agreement_reference
        or new.locked_at is distinct from old.locked_at
        or new.track_id <> old.track_id) then
      raise exception 'Locked agreement % cannot be edited. Create a new version.', old.unique_agreement_reference;
    end if;
    if new.status not in ('locked', 'superseded', 'archived') then
      raise exception 'A locked agreement may only move to superseded or archived.';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists guard_locked_agreement on public.split_agreements;
create trigger guard_locked_agreement
  before update on public.split_agreements
  for each row execute function public.guard_locked_agreement();

-- ---------------------------------------------------------------------------
-- signatures are write-once: no updates, no deletes.
-- ---------------------------------------------------------------------------
create or replace function public.guard_signature_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'Signatures are immutable evidence and cannot be modified or deleted.';
end $$;

drop trigger if exists guard_signature_update on public.signatures;
create trigger guard_signature_update
  before update or delete on public.signatures
  for each row execute function public.guard_signature_immutable();

-- ---------------------------------------------------------------------------
-- audit_events are append-only.
-- ---------------------------------------------------------------------------
create or replace function public.guard_audit_immutable()
returns trigger language plpgsql as $$
begin
  raise exception 'Audit events are append-only and cannot be modified or deleted.';
end $$;

drop trigger if exists guard_audit_update on public.audit_events;
create trigger guard_audit_update
  before update or delete on public.audit_events
  for each row execute function public.guard_audit_immutable();
