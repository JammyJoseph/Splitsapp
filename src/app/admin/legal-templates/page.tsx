import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppHeader } from "@/components/AppHeader";
import { LegalTemplateManager } from "@/components/LegalTemplateManager";
import type { LegalTemplate } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function LegalTemplatesPage() {
  const user = await requireAdmin();
  const admin = createAdminClient();
  const { data: templates } = await admin
    .from("legal_templates")
    .select("*")
    .order("effective_date", { ascending: false });

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email} isAdmin />
      <main className="mx-auto max-w-3xl px-4 py-8">
        <Link href="/admin" className="text-sm text-zinc-400 hover:text-zinc-700">
          ← Admin
        </Link>
        <h1 className="mt-3 text-2xl font-bold tracking-tight text-zinc-900">
          Legal templates
        </h1>
        <div className="mt-6">
          <LegalTemplateManager templates={(templates ?? []) as LegalTemplate[]} />
        </div>
      </main>
    </div>
  );
}
