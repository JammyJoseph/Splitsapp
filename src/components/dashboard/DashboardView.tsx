"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import { Badge } from "@/components/ui";
import { ROLE_LABELS, AUDIT_LABELS, AUDIT_EMOJI } from "@/lib/constants";
import { avatarGradient, formatPct, timeAgo } from "@/lib/utils";

export interface DashCollaborator {
  name: string;
  role: string;
  pct: number;
  signed: boolean;
}
export interface DashRow {
  id: string;
  title: string;
  artist: string | null;
  status: "draft" | "sent" | "changes_requested" | "locked" | "archived";
  version: number;
  updatedAt: string;
  collaborators: DashCollaborator[];
  signedCount: number;
  total: number;
  myPending: boolean;
  createdByMe: boolean;
}
export interface ActivityItem {
  id: string;
  type: string;
  actorEmail: string | null;
  createdAt: string;
  trackId: string | null;
  trackTitle: string;
}

type TabKey =
  | "all"
  | "awaiting"
  | "in_progress"
  | "changes"
  | "locked"
  | "drafts"
  | "archived";

const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];

function bucket(r: DashRow): TabKey[] {
  const b: TabKey[] = [];
  if (r.myPending) b.push("awaiting");
  if (r.createdByMe && r.status === "sent" && r.signedCount < r.collaborators.length)
    b.push("in_progress");
  if (r.status === "changes_requested") b.push("changes");
  if (r.status === "locked") b.push("locked");
  if (r.status === "draft" && r.createdByMe) b.push("drafts");
  if (r.status === "archived") b.push("archived");
  return b;
}

const TAB_LABELS: Record<TabKey, string> = {
  all: "All",
  awaiting: "Awaiting you",
  in_progress: "In progress",
  changes: "Changes",
  locked: "Locked",
  drafts: "Drafts",
  archived: "Archived",
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.35, delay: Math.min(i * 0.04, 0.3), ease: EASE },
  }),
};

