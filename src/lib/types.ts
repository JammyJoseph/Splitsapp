// Domain types for Tracklock. Mirrors the SQL schema in /supabase/migrations.

export type UserType = "creator" | "manager" | "organisation" | "admin";
export type ReleaseStatus = "unreleased" | "planned" | "released" | "unknown";
export type TrackStatus =
  | "draft"
  | "sent"
  | "changes_requested"
  | "locked"
  | "archived";
export type CollaboratorRole =
  | "artist"
  | "featured_artist"
  | "producer"
  | "co_producer"
  | "songwriter"
  | "topliner"
  | "composer"
  | "engineer"
  | "mixer"
  | "other";
export type SignatureStatus = "pending" | "signed" | "change_requested";
export type AgreementStatus =
  | "draft"
  | "sent"
  | "changes_requested"
  | "locked"
  | "superseded"
  | "archived";
export type ChangeRequestStatus = "open" | "resolved" | "dismissed";

export interface DbUser {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  user_type: UserType;
  created_at: string;
  updated_at: string;
}

export interface Track {
  id: string;
  created_by_user_id: string;
  organisation_id: string | null;
  client_id: string | null;
  title: string;
  artist_project_name: string | null;
  session_date: string | null;
  audio_link: string | null;
  release_status: ReleaseStatus | null;
  master_ownership_note: string | null;
  notes: string | null;
  status: TrackStatus;
  current_version: number;
  created_at: string;
  updated_at: string;
}

export interface Collaborator {
  id: string;
  track_id: string;
  name: string;
  email: string;
  phone: string | null;
  role: CollaboratorRole;
  manager_email: string | null;
  publishing_percentage: number;
  signature_status: SignatureStatus;
  signed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SplitAgreement {
  id: string;
  track_id: string;
  version: number;
  legal_template_id: string | null;
  status: AgreementStatus;
  total_publishing_percentage: number;
  locked_at: string | null;
  pdf_url: string | null;
  unique_agreement_reference: string;
  created_at: string;
  updated_at: string;
}

export interface Signature {
  id: string;
  split_agreement_id: string;
  collaborator_id: string;
  name: string;
  email: string;
  typed_signature: string;
  accepted_terms: boolean;
  accepted_e_signature: boolean;
  confirmed_accuracy: boolean;
  ip_address: string | null;
  user_agent: string | null;
  signed_at: string;
}

export interface ChangeRequest {
  id: string;
  split_agreement_id: string;
  collaborator_id: string | null;
  reason: string;
  proposed_change: string | null;
  status: ChangeRequestStatus;
  created_at: string;
  resolved_at: string | null;
}

export interface LegalTemplate {
  id: string;
  version: string;
  title: string;
  body: string;
  governing_law: string;
  effective_date: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuditEvent {
  id: string;
  split_agreement_id: string | null;
  track_id: string | null;
  actor_user_id: string | null;
  actor_email: string | null;
  event_type: string;
  event_data: Record<string, unknown>;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

export interface SigningToken {
  id: string;
  token: string;
  split_agreement_id: string;
  collaborator_id: string;
  expires_at: string | null;
  created_at: string;
}
