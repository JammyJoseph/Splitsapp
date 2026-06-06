import type { SupabaseClient } from "@supabase/supabase-js";
import type {
  AuditEvent,
  ChangeRequest,
  Collaborator,
  LegalTemplate,
  Signature,
  SplitAgreement,
  Track,
} from "./types";

export interface TrackBundle {
  track: Track;
  collaborators: Collaborator[];
  agreements: SplitAgreement[];
  currentAgreement: SplitAgreement | null;
  signatures: Signature[];
  changeRequests: ChangeRequest[];
  auditEvents: AuditEvent[];
  legalTemplate: LegalTemplate | null;
}

// Loads everything needed to render a track's detail / review / locked pages.
// Uses whichever client is passed (user-scoped or admin).
export async function loadTrackBundle(
  client: SupabaseClient,
  trackId: string,
): Promise<TrackBundle | null> {
  const { data: track } = await client
    .from("tracks")
    .select("*")
    .eq("id", trackId)
    .maybeSingle<Track>();
  if (!track) return null;

  const [{ data: collaborators }, { data: agreements }] = await Promise.all([
    client.from("collaborators").select("*").eq("track_id", trackId).order("created_at"),
    client
      .from("split_agreements")
      .select("*")
      .eq("track_id", trackId)
      .order("version", { ascending: false }),
  ]);

  const agreementList = (agreements ?? []) as SplitAgreement[];
  const currentAgreement = agreementList[0] ?? null;

  let signatures: Signature[] = [];
  let changeRequests: ChangeRequest[] = [];
  let legalTemplate: LegalTemplate | null = null;

  if (currentAgreement) {
    const [{ data: sigs }, { data: crs }] = await Promise.all([
      client
        .from("signatures")
        .select("*")
        .eq("split_agreement_id", currentAgreement.id),
      client
        .from("change_requests")
        .select("*")
        .eq("split_agreement_id", currentAgreement.id)
        .order("created_at", { ascending: false }),
    ]);
    signatures = (sigs ?? []) as Signature[];
    changeRequests = (crs ?? []) as ChangeRequest[];

    if (currentAgreement.legal_template_id) {
      const { data: lt } = await client
        .from("legal_templates")
        .select("*")
        .eq("id", currentAgreement.legal_template_id)
        .maybeSingle<LegalTemplate>();
      legalTemplate = lt ?? null;
    }
  }

  const { data: audit } = await client
    .from("audit_events")
    .select("*")
    .eq("track_id", trackId)
    .order("created_at", { ascending: false });

  return {
    track,
    collaborators: (collaborators ?? []) as Collaborator[],
    agreements: agreementList,
    currentAgreement,
    signatures,
    changeRequests,
    auditEvents: (audit ?? []) as AuditEvent[],
    legalTemplate,
  };
}
