import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppHeader } from "@/components/AppHeader";
import { Badge } from "@/components/ui";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await requireAdmin();
  const admin = createAdminClient();

  const [
    { count: userCount },
    { count: trackCount },
    { count: lockedCount },
    { count: pendingCount },
    { count: changeCount },
    { data: recentTracks },
    { data: recentAudit },
  ] = await Promise.all([
    admin.from("users").select("id", { count: "exact", head: true }),
    admin.from("tracks").select("id", { count: "exact", head: true }),
    admin.from("split_agreements").select("id", { count: "exact", head: true }).eq("status", "locked"),
    admin.from("split_agreements").select("id", { count: "exact", head: true }).eq("status", "sent"),
    admin.from("split_agreements").select("id", { count: "exact", head: true }).eq("status", "changes_requested"),
    admin
      .from("tracks")
      .select("id, title, status, created_at, artist_project_name")
      .order("created_at", { ascending: false })
      .limit(15),
    admin
      .from("audit_events")
      .select("id, event_type, actor_email, created_at, track_id")
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  const stats = [
    { label: "Users", value: userCount ?? 0 },
    { label: "Tracks", value: trackCount ?? 0 },
    { label: "Locked", value: lockedCount ?? 0 },
    { label: "Pending", value: pendingCount ?? 0 },
    { label: "Changes requested", value: changeCount ?? 0 },
  ];

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email} isAdmin />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
            Admin
          </h1>
          <Link href="/admin/legal-templates" className="btn-secondary">
            Legal templates
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-5">
          {stats.map((s) => (
            <div key={s.label} className="card text-center">
              <p className="text-2xl font-bold text-zinc-50">{s.value}</p>
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                {s.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Recent tracks
            </h2>
            <div className="card divide-y divide-white/[0.06]">
              {(recentTracks ?? []).map((t) => (
                <Link
                  key={t.id}
                  href={`/splits/${t.id}`}
                  className="flex items-center justify-between py-2.5 text-sm"
                >
                  <span className="truncate">
                    <span className="font-medium text-zinc-50">{t.title}</span>
                    <span className="text-zinc-500"> · {t.artist_project_name || "—"}</span>
                  </span>
                  <Badge status={t.status === "sent" ? "waiting" : t.status} label={t.status} />
                </Link>
              ))}
              {(recentTracks ?? []).length === 0 && (
                <p className="py-3 text-sm text-zinc-500">No tracks yet.</p>
              )}
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Audit log
            </h2>
            <div className="card max-h-96 divide-y divide-white/[0.06] overflow-auto">
              {(recentAudit ?? []).map((e) => (
                <div key={e.id} className="flex items-baseline justify-between py-2 text-xs">
                  <span className="text-zinc-300">
                    {e.event_type}
                    {e.actor_email && <span className="text-zinc-500"> · {e.actor_email}</span>}
                  </span>
                  <span className="text-zinc-500">{formatDateTime(e.created_at)}</span>
                </div>
              ))}
              {(recentAudit ?? []).length === 0 && (
                <p className="py-3 text-sm text-zinc-500">No events yet.</p>
              )}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
