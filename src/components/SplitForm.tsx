"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ROLE_OPTIONS, ROLE_LABELS, RELEASE_STATUS_LABELS } from "@/lib/constants";
import { createSplit, updateSplit, type SplitInput, type CollaboratorInput } from "@/app/splits/actions";
import { SpotifyTrackSearch } from "@/components/spotify/SpotifyTrackSearch";
import { useToast } from "@/components/ui/Toast";
import { formatPct } from "@/lib/utils";
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

const STEPS = ["Track", "Collaborators", "Review"];

export default function SplitForm({ trackId, initial }: Props) {
  const router = useRouter();
  const toast = useToast();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [dir, setDir] = useState(1);

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
    initial?.collaborators?.length ? initial.collaborators : [blankCollaborator()],
  );

  const total = useMemo(
    () => collaborators.reduce((s, c) => s + (Number(c.publishing_percentage) || 0), 0),
    [collaborators],
  );
  const isHundred = Math.abs(total - 100) < 0.01;

  function update(i: number, patch: Partial<CollaboratorInput>) {
    setCollaborators((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  }
  const add = () => setCollaborators((prev) => [...prev, blankCollaborator()]);
  const remove = (i: number) =>
    setCollaborators((prev) => prev.filter((_, idx) => idx !== i));
  function splitEvenly() {
    const n = collaborators.length;
    if (!n) return;
    const each = Math.floor((100 / n) * 1000) / 1000;
    const remainder = Math.round((100 - each * n) * 1000) / 1000;
    setCollaborators((prev) =>
      prev.map((c, i) => ({ ...c, publishing_percentage: i === 0 ? each + remainder : each })),
    );
  }

  function goto(next: number) {
    setDir(next > step ? 1 : -1);
    setStep(next);
  }

  function validateStep(s: number): string | null {
    if (s === 0 && !title.trim()) return "Add a track title to continue.";
    if (s === 1) {
      if (!collaborators.length) return "Add at least one collaborator.";
      for (const c of collaborators) {
        if (!c.name.trim() || !c.email.trim())
          return "Every collaborator needs a name and email.";
      }
    }
    return null;
  }

  function next() {
    const err = validateStep(step);
    if (err) {
      toast({ title: err, variant: "error" });
      return;
    }
    goto(Math.min(step + 1, STEPS.length - 1));
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
      const res = trackId ? await updateSplit(trackId, input) : await createSplit(input);
      if (res?.error) {
        setError(res.error);
        toast({ title: "Couldn't save split", description: res.error, variant: "error" });
      }
    });
  }

  return (
    <div>
      {/* Progress header */}
      <div className="mb-6 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <button
            key={label}
            type="button"
            onClick={() => i < step && goto(i)}
            className="flex flex-1 items-center gap-2"
            disabled={i > step}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                i < step
                  ? "bg-violet-500 text-white"
                  : i === step
                    ? "bg-white text-zinc-950"
                    : "bg-white/5 text-zinc-500"
              }`}
            >
              {i < step ? "✓" : i + 1}
            </span>
            <span
              className={`hidden text-sm font-medium sm:inline ${
                i <= step ? "text-white" : "text-zinc-600"
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <span className="mx-1 h-px flex-1 bg-white/10" />
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait" custom={dir}>
        <motion.div
          key={step}
          custom={dir}
          initial={{ opacity: 0, x: dir * 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: dir * -24 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
        >
          {step === 0 && (
            <div className="card space-y-4">
              <h2 className="font-semibold text-white">The track</h2>
              <SpotifyTrackSearch
                onSelect={(t) => {
                  setTitle(t.name);
                  if (!artist) setArtist(t.artistNames);
                  setSpotifyTrackId(t.id);
                  if (t.image) setArtworkUrl(t.image);
                  if (t.isrc) setIsrc(t.isrc);
                  if (t.upc) setUpc(t.upc);
                  toast({ title: "Pulled from Spotify", description: t.name, variant: "success" });
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
                  autoFocus
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="label">Artist / project</label>
                  <input className="input" value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Recommended" />
                </div>
                <div>
                  <label className="label">Session date</label>
                  <input type="date" className="input" value={sessionDate} onChange={(e) => setSessionDate(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="label">Audio link (optional)</label>
                <input className="input" value={audioLink} onChange={(e) => setAudioLink(e.target.value)} placeholder="Dropbox, Drive, SoundCloud private link…" />
              </div>
              <div>
                <label className="label">Release status</label>
                <select className="input" value={releaseStatus} onChange={(e) => setReleaseStatus(e.target.value as ReleaseStatus)}>
                  <option value="unreleased">Unreleased</option>
                  <option value="planned">Planned release</option>
                  <option value="released">Released</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>
              <div>
                <label className="label">Notes (optional)</label>
                <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Anything worth recording about this session" />
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <div className="card space-y-4">
                <div>
                  <h2 className="font-semibold text-white">
                    Who wrote the song, and what did everyone agree to?
                  </h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    Add each collaborator and the publishing % everyone agreed. It must total 100% to send.
                  </p>
                </div>

                <div className="space-y-4">
                  {collaborators.map((c, i) => (
                    <div key={i} className="rounded-xl border border-white/[0.08] p-4">
                      <div className="mb-3 flex items-center justify-between">
                        <span className="text-sm font-medium text-zinc-500">Collaborator {i + 1}</span>
                        {collaborators.length > 1 && (
                          <button type="button" onClick={() => remove(i)} className="text-sm text-rose-400 hover:text-rose-300">
                            Remove
                          </button>
                        )}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <div>
                          <label className="label">Full name *</label>
                          <input className="input" value={c.name} onChange={(e) => update(i, { name: e.target.value })} />
                        </div>
                        <div>
                          <label className="label">Email *</label>
                          <input type="email" className="input" value={c.email} onChange={(e) => update(i, { email: e.target.value })} />
                        </div>
                        <div>
                          <label className="label">Role *</label>
                          <select className="input" value={c.role} onChange={(e) => update(i, { role: e.target.value as CollaboratorRole })}>
                            {ROLE_OPTIONS.map(([value, label]) => (
                              <option key={value} value={value}>{label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="label">Publishing split % *</label>
                          <input type="number" min={0} max={100} step="0.001" className="input" value={c.publishing_percentage} onChange={(e) => update(i, { publishing_percentage: parseFloat(e.target.value) || 0 })} />
                        </div>
                        <div>
                          <label className="label">Phone (optional)</label>
                          <input className="input" value={c.phone} onChange={(e) => update(i, { phone: e.target.value })} />
                        </div>
                        <div>
                          <label className="label">Manager / lawyer email (optional)</label>
                          <input type="email" className="input" value={c.manager_email} onChange={(e) => update(i, { manager_email: e.target.value })} />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" onClick={add} className="btn-secondary">+ Add collaborator</button>
                  <button type="button" onClick={splitEvenly} className="btn-secondary">Split evenly</button>
                </div>
              </div>

              <div className="card space-y-2">
                <h2 className="font-semibold text-white">Master ownership note</h2>
                <p className="text-sm text-zinc-500">
                  Informational only in this version — master splits aren&apos;t a legal workflow yet.
                </p>
                <textarea className="input" rows={2} value={masterNote} onChange={(e) => setMasterNote(e.target.value)} placeholder="e.g. Master owned 50/50 by Label X and the artist (informational)" />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="card">
                <div className="flex items-center gap-3">
                  {artworkUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={artworkUrl} alt="" className="h-14 w-14 rounded-xl object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-white/5 text-xl">♪</div>
                  )}
                  <div>
                    <p className="text-lg font-semibold text-white">{title || "Untitled track"}</p>
                    <p className="text-sm text-zinc-500">
                      {artist || "—"} · {RELEASE_STATUS_LABELS[releaseStatus]}
                    </p>
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-2xl border border-white/[0.08]">
                {collaborators.map((c, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 last:border-0">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-white">{c.name || "Unnamed"}</p>
                      <p className="truncate text-xs text-zinc-500">
                        {ROLE_LABELS[c.role]} · {c.email || "no email"}
                      </p>
                    </div>
                    <span className="text-sm font-bold text-white">{formatPct(Number(c.publishing_percentage) || 0)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>

      {error && <p className="mt-4 rounded-xl bg-rose-500/10 px-4 py-3 text-sm text-rose-300">{error}</p>}

      {/* Sticky footer nav + live total */}
      <div className="sticky bottom-0 mt-6 -mx-4 border-t border-white/[0.06] bg-[#08080a]/85 px-4 py-3 backdrop-blur-xl">
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => (step === 0 ? router.back() : goto(step - 1))}
            className="btn-secondary"
          >
            {step === 0 ? "Cancel" : "Back"}
          </button>

          {step >= 1 && (
            <motion.div
              key={isHundred ? "ready" : "pending"}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 500, damping: 22 }}
              className={`hidden rounded-full px-3 py-1.5 text-sm font-semibold sm:block ${
                isHundred ? "bg-emerald-500/15 text-emerald-300" : "bg-amber-500/15 text-amber-300"
              }`}
            >
              {isHundred ? "✓ 100% ready" : `${Math.round(total * 1000) / 1000}% of 100%`}
            </motion.div>
          )}

          {step < STEPS.length - 1 ? (
            <button type="button" onClick={next} className="btn-primary">Continue</button>
          ) : (
            <button type="button" onClick={submit} disabled={pending} className="btn-primary">
              {pending ? "Saving…" : "Save & review"}
            </button>
          )}
        </div>
        {step >= 1 && (
          <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-white/[0.06] sm:hidden">
            <div
              className={`h-full rounded-full transition-all ${isHundred ? "bg-emerald-400" : "bg-amber-400"}`}
              style={{ width: `${Math.min(total, 100)}%` }}
            />
          </div>
        )}
      </div>
    </div>
  );
}
