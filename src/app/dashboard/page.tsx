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
      myPending: !!mine && mine.signature_status === "pending" &&
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
  const changesRequested = rows.filter(
    (r) => r.track.status === "changes_requested",
  );
  const locked = rows.filter((r) => r.track.status === "locked");
  const drafts = rows.filter(
    (r) => r.track.status === "draft" && r.track.created_by_user_id === user.authId,
  );
  const archived = rows.filter((r) => r.track.status === "archived");

  const isManager = user.profile?.user_type === "manager";

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email} isAdmin={user.isAdmin} isManager={isManager} />

      <main className="mx-auto max-w-4xl px-4 py-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
              Your splits
            </h1>
            <p className="mt-1 text-sm text-zinc-500">
              One track. One split. Everyone signed.
            </p>
          </div>
          <Link href="/splits/new" className="btn-primary">
            + New Split
          </Link>
        </div>

        {rows.length === 0 ? (
          <div className="mt-8">
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
          <div className="mt-8 space-y-8">
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
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
        {title} {rows.length > 0 && <span className="text-zinc-300">· {rows.length}</span>}
      </h2>
      {rows.length === 0 ? (
        <p className="text-sm text-zinc-400">{emptyHint}</p>
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
  const statusKey =
    track.status === "sent" ? "waiting" : track.status;
  return (
    <Link
      href={`/splits/${track.id}`}
      className={`card flex items-center justify-between transition hover:shadow-md ${
        highlight ? "ring-2 ring-amber-200" : ""
      }`}
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate font-semibold text-zinc-900">{track.title}</p>
          <Badge status={statusKey} label={statusLabel(track.status)} />
        </div>
        <p className="mt-0.5 truncate text-sm text-zinc-500">
          {track.artist_project_name || "—"} · {collaborators.length} collaborator
          {collaborators.length === 1 ? "" : "s"} · {formatPct(row.total)}
        </p>
      </div>
      <div className="ml-4 shrink-0 text-right">
        <p className="text-sm font-medium text-zinc-900">
          {signedCount}/{collaborators.length} signed
        </p>
        <p className="text-xs text-zinc-400">{formatDate(track.updated_at)}</p>
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
