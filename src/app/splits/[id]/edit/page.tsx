import { notFound, redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { loadTrackBundle } from "@/lib/queries";
import { AppHeader } from "@/components/AppHeader";
import SplitForm from "@/components/SplitForm";
import type { SplitInput } from "@/app/splits/actions";

export const dynamic = "force-dynamic";

export default async function EditSplitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireUser();
  const supabase = await createClient();
  const bundle = await loadTrackBundle(supabase, id);
  if (!bundle) notFound();
  if (bundle.track.created_by_user_id !== user.authId && !user.isAdmin)
    redirect(`/splits/${id}`);

  const { track, collaborators } = bundle;
  const isRevision = track.status !== "draft";

  const initial: Partial<SplitInput> = {
    title: track.title,
    artist_project_name: track.artist_project_name ?? "",
    session_date: track.session_date ?? "",
    audio_link: track.audio_link ?? "",
    release_status: track.release_status ?? "unknown",
    master_ownership_note: track.master_ownership_note ?? "",
    notes: track.notes ?? "",
    collaborators: collaborators.map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      phone: c.phone ?? "",
      role: c.role,
      manager_email: c.manager_email ?? "",
      publishing_percentage: Number(c.publishing_percentage),
    })),
  };

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email} isAdmin={user.isAdmin} />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-50">
          Edit split
        </h1>
        {isRevision && (
          <p className="mt-2 rounded-xl bg-amber-500/10 px-4 py-3 text-sm text-amber-300">
            This split has already been sent. Saving changes creates a new
            version — everyone will need to re-sign.
          </p>
        )}
        <div className="mt-6">
          <SplitForm trackId={track.id} initial={initial} />
        </div>
      </main>
    </div>
  );
}