export default function DashboardView({
  firstName,
  rows,
  activity,
}: {
  firstName: string;
  rows: DashRow[];
  activity: ActivityItem[];
}) {
  const [tab, setTab] = useState<TabKey>("all");
  const [query, setQuery] = useState("");

  const counts = useMemo(() => {
    const c: Record<TabKey, number> = {
      all: rows.filter((r) => r.status !== "archived").length,
      awaiting: 0,
      in_progress: 0,
      changes: 0,
      locked: 0,
      drafts: 0,
      archived: 0,
    };
    for (const r of rows) for (const k of bucket(r)) c[k]++;
    return c;
  }, [rows]);

  const tabs = (
    ["all", "awaiting", "in_progress", "changes", "locked", "drafts", "archived"] as TabKey[]
  ).filter((t) => t === "all" || counts[t] > 0);

  const stats = useMemo(() => {
    const locked = rows.filter((r) => r.status === "locked");
    const reached = new Set<string>();
    rows.forEach((r) => r.collaborators.forEach((c) => reached.add(c.name)));
    const pendingSigs = rows.reduce(
      (s, r) =>
        s +
        (r.status === "sent" || r.status === "changes_requested"
          ? r.collaborators.length - r.signedCount
          : 0),
      0,
    );
    return {
      locked: locked.length,
      awaiting: counts.awaiting,
      pendingSigs,
      reached: reached.size,
    };
  }, [rows, counts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows
      .filter((r) => (tab === "all" ? r.status !== "archived" : bucket(r).includes(tab)))
      .filter(
        (r) =>
          !q ||
          r.title.toLowerCase().includes(q) ||
          (r.artist ?? "").toLowerCase().includes(q) ||
          r.collaborators.some((c) => c.name.toLowerCase().includes(q)),
      )
      .sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  }, [rows, tab, query]);

  return (
    <div>
      {/* Greeting + CTA */}
      <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm text-zinc-500">Welcome back, {firstName}</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">
            Your splits
          </h1>
        </div>
        <Link href="/splits/new" className="btn-primary group w-full justify-center sm:w-auto">
          <span className="text-base leading-none transition-transform group-hover:rotate-90">
            +
          </span>
          New Split
        </Link>
      </div>

      {/* Stats */}
      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Awaiting you" value={stats.awaiting} accent={stats.awaiting > 0} />
        <Stat label="Pending signatures" value={stats.pendingSigs} />
        <Stat label="Locked" value={stats.locked} />
        <Stat label="Collaborators" value={stats.reached} />
      </div>

      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_300px]">
        {/* Main column */}
        <div>
          {/* Segmented filter */}
          <div className="flex flex-wrap items-center gap-1 rounded-2xl border border-white/[0.08] bg-white/[0.02] p-1">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className="relative rounded-xl px-3 py-1.5 text-sm font-medium transition-colors"
              >
                {tab === t && (
                  <motion.span
                    layoutId="tab-pill"
                    className="absolute inset-0 rounded-xl bg-white/10"
                    transition={{ type: "spring", stiffness: 380, damping: 32 }}
                  />
                )}
                <span
                  className={`relative z-10 ${tab === t ? "text-white" : "text-zinc-400 hover:text-zinc-200"}`}
                >
                  {TAB_LABELS[t]}
                  {counts[t] > 0 && (
                    <span className="ml-1.5 text-xs text-zinc-600">{counts[t]}</span>
                  )}
                </span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative mt-3">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600">
              ⌕
            </span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tracks, artists, collaborators…"
              className="input pl-9"
            />
          </div>

          {/* Cards */}
          <div className="mt-4 space-y-3">
            <AnimatePresence mode="popLayout">
              {filtered.map((r, i) => (
                <motion.div
                  key={r.id}
                  layout
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  animate="show"
                  exit={{ opacity: 0, scale: 0.98 }}
                >
                  <TrackCard row={r} />
                </motion.div>
              ))}
            </AnimatePresence>
            {filtered.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 bg-white/[0.02] p-10 text-center">
                <p className="text-sm text-zinc-500">
                  {query ? "No splits match your search." : "Nothing here yet."}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Activity rail */}
        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
              Activity
            </h2>
            {activity.length === 0 ? (
              <p className="text-sm text-zinc-600">No activity yet.</p>
            ) : (
              <div className="space-y-1">
                {activity.map((a, i) => (
                  <motion.div
                    key={a.id}
                    initial={{ opacity: 0, x: 8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: Math.min(i * 0.03, 0.25) }}
                  >
                    <ActivityRow item={a} />
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        accent ? "border-violet-500/30 bg-violet-500/[0.07]" : "border-white/[0.08] bg-white/[0.02]"
      }`}
    >
      <p className={`text-2xl font-bold ${accent ? "text-violet-300" : "text-white"}`}>
        {value}
      </p>
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
    </div>
  );
}

function Avatars({ collaborators }: { collaborators: DashCollaborator[] }) {
  const shown = collaborators.slice(0, 4);
  const extra = collaborators.length - shown.length;
  return (
    <div className="flex -space-x-2">
      {shown.map((c, i) => (
        <div
          key={i}
          title={`${c.name} · ${ROLE_LABELS[c.role as keyof typeof ROLE_LABELS] ?? c.role}`}
          className="relative flex h-7 w-7 items-center justify-center rounded-full text-[11px] font-bold text-white ring-2 ring-[#08080a]"
          style={{ background: avatarGradient(c.name) }}
        >
          {c.name.charAt(0).toUpperCase()}
          {c.signed && (
            <span className="absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full bg-emerald-500 text-[8px] ring-2 ring-[#08080a]">
              ✓
            </span>
          )}
        </div>
      ))}
      {extra > 0 && (
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-white/10 text-[10px] font-semibold text-zinc-300 ring-2 ring-[#08080a]">
          +{extra}
        </div>
      )}
    </div>
  );
}

const STATUS_LABEL: Record<DashRow["status"], string> = {
  draft: "Draft",
  sent: "Waiting on others",
  changes_requested: "Changes requested",
  locked: "Locked",
  archived: "Archived",
};

function TrackCard({ row }: { row: DashRow }) {
  const statusKey = row.status === "sent" ? "waiting" : row.status;
  const pctSigned =
    row.collaborators.length > 0 ? (row.signedCount / row.collaborators.length) * 100 : 0;
  return (
    <Link
      href={`/splits/${row.id}`}
      className={`group block rounded-2xl border bg-white/[0.02] p-5 transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.04] ${
        row.myPending ? "border-violet-500/30" : "border-white/[0.08]"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold text-white">{row.title}</p>
            <Badge status={statusKey} label={STATUS_LABEL[row.status]} />
            {row.myPending && (
              <span className="badge border-violet-500/30 bg-violet-500/10 text-violet-300">
                Sign now
              </span>
            )}
          </div>
          <p className="mt-1 truncate text-sm text-zinc-500">
            {row.artist || "—"} · {formatPct(row.total)} · v{row.version}
          </p>
        </div>
        <Avatars collaborators={row.collaborators} />
      </div>

      <div className="mt-4 flex items-center gap-3">
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
          <div
            className={`h-full rounded-full transition-all ${
              row.status === "locked" ? "bg-emerald-400" : "bg-violet-400"
            }`}
            style={{ width: `${Math.max(pctSigned, 4)}%` }}
          />
        </div>
        <span className="shrink-0 text-xs text-zinc-500">
          {row.signedCount}/{row.collaborators.length} signed
        </span>
      </div>
    </Link>
  );
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const label = AUDIT_LABELS[item.type] ?? item.type;
  const emoji = AUDIT_EMOJI[item.type] ?? "•";
  return (
    <Link
      href={item.trackId ? `/splits/${item.trackId}` : "#"}
      className="flex items-start gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-white/[0.03]"
    >
      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/5 text-xs">
        {emoji}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm text-zinc-300">
          {label}
          {item.trackTitle && (
            <span className="text-zinc-500"> · {item.trackTitle}</span>
          )}
        </p>
        <p className="text-xs text-zinc-600">{timeAgo(item.createdAt)}</p>
      </div>
    </Link>
  );
}
