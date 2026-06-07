import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { Badge, EmptyState } from "@/components/ui";
import { formatDate, formatPct } from "@/lib/utils";
import type { Collaborator, SplitAgreement, Track } from "@/lib/types";

export const dynamic = "force-dynamic";

interface Row {
  track: Track;
  collaborators: Collaborator[];
  agreement: SplitAgreement | null;
  signedCount: number;
  total: number;
  myPending: boolean;
  iAmCollaborator: boolean;
}

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const myEmail = user.email.toLowerCase();

  const { data: tracks } = await supabase
    .from("tracks")
    .select("*, collaborators(*), split_agreements(*)")
    .order("updated_at", { ascending: false });

  const rows: Row[] = [];
  for (const t of (tracks ?? []) as (Track & {
    collaborators: Collaborator[];
    split_agreements: SplitAgreement[];
  })[]) {
    const collaborators = t.collaborators ?? [];
    const agreements = (t.split_agreements ?? []).sort(
      (a, b) => b.version - a.version,
    );
    const agreement = agreements[0] ?? null;

    let signedCount = 0;
    if (agreement) {
      const { count } = await supabase
        .from("signatures")
        .select("id", { count: "exact", head: true })
        .eq("split_agreement_id", agreement.id);
      signedCount = count ?? 0;
    }

    const mine = collaborators.find((c) => c.email.toLowerCase() === myEmail);
    rows.push({
      track: t,
      collaborators,
      agreement,
      signedCount,
      total: collaborators.reduce((s, c) => s + Number(c.publishing_percentage), 0),
      iAmCollaborator: !!mine,
      myPending:
        !!mine &&
        mine.signature_status === "pending" &&
        (t.status === "sent" || t.status === "changes_requested"),
    });
  }

  const awaitingMe = rows.filter((r) => r.myPending);
  const waitingOthers = rows.filter(
    (r) =>
      r.track.created_by_user_id === user.authId &&
      r.track.status === "sent" &&
      r.signedCount < r.collaborators.length,
  );
  const changesRequested = rows.filter((r) => r.track.status === "changes_requested");
  const locked = rows.filter((r) => r.track.status === "locked");
  const drafts = rows.filter(
    (r) => r.track.status === "draft" && r.track.created_by_user_id === user.authId,
  );
  const archived = rows.filter((r) => r.track.status === "archived");

  const isManager = user.profile?.user_type === "manager";
  const firstName = (user.profile?.name || user.email).split(/[ @]/)[0];

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email} isAdmin={user.isAdmin} isManager={isManager} />

      <main className="mx-auto max-w-4xl px-4 py-10">
        {/* Greeting + primary CTA */}
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm text-zinc-500">Welcome back, {firstName}</p>
            <h1 className="mt-1 text-3xl font-bold tracking-tight text-white">
              Your splits
            </h1>
          </div>
          <Link
            href="/splits/new"
            className="btn-primary group w-full justify-center sm:w-auto"
          >
            <span className="text-base leading-none transition-transform group-hover:rotate-90">
              +
            </span>
            New Split
          </Link>
        </div>

        {/* Quick stats strip */}
        {rows.length > 0 && (
          <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Awaiting you" value={awaitingMe.length} accent={awaitingMe.length > 0} />
            <Stat label="In progress" value={waitingOthers.length} />
            <Stat label="Locked" value={locked.length} />
            <Stat label="Total" value={rows.length} />
          </div>
        )}

        {rows.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              title="No splits yet"
              subtitle="Create your first split before the session energy disappears."
              action={
                <Link href="/splits/new" className="btn-primary">
                  + New Split
                </Link>
              }
            />
          </div>
        ) : (
          <div className="mt-10 space-y-10">
            <Section title="Awaiting you" rows={awaitingMe} emptyHint="Nothing needs your signature." highlight />
            <Section title="Waiting on others" rows={waitingOthers} emptyHint="Nothing pending from collaborators." />
            <Section title="Changes requested" rows={changesRequested} emptyHint="No change requests." />
            <Section title="Drafts" rows={drafts} emptyHint="No drafts." />
            <Section title="Locked" rows={locked} emptyHint="No locked splits yet." />
            {archived.length > 0 && <Section title="Archived" rows={archived} emptyHint="" />}
          </div>
        )}
      </main>
    </div>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-4 ${
        accent
          ? "border-violet-500/30 bg-violet-500/[0.07]"
          : "border-white/[0.08] bg-white/[0.02]"
      }`}
    >
      <p className={`text-2xl font-bold ${accent ? "text-violet-300" : "text-white"}`}>
        {value}
      </p>
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
    </div>
  );
}

function Section({
  title,
  rows,
  emptyHint,
  highlight,
}: {
  title: string;
  rows: Row[];
  emptyHint: string;
  highlight?: boolean;
}) {
  if (rows.length === 0 && !emptyHint) return null;
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
        {title}{" "}
        {rows.length > 0 && <span className="text-zinc-700">· {rows.length}</span>}
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-600">{emptyHint}</p>
      ) : (
        <div className="space-y-3">
          {rows.map((r) => (
            <TrackCard key={r.track.id} row={r} highlight={highlight} />
          ))}
        </div>
      )}
    </section>
  );
}

function TrackCard({ row, highlight }: { row: Row; highlight?: boolean }) {
  const { track, collaborators, signedCount } = row;
  const statusKey = track.status === "sent" ? "waiting" : track.status;
  const pctSigned =
    collaborators.length > 0 ? (signedCount / collaborators.length) * 100 : 0;
  return (
    <Link
      href={`/splits/${track.id}`}
      className={`group block rounded-2xl border bg-white/[0.02] p-5 transition-all hover:-translate-y-0.5 hover:border-white/20 hover:bg-white/[0.04] ${
        highlight ? "border-violet-500/30" : "border-white/[0.08]"
      }`}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate font-semibold text-white">{track.title}</p>
            <Badge status={statusKey} label={statusLabel(track.status)} />
          </div>
          <p className="mt-1 truncate text-sm text-zinc-500">
            {track.artist_project_name || "—"} · {collaborators.length} collaborator
            {collaborators.length === 1 ? "" : "s"} · {formatPct(row.total)}
          </p>
        </div>
        <div className="shrink-0 text-right">
          <p className="text-sm font-medium text-zinc-200">
            {signedCount}/{collaborators.length}
          </p>
          <p className="text-xs text-zinc-600">{formatDate(track.updated_at)}</p>
        </div>
      </div>
      {/* Signature progress */}
      <div className="mt-4 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
        <div
          className={`h-full rounded-full transition-all ${
            track.status === "locked" ? "bg-emerald-400" : "bg-violet-400"
          }`}
          style={{ width: `${Math.max(pctSigned, 4)}%` }}
        />
      </div>
    </Link>
  );
}

function statusLabel(s: Track["status"]): string {
  return {
    draft: "Draft",
    sent: "Waiting on others",
    changes_requested: "Changes requested",
    locked: "Locked",
    archived: "Archived",
  }[s];
}
