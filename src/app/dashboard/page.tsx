import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import DashboardView, {
  type DashRow,
  type ActivityItem,
} from "@/components/dashboard/DashboardView";
import type { Collaborator, SplitAgreement, Track } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const myEmail = user.email.toLowerCase();

  const { data: tracks } = await supabase
    .from("tracks")
    .select("*, collaborators(*), split_agreements(*)")
    .order("updated_at", { ascending: false });

  const typedTracks = (tracks ?? []) as (Track & {
    collaborators: Collaborator[];
    split_agreements: SplitAgreement[];
  })[];

  // Signature counts for each track's latest agreement (batched).
  const latestAgreementIds = typedTracks
    .map((t) => [...(t.split_agreements ?? [])].sort((a, b) => b.version - a.version)[0]?.id)
    .filter(Boolean) as string[];

  const signedByAgreement = new Map<string, number>();
  if (latestAgreementIds.length) {
    const { data: sigs } = await supabase
      .from("signatures")
      .select("split_agreement_id")
      .in("split_agreement_id", latestAgreementIds);
    for (const s of sigs ?? []) {
      const id = (s as { split_agreement_id: string }).split_agreement_id;
      signedByAgreement.set(id, (signedByAgreement.get(id) ?? 0) + 1);
    }
  }

  const rows: DashRow[] = typedTracks.map((t) => {
    const collaborators = t.collaborators ?? [];
    const latest = [...(t.split_agreements ?? [])].sort((a, b) => b.version - a.version)[0];
    const signedCount = latest ? (signedByAgreement.get(latest.id) ?? 0) : 0;
    const mine = collaborators.find((c) => c.email.toLowerCase() === myEmail);
    return {
      id: t.id,
      title: t.title,
      artist: t.artist_project_name,
      status: t.status,
      version: t.current_version,
      updatedAt: t.updated_at,
      collaborators: collaborators.map((c) => ({
        name: c.name,
        role: c.role,
        pct: Number(c.publishing_percentage),
        signed: c.signature_status === "signed",
      })),
      signedCount,
      total: collaborators.reduce((s, c) => s + Number(c.publishing_percentage), 0),
      myPending:
        !!mine &&
        mine.signature_status === "pending" &&
        (t.status === "sent" || t.status === "changes_requested"),
      createdByMe: t.created_by_user_id === user.authId,
    };
  });

  // Activity feed across the user's visible tracks.
  const trackTitleById = new Map(typedTracks.map((t) => [t.id, t.title]));
  let activity: ActivityItem[] = [];
  if (typedTracks.length) {
    const { data: events } = await supabase
      .from("audit_events")
      .select("id, event_type, actor_email, created_at, track_id")
      .in(
        "track_id",
        typedTracks.map((t) => t.id),
      )
      .order("created_at", { ascending: false })
      .limit(18);
    activity = (events ?? []).map((e) => {
      const ev = e as {
        id: string;
        event_type: string;
        actor_email: string | null;
        created_at: string;
        track_id: string | null;
      };
      return {
        id: ev.id,
        type: ev.event_type,
        actorEmail: ev.actor_email,
        createdAt: ev.created_at,
        trackId: ev.track_id,
        trackTitle: ev.track_id ? (trackTitleById.get(ev.track_id) ?? "") : "",
      };
    });
  }

  const isManager = user.profile?.user_type === "manager";
  const firstName = (user.profile?.name || user.email).split(/[ @]/)[0];

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email} isAdmin={user.isAdmin} isManager={isManager} />
      <main className="mx-auto max-w-5xl px-4 py-10">
        <DashboardView firstName={firstName} rows={rows} activity={activity} />
      </main>
    </div>
  );
}
