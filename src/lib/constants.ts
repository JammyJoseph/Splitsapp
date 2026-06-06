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

// Tailwind class hints for status badges.
export const STATUS_BADGE: Record<string, string> = {
  draft: "bg-zinc-100 text-zinc-600 border-zinc-200",
  sent: "bg-blue-50 text-blue-700 border-blue-200",
  awaiting_you: "bg-amber-50 text-amber-700 border-amber-200",
  waiting: "bg-indigo-50 text-indigo-700 border-indigo-200",
  changes_requested: "bg-rose-50 text-rose-700 border-rose-200",
  locked: "bg-emerald-50 text-emerald-700 border-emerald-200",
  archived: "bg-zinc-100 text-zinc-500 border-zinc-200",
  signed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-700 border-amber-200",
  superseded: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

export const AGREEMENT_STATUS_LABELS: Record<AgreementStatus, string> = {
  draft: "Draft",
  sent: "Sent",
  changes_requested: "Changes requested",
  locked: "Locked",
  superseded: "Superseded",
  archived: "Archived",
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
