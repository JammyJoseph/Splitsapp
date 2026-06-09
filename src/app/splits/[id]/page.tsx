import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadTrackBundle } from "@/lib/queries";
import { evaluateLockReadiness } from "@/lib/agreements";
import { AppHeader } from "@/components/AppHeader";
import { Badge } from "@/components/ui";
import { SplitTable } from "@/components/SplitTable";
import { CopyLink } from "@/components/CopyLink";
import { AudioUploader, ReleasePanel } from "@/components/track/TrackMedia";
import { Confetti } from "@/components/ui/Confetti";
import {
  SendToLockButton,
  RemindButton,
  ResolveButton,
  ArchiveButton,
} from "@/components/SplitActions";
import { appUrl, RELEASE_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const AUDIT_LABELS: Record<string, string> = {
  track_created: "Track created",
  collaborator_added: "Collaborator added",
  collaborator_updated: "Collaborators updated",
  split_sent: "Sent to lock",
  invite_sent: "Invite sent",
  invite_viewed: "Invite viewed",
  collaborator_signed: "Collaborator signed",
  change_requested: "Change requested",
  change_resolved: "Change resolved",
  agreement_locked: "Agreement locked",
  pdf_generated: "PDF generated",
  agreement_superseded: "Version superseded",
  reminder_sent: "Reminder sent",
};

export default async function TrackPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();
  const bundle = await loadTrackBundle(supabase, id);
  if (!bundle) notFound();

  const {
    track,
    collaborators,
    currentAgreement,
    signatures,
    changeRequests,
    auditEvents,
    legalTemplate,
    agreements,
  } = bundle;

  const isOwner = track.created_by_user_id === user.authId || user.isAdmin;
  const isLocked = track.status === "locked";

  // Signed playback URL for private session audio.
  let audioUrl: string | null = null;
  if (track.audio_path) {
    const { data: signed } = await supabase.storage
      .from("track-audio")
      .createSignedUrl(track.audio_path, 60 * 60);
    audioUrl = signed?.signedUrl ?? null;
  }
  const signedIds = new Set(signatures.map((s) => s.collaborator_id ?? ""));
  const openChangeRequests = changeRequests.filter((c) => c.status === "open");
  const readiness = evaluateLockReadiness(
    track,
    collaborators,
    signedIds,
    openChangeRequests.length,
  );
  const shareUrl = `${appUrl()}/splits/${track.id}`;

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email} isAdmin={user.isAdmin} />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <Link href="/dashboard" className="text-sm text-zinc-500 hover:text-zinc-300">
          ← Dashboard
        </Link>

        {/* Header */}
        <div className="mt-3 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
                {track.title}
              </h1>
              <StatusBadge status={track.status} />
            </div>
            <p className="mt-1 text-sm text-zinc-400">
              {track.artist_project_name || "—"} · v{track.current_version} ·{" "}
              {RELEASE_STATUS_LABELS[track.release_status ?? "unknown"]}
            </p>
          </div>
          {isOwner && (
            <ArchiveButton
              trackId={track.id}
              archived={track.status === "archived"}
            />
          )}
        </div>

        {/* Locked banner */}
        {isLocked && currentAgreement && <Confetti fireKey={currentAgreement.id} />}
        {isLocked && currentAgreement && (
          <div className="mt-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-5">
            <div className="flex items-center gap-2 text-emerald-200">
              <span className="text-lg">🔒</span>
              <span className="font-semibold">Split Locked</span>
            </div>
            <p className="mt-1 text-sm text-emerald-300">
              Locked {formatDateTime(currentAgreement.locked_at)} · Reference{" "}
              <span className="font-mono">{currentAgreement.unique_agreement_reference}</span>
            </p>
            <p className="mt-2 text-xs text-emerald-300/80">
              Locked splits cannot be edited. To make a change, create a new
              version.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <a
                href={`/api/pdf/${currentAgreement.id}`}
                className="btn-primary"
              >
                Download PDF
              </a>
              <CopyLink url={shareUrl} />
              {isOwner && (
                <Link href={`/splits/${track.id}/edit`} className="btn-secondary">
                  Create new version
                </Link>
              )}
            </div>
          </div>
        )}

        {/* Change requests */}
        {openChangeRequests.length > 0 && (
          <div className="mt-5 rounded-2xl border border-rose-500/20 bg-rose-500/10 p-5">
            <p className="font-semibold text-rose-200">
              Changes requested ({openChangeRequests.length})
            </p>
            <div className="mt-3 space-y-3">
              {openChangeRequests.map((cr) => (
                <div key={cr.id} className="rounded-xl bg-zinc-900 p-3">
                  <p className="text-sm text-zinc-100">{cr.reason}</p>
                  {cr.proposed_change && (
                    <p className="mt-1 text-sm text-zinc-400">
                      Proposed: {cr.proposed_change}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-zinc-500">
                    {formatDateTime(cr.created_at)}
                  </p>
                  {isOwner && (
                    <div className="mt-2">
                      <ResolveButton trackId={track.id} changeRequestId={cr.id} />
                    </div>
                  )}
                </div>
              ))}
            </div>
            {isOwner && (
              <p className="mt-3 text-xs text-rose-300">
                Edit the split to address the change — saving creates a new
                version everyone re-signs.
              </p>
            )}
          </div>
        )}

        {/* Split table */}
        <div className="mt-6">
          <h2 className="mb-3 font-semibold text-zinc-50">Publishing splits</h2>
          <SplitTable
            collaborators={collaborators}
            showStatus
            highlightEmail={user.email}
          />
        </div>

        {/* Pending signatures + reminders */}
        {isOwner && (track.status === "sent" || track.status === "changes_requested") && (
          <div className="mt-6 card">
            <h2 className="font-semibold text-zinc-50">Signature status</h2>
            <p className="mt-1 text-sm text-zinc-400">
              {readiness.signedCount}/{readiness.totalCount} signed.
              {!readiness.ready && readiness.reasons.length > 0 && (
                <> {readiness.reasons[readiness.reasons.length - 1]}</>
              )}
            </p>
            <div className="mt-3 divide-y divide-white/[0.06]">
              {collaborators
                .filter((c) => c.signature_status !== "signed")
                .map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center justify-between py-2.5"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-50">{c.name}</p>
                      <p className="text-xs text-zinc-500">
                        Waiting on {c.name.split(" ")[0]}
                      </p>
                    </div>
                    <RemindButton trackId={track.id} collaboratorId={c.id} name={c.name} />
                  </div>
                ))}
              {collaborators.every((c) => c.signature_status === "signed") && (
                <p className="py-2 text-sm text-emerald-300">Everyone signed.</p>
              )}
            </div>
          </div>
        )}

        {/* Draft actions */}
        {isOwner && track.status === "draft" && (
          <div className="mt-6 flex items-center justify-between gap-3">
            <Link href={`/splits/${track.id}/edit`} className="btn-secondary">
              Edit
            </Link>
            {readiness.ready ? (
              <SendToLockButton trackId={track.id} collaboratorCount={collaborators.length} />
            ) : (
              <Link href={`/splits/${track.id}/review`} className="btn-primary">
                Review & send
              </Link>
            )}
          </div>
        )}

        {/* Audio + release */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <AudioUploader trackId={track.id} audioUrl={audioUrl} canEdit={isOwner} />
          <ReleasePanel
            trackId={track.id}
            isrc={track.isrc}
            upc={track.upc}
            artworkUrl={track.artwork_url}
            releasedAt={track.released_at}
            releaseWatch={track.release_watch}
            hasSpotifyLink={!!track.spotify_track_id}
            canEdit={isOwner}
          />
        </div>

        {/* Master note */}
        {track.master_ownership_note && (
          <div className="mt-6 card">
            <p className="text-xs uppercase tracking-wide text-zinc-500">
              Master ownership note (informational only)
            </p>
            <p className="mt-1 text-sm text-zinc-300">
              {track.master_ownership_note}
            </p>
          </div>
        )}

        {/* Standard protection terms */}
        {legalTemplate && (
          <details className="mt-6 card">
            <summary className="cursor-pointer font-semibold text-zinc-50">
              Standard protection terms · v{legalTemplate.version}
            </summary>
            <p className="mt-2 text-xs text-zinc-500">
              Governing law: {legalTemplate.governing_law} · effective{" "}
              {formatDate(legalTemplate.effective_date)}. These terms are
              version-controlled and cannot be edited per agreement.
            </p>
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-xl bg-white/[0.03] p-3 text-xs leading-relaxed text-zinc-300">
              {legalTemplate.body}
            </pre>
          </details>
        )}

        {/* Version history */}
        {agreements.length > 1 && (
          <div className="mt-6 card">
            <h2 className="font-semibold text-zinc-50">Version history</h2>
            <div className="mt-3 divide-y divide-white/[0.06]">
              {agreements.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between py-2.5 text-sm"
                >
                  <span className="text-zinc-300">
                    v{a.version} · {a.unique_agreement_reference}
                  </span>
                  <span className="flex items-center gap-3">
                    <Badge status={a.status} label={a.status} />
                    {a.status === "locked" && (
                      <a href={`/api/pdf/${a.id}`} className="text-zinc-400 underline">
                        PDF
                      </a>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Audit trail */}
        {(isOwner || user.isAdmin) && auditEvents.length > 0 && (
          <details className="mt-6 card">
            <summary className="cursor-pointer font-semibold text-zinc-50">
              Audit trail · {auditEvents.length} events
            </summary>
            <div className="mt-3 space-y-2">
              {auditEvents.map((e) => (
                <div key={e.id} className="flex items-baseline justify-between text-xs">
                  <span className="text-zinc-300">
                    {AUDIT_LABELS[e.event_type] ?? e.event_type}
                    {e.actor_email && (
                      <span className="text-zinc-500"> · {e.actor_email}</span>
                    )}
                  </span>
                  <span className="text-zinc-500">
                    {formatDateTime(e.created_at)}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}
      </main>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, [string, string]> = {
    draft: ["draft", "Draft"],
    sent: ["waiting", "Waiting on others"],
    changes_requested: ["changes_requested", "Changes requested"],
    locked: ["locked", "Locked"],
    archived: ["archived", "Archived"],
  };
  const [key, label] = map[status] ?? ["draft", status];
  return <Badge status={key} label={label} />;
}
