"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { linkArtist } from "@/app/profile/actions";
import type { SpotifyArtist } from "@/lib/spotify";

export function ArtistSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SpotifyArtist[]>([]);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setResults([]);
      return;
    }
    timer.current = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/spotify/search?type=artist&q=${encodeURIComponent(q)}`,
        );
        if (res.status === 503) {
          setUnavailable(true);
          return;
        }
        const data = await res.json();
        setResults(data.results ?? []);
      } catch {
        setError("Search failed. Try again.");
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [q]);

  function choose(a: SpotifyArtist) {
    start(async () => {
      const res = await linkArtist(a.id);
      if (res?.error) setError(res.error);
      else router.refresh();
    });
  }

  if (unavailable) {
    return (
      <div className="card text-sm text-zinc-400">
        Spotify isn&apos;t connected on the server yet. Add{" "}
        <code className="text-zinc-300">SPOTIFY_CLIENT_ID</code> and{" "}
        <code className="text-zinc-300">SPOTIFY_CLIENT_SECRET</code> to enable
        artist insights.
      </div>
    );
  }

  return (
    <div>
      <input
        className="input"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search your artist name on Spotify…"
        autoFocus
      />
      {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}

      <AnimatePresence>
        {results.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-3 space-y-1.5"
          >
            {results.map((a) => (
              <button
                key={a.id}
                onClick={() => choose(a)}
                disabled={pending}
                className="flex w-full items-center gap-3 rounded-xl border border-white/[0.08] bg-white/[0.02] p-2.5 text-left transition hover:border-white/20 hover:bg-white/[0.05] disabled:opacity-50"
              >
                {a.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={a.image}
                    alt=""
                    className="h-11 w-11 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-11 w-11 rounded-full bg-white/10" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-white">{a.name}</p>
                  <p className="truncate text-xs text-zinc-500">
                    {a.followers.toLocaleString()} followers
                    {a.genres[0] ? ` · ${a.genres[0]}` : ""}
                  </p>
                </div>
                <span className="text-xs font-medium text-violet-300">
                  {pending ? "…" : "Claim"}
                </span>
              </button>
            ))}
          </motion.div>
        )}
        {loading && q.length >= 2 && results.length === 0 && (
          <p className="mt-3 text-sm text-zinc-500">Searching…</p>
        )}
      </AnimatePresence>
    </div>
  );
}
