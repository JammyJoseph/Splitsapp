"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ROLE_OPTIONS } from "@/lib/constants";
import { createSplit, updateSplit, type SplitInput, type CollaboratorInput } from "@/app/splits/actions";
import { SpotifyTrackSearch } from "@/components/spotify/SpotifyTrackSearch";
import type { CollaboratorRole, ReleaseStatus } from "@/lib/types";

interface Props {
  trackId?: string;
  initial?: Partial<SplitInput>;
}

const blankCollaborator = (): CollaboratorInput => ({
  name: "",
  email: "",
  phone: "",
  role: "songwriter",
  manager_email: "",
  publishing_percentage: 0,
});

export default function SplitForm({ trackId, initial }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [artist, setArtist] = useState(initial?.artist_project_name ?? "");
  const [sessionDate, setSessionDate] = useState(initial?.session_date ?? "");
  const [audioLink, setAudioLink] = useState(initial?.audio_link ?? "");
  const [releaseStatus, setReleaseStatus] = useState<ReleaseStatus>(
    initial?.release_status ?? "unknown",
  );
  const [masterNote, setMasterNote] = useState(initial?.master_ownership_note ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [spotifyTrackId, setSpotifyTrackId] = useState(initial?.spotify_track_id ?? "");
  const [artworkUrl, setArtworkUrl] = useState(initial?.artwork_url ?? "");
  const [isrc, setIsrc] = useState(initial?.isrc ?? "");
  const [upc, setUpc] = useState(initial?.upc ?? "");
  const [collaborators, setCollaborators] = useState<CollaboratorInput[]>(
    initial?.collaborators?.length
      ? initial.collaborators
      : [blankCollaborator()],
  );

  const total = useMemo(
    () => collaborators.reduce((s, c) => s + (Number(c.publishing_percentage) || 0), 0),
    [collaborators],
  );
  const isHundred = Math.abs(total - 100) < 0.01;

  function update(i: number, patch: Partial<CollaboratorInput>) {
    setCollaborators((prev) =>
      prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)),
    );
  }
  function add() {
    setCollaborators((prev) => [...prev, blankCollaborator()]);
  }
  function remove(i: number) {
    setCollaborators((prev) => prev.filter((_, idx) => idx !== i));
  }
  function splitEvenly() {
    const n = collaborators.length;
    if (!n) return;
    const each = Math.floor((100 / n) * 1000) / 1000;
    const remainder = Math.round((100 - each * n) * 1000) / 1000;
    setCollaborators((prev) =>
      prev.map((c, i) => ({
        ...c,
        publishing_percentage: i === 0 ? each + remainder : each,
      })),
    );
  }

  function submit() {
    setError(null);
    const input: SplitInput = {
      title,
      artist_project_name: artist,
      session_date: sessionDate,
      audio_link: audioLink,
      release_status: releaseStatus,
      master_ownership_note: masterNote,
      notes,
      spotify_track_id: spotifyTrackId || null,
      artwork_url: artworkUrl || null,
      isrc: isrc || null,
      upc: upc || null,
      collaborators,
    };
    startTransition(async () => {
      const res = trackId
        ? await updateSplit(trackId, input)
        : await createSplit(input);
      // On success the action redirects; we only get here on error.
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="space-y-6">
      {/* Track details */}
      <div className="card space-y-4">
        <h2 className="font-semibold text-zinc-50">The track</h2>
        <SpotifyTrackSearch
          onSelect={(t) => {
            setTitle(t.name);
            if (!artist) setArtist(t.artistNames);
            setSpotifyTrackId(t.id);
            if (t.image) setArtworkUrl(t.image);
            if (t.isrc) setIsrc(t.isrc);
            if (t.upc) setUpc(t.upc);
          }}
        />
        {artworkUrl && (
          <div className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={artworkUrl} alt="" className="h-12 w-12 rounded-lg object-cover" />
            <div className="text-xs text-zinc-400">
              Linked to Spotify{isrc ? ` · ISRC ${isrc}` : ""}
              <button
                type="button"
                onClick={() => {
                  setSpotifyTrackId("");
                  setArtworkUrl("");
                  setIsrc("");
                  setUpc("");
                }}
                className="ml-2 text-zinc-500 underline hover:text-zinc-300"
              >
                unlink
              </button>
            </div>
          </div>
        )}
        <div>
          <label className="label">Track title *</label>
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Midnight Drive"
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Artist / project</label>
            <input
              className="input"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="Recommended"
            />
          </div>
          <div>
            <label className="label">Session date</label>
            <input
              type="date"
              className="input"
              value={sessionDate}
              onChange={(e) => setSessionDate(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="label">Audio link</label>
          <input
            className="input"
            value={audioLink}
            onChange={(e) => setAudioLink(e.target.value)}
            placeholder="Dropbox, Drive, SoundCloud private link…"
          />
        </div>
        <div>
          <label className="label">Release status</label>
          <select
            className="input"
            value={releaseStatus}
            onChange={(e) => setReleaseStatus(e.target.value as ReleaseStatus)}
          >
            <option value="unreleased">Unreleased</option>
            <option value="planned">Planned release</option>
            <option value="released">Released</option>
            <option value="unknown">Unknown</option>
          </select>
        </div>
        <div>
          <label className="label">Notes</label>
          <textarea
            className="input"
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything worth recording about this session"
          />
        </div>
      </div>

      {/* Collaborators */}
      <div className="card space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-zinc-50">
            Who wrote the song, and what did everyone agree to?
          </h2>
        </div>
        <p className="-mt-2 text-sm text-zinc-400">
          Add each collaborator and the publishing % everyone agreed. It must
          total 100% to send.
        </p>

        <div className="space-y-4">
          {collaborators.map((c, i) => (
            <div
              key={i}
              className="rounded-xl border border-white/10 p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-medium text-zinc-400">
                  Collaborator {i + 1}
                </span>
                {collaborators.length > 1 && (
                  <button
                    type="button"
                    onClick={() => remove(i)}
                    className="text-sm text-rose-400 hover:text-rose-300"
                  >
                    Remove
                  </button>
                )}
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label">Full name *</label>
                  <input
                    className="input"
                    value={c.name}
                    onChange={(e) => update(i, { name: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Email *</label>
                  <input
                    type="email"
                    className="input"
                    value={c.email}
                    onChange={(e) => update(i, { email: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Role *</label>
                  <select
                    className="input"
                    value={c.role}
                    onChange={(e) =>
                      update(i, { role: e.target.value as CollaboratorRole })
                    }
                  >
                    {ROLE_OPTIONS.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Publishing split % *</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    step="0.001"
                    className="input"
                    value={c.publishing_percentage}
                    onChange={(e) =>
                      update(i, {
                        publishing_percentage: parseFloat(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <label className="label">Phone (optional)</label>
                  <input
                    className="input"
                    value={c.phone}
                    onChange={(e) => update(i, { phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="label">Manager / lawyer email (optional)</label>
                  <input
                    type="email"
                    className="input"
                    value={c.manager_email}
                    onChange={(e) => update(i, { manager_email: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button type="button" onClick={add} className="btn-secondary">
            + Add collaborator
          </button>
          <button type="button" onClick={splitEvenly} className="btn-secondary">
            Split evenly
          </button>
          <div
            className={`ml-auto rounded-full px-3 py-1.5 text-sm font-semibold ${
              isHundred
                ? "bg-emerald-500/10 text-emerald-300"
                : "bg-amber-500/10 text-amber-300"
            }`}
          >
            {isHundred ? "100% ready to send" : `${Math.round(total * 1000) / 1000}% — needs to total 100%`}
          </div>
        </div>
      </div>

      {/* Master ownership note */}
      <div className="card space-y-2">
        <h2 className="font-semibold text-zinc-50">Master ownership note</h2>
        <p className="text-sm text-zinc-400">
          Informational only in this version — master splits are not a legal
          workflow yet.
        </p>
        <textarea
          className="input"
          rows={2}
          value={masterNote}
          onChange={(e) => setMasterNote(e.target.value)}
          placeholder="e.g. Master owned 50/50 by Label X and the artist (informational)"
        />
      </div>

      {error && (
        <p className="rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300">
          {error}
        </p>
      )}

      <div className="flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="btn-secondary"
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={submit}
          disabled={pending}
          className="btn-primary"
        >
          {pending ? "Saving…" : "Save & review"}
        </button>
      </div>
    </div>
  );
}
