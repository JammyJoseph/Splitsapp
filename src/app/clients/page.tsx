import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppHeader } from "@/components/AppHeader";
import { Badge, EmptyState } from "@/components/ui";
import { RequestAccessForm, RevokeButton } from "@/components/access/AccessControls";
import { formatDate } from "@/lib/utils";
import type { AccountAccess, Track } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const user = await requireUser();
  const supabase = await createClient();
  const admin = createAdminClient();

  // Access relationships I initiated (as a manager).
  const { data: links } = await supabase
    .from("account_access")
    .select("*")
    .eq("manager_user_id", user.authId)
    .order("created_at", { ascending: false });
  const all = (links ?? []) as AccountAccess[];
  const approved = all.filter((a) => a.status === "approved" && a.artist_user_id);
  const pending = all.filter((a) => a.status === "pending");

  // Names for approved artists + their catalogues.
  const artistIds = approved.map((a) => a.artist_user_id!) as string[];
  const namesById = new Map<string, { name: string | null; email: string }>();
  const tracksByArtist = new Map<string, Track[]>();
  if (artistIds.length) {
    const { data: people } = await admin
      .from("users")
      .select("id, name, email")
      .in("id", artistIds);
    for (const p of people ?? [])
      namesById.set(p.id, { name: p.name, email: p.email });

    const { data: tracks } = await supabase
      .from("tracks")
      .select("*")
      .in("created_by_user_id", artistIds)
      .order("updated_at", { ascending: false });
    for (const t of (tracks ?? []) as Track[]) {
      const arr = tracksByArtist.get(t.created_by_user_id) ?? [];
      arr.push(t);
      tracksByArtist.set(t.created_by_user_id, arr);
    }
  }

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email} isAdmin={user.isAdmin} isManager />
      <main className="mx-auto max-w-4xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight text-white">Clients</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage splits and track catalogues on behalf of the artists you represent.
        </p>

        <div className="mt-6">
          <RequestAccessForm />
        </div>

        {/* Pending requests I've sent */}
        {pending.length > 0 && (
          <section className="mt-8">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
              Pending requests
            </h2>
            <div className="space-y-2">
              {pending.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between rounded-xl border border-white/[0.08] bg-white/[0.02] px-4 py-3"
                >
                  <div>
                    <p className="text-sm font-medium text-white">{p.artist_email}</p>
                    <p className="text-xs text-zinc-500">
                      {p.scope === "manage" ? "Manage" : "View"} access · awaiting approval
                    </p>
                  </div>
                  <RevokeButton id={p.id} label="Cancel" />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Represented artists + catalogues */}
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-500">
            Represented artists {approved.length > 0 && <span className="text-zinc-700">· {approved.length}</span>}
          </h2>
          {approved.length === 0 ? (
            <EmptyState
              title="No clients yet"
              subtitle="Request access to an artist above. Once they approve, their catalogue and earnings appear here."
            />
          ) : (
            <div className="space-y-5">
              {approved.map((a) => {
                const person = namesById.get(a.artist_user_id!);
                const tracks = tracksByArtist.get(a.artist_user_id!) ?? [];
                const locked = tracks.filter((t) => t.status === "locked").length;
                return (
                  <div key={a.id} className="card">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-white">
                          {person?.name || person?.email || a.artist_email}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {tracks.length} track{tracks.length === 1 ? "" : "s"} · {locked} locked ·{" "}
                          {a.scope === "manage" ? "Manage access" : "View access"}
                        </p>
                      </div>
                      <RevokeButton id={a.id} />
                    </div>
                    {tracks.length > 0 && (
                      <div className="mt-3 divide-y divide-white/[0.06]">
                        {tracks.slice(0, 8).map((t) => (
                          <Link
                            key={t.id}
                            href={`/splits/${t.id}`}
                            className="flex items-center justify-between py-2.5 text-sm"
                          >
                            <span className="truncate text-zinc-200">{t.title}</span>
                            <span className="flex items-center gap-3">
                              <span className="text-xs text-zinc-600">
                                {formatDate(t.updated_at)}
                              </span>
                              <Badge
                                status={t.status === "sent" ? "waiting" : t.status}
                                label={t.status}
                              />
                            </span>
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
