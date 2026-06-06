"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Create a NEW legal template version. Existing versions are never edited.
export async function createLegalTemplate(input: {
  version: string;
  title: string;
  body: string;
  governing_law: string;
  effective_date: string;
  activate: boolean;
}) {
  await requireAdmin();
  const admin = createAdminClient();

  if (!input.version.trim() || !input.title.trim() || !input.body.trim())
    return { error: "Version, title and body are required." };

  const { data: existing } = await admin
    .from("legal_templates")
    .select("id")
    .eq("version", input.version.trim())
    .maybeSingle();
  if (existing)
    return { error: `Version ${input.version} already exists. Use a new version number.` };

  if (input.activate) {
    // Only one active template at a time.
    await admin.from("legal_templates").update({ active: false }).eq("active", true);
  }

  const { error } = await admin.from("legal_templates").insert({
    version: input.version.trim(),
    title: input.title.trim(),
    body: input.body,
    governing_law: input.governing_law.trim() || "England and Wales",
    effective_date: input.effective_date || new Date().toISOString().slice(0, 10),
    active: input.activate,
  });
  if (error) return { error: error.message };

  revalidatePath("/admin/legal-templates");
  return { ok: true };
}

// Activate a template version (deactivating any currently-active one).
// Existing agreements keep whatever version was attached when they were sent.
export async function activateLegalTemplate(id: string) {
  await requireAdmin();
  const admin = createAdminClient();
  await admin.from("legal_templates").update({ active: false }).eq("active", true);
  await admin.from("legal_templates").update({ active: true }).eq("id", id);
  revalidatePath("/admin/legal-templates");
  return { ok: true };
}

export async function deactivateLegalTemplate(id: string) {
  await requireAdmin();
  const admin = createAdminClient();
  await admin.from("legal_templates").update({ active: false }).eq("id", id);
  revalidatePath("/admin/legal-templates");
  return { ok: true };
}
