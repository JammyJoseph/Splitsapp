import type {
  AgreementStatus,
  CollaboratorRole,
  ReleaseStatus,
  TrackStatus,
} from "./types";

export const APP_NAME = "Tracklock";
export const TAGLINE = "Lock your splits before the song leaves the room.";

export const ROLE_LABELS: Record<CollaboratorRole, string> = {
  artist: "Artist",
  featured_artist: "Featured artist",
  producer: "Producer",
  co_producer: "Co-producer",
  songwriter: "Songwriter",
  topliner: "Topliner",
  composer: "Composer",
  engineer: "Engineer",
  mixer: "Mixer",
  other: "Other",
};

export const ROLE_OPTIONS = Object.entries(ROLE_LABELS) as [
  CollaboratorRole,
  string,
][];

export const RELEASE_STATUS_LABELS: Record<ReleaseStatus, string> = {
  unreleased: "Unreleased",
  planned: "Planned release",
  released: "Released",
  unknown: "Unknown",
};

export const TRACK_STATUS_LABELS: Record<TrackStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  changes_requested: "Changes requested",
  locked: "Locked",
  archived: "Archived",
};

// Tailwind class hints for status badges (dark theme).
export const STATUS_BADGE: Record<string, string> = {
  draft: "bg-white/5 text-zinc-400 border-white/10",
  sent: "bg-blue-500/10 text-blue-300 border-blue-500/20",
  awaiting_you: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  waiting: "bg-indigo-500/10 text-indigo-300 border-indigo-500/20",
  changes_requested: "bg-rose-500/10 text-rose-300 border-rose-500/20",
  locked: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  archived: "bg-white/5 text-zinc-500 border-white/10",
  signed: "bg-emerald-500/10 text-emerald-300 border-emerald-500/20",
  pending: "bg-amber-500/10 text-amber-300 border-amber-500/20",
  superseded: "bg-white/5 text-zinc-500 border-white/10",
};

export const AGREEMENT_STATUS_LABELS: Record<AgreementStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  changes_requested: "Changes requested",
  locked: "Locked",
  superseded: "Superseded",
  archived: "Archived",
};

// Human labels for audit event types (shared across dashboard, track page, admin).
export const AUDIT_LABELS: Record<string, string> = {
  track_created: "Track created",
  collaborator_added: "Collaborator added",
  collaborator_updated: "Collaborators updated",
  split_sent: "Sent to lock",
  invite_sent: "Invite sent",
  invite_viewed: "Invite viewed",
  collaborator_signed: "Signed",
  change_requested: "Change requested",
  change_resolved: "Change resolved",
  agreement_locked: "Split locked",
  pdf_generated: "PDF generated",
  agreement_superseded: "Version superseded",
  reminder_sent: "Reminder sent",
};

export const AUDIT_EMOJI: Record<string, string> = {
  track_created: "✦",
  split_sent: "➤",
  invite_sent: "✉",
  invite_viewed: "👁",
  collaborator_signed: "✓",
  change_requested: "⚠",
  change_resolved: "↺",
  agreement_locked: "🔒",
  pdf_generated: "⤓",
  agreement_superseded: "⎇",
  reminder_sent: "🔔",
};

export function appUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export function adminEmails(): string[] {
  return (process.env.TRACKLOCK_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}
