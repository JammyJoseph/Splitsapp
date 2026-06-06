import type { SupabaseClient } from "@supabase/supabase-js";
import { recordAudit } from "./audit";
import { sendEmail, lockedEmail } from "./email";
import { appUrl } from "./constants";
import type { Collaborator, SplitAgreement, Track } from "./types";

const PCT_EPSILON = 0.01;

export interface LockReadiness {
  ready: boolean;
  reasons: string[];
  total: number;
  signedCount: number;
  totalCount: number;
  openChangeRequests: number;
}

// Evaluates whether an agreement satisfies every condition required to lock.
export function evaluateLockReadiness(
  track: Track,
  collaborators: Collaborator[],
  signedCollaboratorIds: Set<string>,
  openChangeRequests: number,
): LockReadiness {
  const reasons: string[] = [];
  const total = collaborators.reduce(
    (s, c) => s + Number(c.publishing_percentage),
    0,
  );

  if (!track.title?.trim()) reasons.push("Track title is required.");
  if (collaborators.length === 0) reasons.push("Add at least one collaborator.");
  if (Math.abs(total - 100) > PCT_EPSILON)
    reasons.push(`Publishing splits must total 100% (currently ${total}%).`);

  const signedCount = collaborators.filter((c) =>
    signedCollaboratorIds.has(c.id),
  ).length;
  if (signedCount < collaborators.length)
    reasons.push(
      `Waiting on ${collaborators.length - signedCount} of ${collaborators.length} signatures.`,
    );

  if (openChangeRequests > 0)
    reasons.push(`${openChangeRequests} unresolved change request(s).`);

  return {
    ready: reasons.length === 0,
    reasons,
    total,
    signedCount,
    totalCount: collaborators.length,
    openChangeRequests,
  };
}

// Attempts to lock an agreement if all conditions are met. Uses a privileged
// (service role) client. Returns whether it locked and why not if it didn't.
// Idempotent: returns early if already locked.
export async function attemptLockAgreement(
  admin: SupabaseClient,
  agreementId: string,
): Promise<{ locked: boolean; readiness: LockReadiness | null }> {
  const { data: agreement } = await admin
    .from("split_agreements")
    .select("*")
    .eq("id", agreementId)
    .single<SplitAgreement>();
  if (!agreement) return { locked: false, readiness: null };
  if (agreement.status === "locked")
    return { locked: true, readiness: null };

  const { data: track } = await admin
    .from("tracks")
    .select("*")
    .eq("id", agreement.track_id)
    .single<Track>();
  if (!track) return { locked: false, readiness: null };

  const { data: collaborators } = await admin
    .from("collaborators")
    .select("*")
    .eq("track_id", track.id)
    .order("created_at");
  const collabs = (collaborators ?? []) as Collaborator[];

  const { data: signatures } = await admin
    .from("signatures")
    .select("collaborator_id")
    .eq("split_agreement_id", agreementId);
  const signedIds = new Set(
    (signatures ?? []).map((s: { collaborator_id: string }) => s.collaborator_id),
  );

  const { count: openCount } = await admin
    .from("change_requests")
    .select("id", { count: "exact", head: true })
    .eq("split_agreement_id", agreementId)
    .eq("status", "open");

  const readiness = evaluateLockReadiness(
    track,
    collabs,
    signedIds,
    openCount ?? 0,
  );
  if (!readiness.ready) return { locked: false, readiness };

  const lockedAt = new Date().toISOString();
  const pdfUrl = `/api/pdf/${agreementId}`;

  await admin
    .from("split_agreements")
    .update({
      status: "locked",
      locked_at: lockedAt,
      total_publishing_percentage: readiness.total,
      pdf_url: pdfUrl,
    })
    .eq("id", agreementId);

  await admin
    .from("tracks")
    .update({ status: "locked" })
    .eq("id", track.id);

  await recordAudit(admin, {
    eventType: "agreement_locked",
    trackId: track.id,
    splitAgreementId: agreementId,
    eventData: { reference: agreement.unique_agreement_reference, lockedAt },
  });
  await recordAudit(admin, {
    eventType: "pdf_generated",
    trackId: track.id,
    splitAgreementId: agreementId,
    eventData: { pdfUrl },
  });

  // Notify every party that the split is locked.
  const link = `${appUrl()}/splits/${track.id}`;
  for (const c of collabs) {
    const tmpl = lockedEmail(track.title, agreement.unique_agreement_reference, link);
    await sendEmail({ ...tmpl, to: c.email });
    await admin.from("notifications").insert({
      recipient_email: c.email,
      type: "agreement_locked",
      status: "sent",
      related_track_id: track.id,
      related_agreement_id: agreementId,
      sent_at: new Date().toISOString(),
    });
  }

  return { locked: true, readiness };
}
