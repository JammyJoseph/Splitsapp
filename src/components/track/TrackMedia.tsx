"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useConfirm } from "@/components/ui/Confirm";
import {
  setTrackAudio,
  removeTrackAudio,
  syncReleaseFromSpotify,
  setReleaseWatch,
} from "@/app/splits/[id]/release-actions";

export function AudioUploader({
  trackId,
  audioUrl,
  canEdit,
}: {
  trackId: string;
  audioUrl: string | null;
  canEdit: boolean;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) {
      setError("Audio must be under 50MB.");
      return;
    }
    setBusy(true);
    setError(null);
    setProgress(20);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() || "audio";
      const path = `${trackId}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("track-audio")
        .upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      setProgress(80);
      const res = await setTrackAudio(trackId, path);
      if (res?.error) throw new Error(res.error);
      setProgress(100);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-white">Session audio</h2>
        {audioUrl && canEdit && (
          <button
            className="text-sm text-zinc-500 hover:text-rose-300"
            onClick={async () => {
              const ok = await confirm({
                title: "Remove audio?",
                description: "This deletes the uploaded session audio. This can't be undone.",
                confirmLabel: "Remove",
                variant: "danger",
              });
              if (!ok) return;
              setBusy(true);
              await removeTrackAudio(trackId);
              router.refresh();
              setBusy(false);
            }}
          >
            Remove
          </button>
        )}
      </div>

      {audioUrl ? (
        <audio controls src={audioUrl} className="mt-3 w-full">
          Your browser doesn&apos;t support audio playback.
        </audio>
      ) : (
        <p className="mt-1 text-sm text-zinc-500">
          {canEdit
            ? "Upload the track audio straight from the session. Private to collaborators."
            : "No audio uploaded yet."}
        </p>
      )}

      {canEdit && (
        <div className="mt-3">
          <input
            ref={fileRef}
            type="file"
            accept="audio/*"
            className="hidden"
            onChange={onFile}
          />
          <button
            className="btn-secondary"
            disabled={busy}
            onClick={() => fileRef.current?.click()}
          >
            {busy ? `Uploading… ${progress}%` : audioUrl ? "Replace audio" : "Upload audio"}
          </button>
          <p className="mt-2 text-xs text-zinc-600">
            Stored privately in Tracklock — only collaborators can play it.
          </p>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
    </div>
  );
}

export function ReleasePanel({
  trackId,
  isrc,
  upc,
  artworkUrl,
  releasedAt,
  releaseWatch,
  hasSpotifyLink,
  canEdit,
}: {
  trackId: string;
  isrc: string | null;
  upc: string | null;
  artworkUrl: string | null;
  releasedAt: string | null;
  releaseWatch: boolean;
  hasSpotifyLink: boolean;
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="card">
      <div className="flex items-start gap-4">
        {artworkUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={artworkUrl} alt="" className="h-16 w-16 rounded-xl object-cover" />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-white/5 text-2xl">
            ♪
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h2 className="font-semibold text-white">Release</h2>
          <div className="mt-1 space-y-0.5 text-sm">
            <p className="text-zinc-400">
              ISRC: <span className="font-mono text-zinc-200">{isrc || "—"}</span>
            </p>
            <p className="text-zinc-400">
              UPC: <span className="font-mono text-zinc-200">{upc || "—"}</span>
            </p>
            <p className="text-zinc-400">
              Status:{" "}
              <span className="text-zinc-200">
                {releasedAt
                  ? `Released ${new Date(releasedAt).toLocaleDateString("en-GB")}`
                  : releaseWatch
                    ? "Watching for go-live"
                    : "Not released"}
              </span>
            </p>
          </div>
        </div>
      </div>

      {canEdit && (
        <div className="mt-4 flex flex-wrap gap-2">
          {hasSpotifyLink ? (
            <button
              className="btn-secondary"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setError(null);
                  const res = await syncReleaseFromSpotify(trackId);
                  if (res?.error) setError(res.error);
                  else router.refresh();
                })
              }
            >
              {pending ? "Syncing…" : "Sync ISRC/UPC from Spotify"}
            </button>
          ) : (
            <p className="text-xs text-zinc-600">
              Link a Spotify track (edit the split → search Spotify) to auto-capture
              ISRC &amp; UPC.
            </p>
          )}
          {hasSpotifyLink && !releasedAt && (
            <button
              className="btn-ghost"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  await setReleaseWatch(trackId, !releaseWatch);
                  router.refresh();
                })
              }
            >
              {releaseWatch ? "Stop watching" : "Watch for go-live"}
            </button>
          )}
        </div>
      )}
      {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
    </div>
  );
}
