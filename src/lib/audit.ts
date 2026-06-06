import type { SupabaseClient } from "@supabase/supabase-js";

export type AuditEventType =
  | "track_created"
  | "collaborator_added"
  | "collaborator_updated"
  | "split_sent"
  | "invite_sent"
  | "invite_viewed"
  | "collaborator_signed"
  | "change_requested"
  | "change_resolved"
  | "agreement_locked"
  | "pdf_generated"
  | "agreement_superseded"
  | "reminder_sent";

interface RecordAuditArgs {
  eventType: AuditEventType;
  trackId?: string | null;
  splitAgreementId?: string | null;
  actorUserId?: string | null;
  actorEmail?: string | null;
  eventData?: Record<string, unknown>;
  ipAddress?: string | null;
  userAgent?: string | null;
}

// Append an immutable audit event. Best-effort: never throws into the caller.
export async function recordAudit(
  client: SupabaseClient,
  args: RecordAuditArgs,
): Promise<void> {
  const { error } = await client.from("audit_events").insert({
    event_type: args.eventType,
    track_id: args.trackId ?? null,
    split_agreement_id: args.splitAgreementId ?? null,
    actor_user_id: args.actorUserId ?? null,
    actor_email: args.actorEmail ?? null,
    event_data: args.eventData ?? {},
    ip_address: args.ipAddress ?? null,
    user_agent: args.userAgent ?? null,
  });
  if (error) {
    console.error("[audit] failed to record event", args.eventType, error.message);
  }
}
