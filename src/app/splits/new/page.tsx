import { requireUser } from "@/lib/auth";
import { AppHeader } from "@/components/AppHeader";
import SplitForm from "@/components/SplitForm";

export const dynamic = "force-dynamic";

export default async function NewSplitPage() {
  const user = await requireUser();
  return (
    <div className="min-h-screen">
      <AppHeader email={user.email} isAdmin={user.isAdmin} />
      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
          New Split
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Create a track. Add collaborators. Set the splits.
        </p>
        <div className="mt-6">
          <SplitForm />
        </div>
      </main>
    </div>
  );
}
