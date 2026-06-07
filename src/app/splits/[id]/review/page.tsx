import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadTrackBundle } from "@/lib/queries";
import { AppHeader } from "@/components/AppHeader";
import { SplitTable } from "@/components/SplitTable";
import { SendToLockButton } from "@/components/SplitActions";
import { RELEASE_STATUS_LABELS } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();
  const bundle = await loadTrackBundle(supabase, id);
  if (!bundle) notFound();

  const { track, collaborators } = bundle;
  const total = collaborators.reduce(
    (s, c) => s + Number(c.publishing_percentage),
    0,
  );
  const isHundred = Math.abs(total - 100) < 0.01;
  const isOwner = track.created_by_user_id === user.authId || user.isAdmin;

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email} isAdmin={user.isAdmin} />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-sm text-zinc-500">Review before sending</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-50">
          {track.title}
        </h1>

        <div className="mt-6 space-y-6">
          <div className="card grid gap-3 sm:grid-cols-2">
            <Meta label="Artist / project" value={track.artist_project_name || "—"} />
            <Meta label="Session date" value={formatDate(track.session_date)} />
            <Meta
              label="Release status"
              value={RELEASE_STATUS_LABELS[track.release_status ?? "unknown"]}
            />
            <Meta label="Version" value={`v${track.current_version}`} />
            {track.audio_link && (
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Audio</p>
                <a
                  href={track.audio_link}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-zinc-50 underline break-all"
                >
                  {track.audio_link}
                </a>
              </div>
            )}
            {track.notes && (
              <div className="sm:col-span-2">
                <p className="text-xs uppercase tracking-wide text-zinc-500">Notes</p>
                <p className="text-sm text-zinc-300">{track.notes}</p>
              </div>
            )}
          </div>

          <div>
            <h2 className="mb-3 font-semibold text-zinc-50">Publishing splits</h2>
            <SplitTable collaborators={collaborators} />
          </div>

          {track.master_ownership_note && (
            <div className="card">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Master ownership note (informational only)
              </p>
              <p className="mt-1 text-sm text-zinc-300">
                {track.master_ownership_note}
              </p>
            </div>
          )}

          <div
            className={`rounded-xl px-4 py-3 text-sm font-medium ${
              isHundred
                ? "bg-emerald-500/10 text-emerald-300"
                : "bg-amber-500/10 text-amber-300"
            }`}
          >
            {isHundred
              ? "✓ Total publishing split equals 100% — ready to send."
              : `Publishing split is ${Math.round(total * 1000) / 1000}%. It must equal 100% before you can send to lock.`}
          </div>

          {isOwner && (
            <div className="flex items-center justify-between gap-3">
              <Link href={`/splits/${track.id}/edit`} className="btn-secondary">
                Edit
              </Link>
              {isHundred ? (
                <SendToLockButton trackId={track.id} />
              ) : (
                <button className="btn-primary" disabled>
                  Send to Lock
                </button>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="text-sm font-medium text-zinc-50">{value}</p>
    </div>
  );
}
