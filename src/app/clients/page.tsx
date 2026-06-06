import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { AppHeader } from "@/components/AppHeader";
import { EmptyState } from "@/components/ui";

export const dynamic = "force-dynamic";

// Lightweight manager view. Full client/organisation management (creating
// orgs, inviting team members, the export centre) is on the roadmap; the
// schema (organisations, organisation_users, clients) is already in place.
export default async function ClientsPage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: clients } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email} isAdmin={user.isAdmin} isManager />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          Clients
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Manage splits on behalf of the artists and writers you represent.
        </p>

        <div className="mt-6">
          {(clients ?? []).length === 0 ? (
            <EmptyState
              title="No clients yet"
              subtitle="Create a split for a client from the dashboard. Full client management and the export centre are coming soon."
              action={
                <Link href="/splits/new" className="btn-primary">
                  + New Split
                </Link>
              }
            />
          ) : (
            <div className="space-y-3">
              {(clients ?? []).map((c) => (
                <div key={c.id} className="card">
                  <p className="font-semibold text-zinc-900">{c.name}</p>
                  {c.email && <p className="text-sm text-zinc-500">{c.email}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
