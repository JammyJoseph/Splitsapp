"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import type { SpotifyTrack } from "@/lib/spotify";

// Lightweight Spotify track search used to auto-fill the New Split form.
// Silently hides itself if Spotify isn't configured on the server.
export function SpotifyTrackSearch({
  onSelect,
}: {
  onSelect: (track: SpotifyTrack) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SpotifyTrack[]>([]);
  const [open, setOpen] = useState(false);
  const [available, setAvailable] = useState(true);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/spotify/search?type=track&q=${encodeURIComponent(q)}`,
        );
        if (res.status === 503) {
          setAvailable(false);
          return;
        }
        const data = await res.json();
        setResults(data.results ?? []);
        setOpen(true);
      } catch {
        /* ignore */
      }
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  if (!available) return null;

  return (
    <div className="relative">
      <label className="label flex items-center gap-1.5">
        <span className="text-emerald-400">●</span> Find on Spotify (optional)
      </label>
      <input
        className="input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length && setOpen(true)}
        placeholder="Search a track to auto-fill the details…"
      />
      <AnimatePresence>
        {open && results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute z-20 mt-1.5 max-h-72 w-full overflow-auto rounded-xl border border-white/10 bg-[#141417] p-1.5 shadow-2xl"
          >
            {results.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  onSelect(t);
                  setOpen(false);
                  setQ(t.name);
                }}
                className="flex w-full items-center gap-3 rounded-lg p-2 text-left transition hover:bg-white/5"
              >
                {t.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={t.image} alt="" className="h-9 w-9 rounded object-cover" />
                ) : (
                  <div className="h-9 w-9 rounded bg-white/10" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-white">{t.name}</p>
                  <p className="truncate text-xs text-zinc-500">{t.artistNames}</p>
                </div>
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
