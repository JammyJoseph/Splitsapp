"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireUser } from "@/lib/auth";
import { recordAudit } from "@/lib/audit";
import { generateAgreementReference } from "@/lib/utils";
import { generateSigningToken } from "@/lib/tokens";
import { sendEmail, inviteEmail, reminderEmail } from "@/lib/email";
import { appUrl } from "@/lib/constants";
import type { CollaboratorRole, ReleaseStatus, SplitAgreement, Track } from "@/lib/types";

export interface CollaboratorInput {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  role: CollaboratorRole;
  manager_email?: string;
  publishing_percentage: number;
}

export interface SplitInput {
  title: string;
  artist_project_name?: string;
  session_date?: string;
  audio_link?: string;
  release_status?: ReleaseStatus;
  master_ownership_note?: string;
  notes?: string;
  collaborators: CollaboratorInput[];
}

const EPS = 0.01;

function validate(input: SplitInput): string | null {
  if (!input.title?.trim()) return "Track title is required.";
  if (!input.collaborators.length) return "Add at least one collaborator.";
  for (const c of input.collaborators) {
    if (!c.name?.trim()) return "Every collaborator needs a name.";
    if (!c.email?.trim()) return "Every collaborator needs an email.";
    if (c.publishing_percentage < 0 || c.publishing_percentage > 100)
      return "Percentages must be between 0 and 100.";
  }
  return null;
}

function total(input: SplitInput): number {
  return input.collaborators.reduce(
    (s, c) => s + Number(c.publishing_percentage || 0),
    0,
  );
}

async function assertOwner(trackId: string) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: track } = await supabase
    .from("tracks")
    .select("*")
    .eq("id", trackId)
    .single<Track>();
  if (!track) throw new Error("Track not found or access denied.");
  if (track.created_by_user_id !== user.authId && !user.isAdmin)
    throw new Error("Only the creator can do that.");
  return { user, supabase, track };
}

// --- Create a brand-new split (draft) --------------------------------------
export async function createSplit(input: SplitInput) {
  const err = validate(input);
  if (err) return { error: err };

  const user = await requireUser();
  const supabase = await createClient();
  const admin = createAdminClient();

  const { data: track, error: trackErr } = await supabase
    .from("tracks")
    .insert({
      created_by_user_id: user.authId,
      title: input.title.trim(),
      artist_project_name: input.artist_project_name?.trim() || null,
      session_date: input.session_date || null,
      audio_link: input.audio_link?.trim() || null,
      release_status: input.release_status || "unknown",
      master_ownership_note: input.master_ownership_note?.trim() || null,
      notes: input.notes?.trim() || null,
      status: "draft",
      current_version: 1,
    })
    .select()
    .single<Track>();
  if (trackErr || !track) return { error: trackErr?.message || "Could not create track." };

  await insertCollaborators(supabase, track.id, input.collaborators);

  const { data: activeTemplate } = await admin
    .from("legal_templates")
    .select("id")
    .eq("active", true)
    .order("effective_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  await supabase.from("split_agreements").insert({
    track_id: track.id,
    version: 1,
    legal_template_id: activeTemplate?.id ?? null,
    status: "draft",
    total_publishing_percentage: total(input),
    unique_agreement_reference: generateAgreementReference(),
  });

  await recordAudit(admin, {
    eventType: "track_created",
    trackId: track.id,
    actorUserId: user.authId,
    actorEmail: user.email,
    eventData: { title: track.title },
  });

  revalidatePath("/dashboard");
  redirect(`/splits/${track.id}/review`);
}

async function insertCollaborators(
  supabase: Awaited<ReturnType<typeof createClient>>,
  trackId: string,
  collaborators: CollaboratorInput[],
) {
  const rows = collaborators.map((c) => ({
    track_id: trackId,
    name: c.name.trim(),
    email: c.email.trim().toLowerCase(),
    phone: c.phone?.trim() || null,
    role: c.role,
    manager_email: c.manager_email?.trim() || null,
    publishing_percentage: Number(c.publishing_percentage) || 0,
    signature_status: "pending" as const,
  }));
  const { error } = await supabase.from("collaborators").insert(rows);
  if (error) throw new Error(error.message);
}

// --- Update / revise a split -----------------------------------------------
// If the track is still a draft, edit in place. Otherwise create a NEW version
// (supersede the current agreement) so everyone must re-sign.
export async function updateSplit(trackId: string, input: SplitInput) {
  const err = validate(input);
  if (err) return { error: err };

  const { user, supabase, track } = await assertOwner(trackId);
  const admin = createAdminClient();

  // Update track metadata.
  await supabase
    .from("tracks")
    .update({
      title: input.title.trim(),
      artist_project_name: input.artist_project_name?.trim() || null,
      session_date: input.session_date || null,
      audio_link: input.audio_link?.trim() || null,
      release_status: input.release_status || "unknown",
      master_ownership_note: input.master_ownership_note?.trim() || null,
      notes: input.notes?.trim() || null,
    })
    .eq("id", trackId);

  // Replace collaborators (delete current, insert fresh lineup). Signatures on
  // superseded/locked agreements are preserved via ON DELETE SET NULL.
  await supabase.from("collaborators").delete().eq("track_id", trackId);
  await insertCollaborators(supabase, trackId, input.collaborators);

  // Current agreement.
  const { data: current } = await supabase
    .from("split_agreements")
    .select("*")
    .eq("track_id", trackId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle<SplitAgreement>();

  if (!current || current.status === "draft") {
    // Edit the existing draft agreement in place.
    if (current) {
      await supabase
        .from("split_agreements")
        .update({ total_publishing_percentage: total(input) })
        .eq("id", current.id);
    }
  } else {
    // Supersede and create a new version.
    await supabase
      .from("split_agreements")
      .update({ status: "superseded" })
      .eq("id", current.id);

    const newVersion = track.current_version + 1;
    const { data: activeTemplate } = await admin
      .from("legal_templates")
      .select("id")
      .eq("active", true)
      .order("effective_date", { ascending: false })
      .limit(1)
      .maybeSingle();

    await supabase.from("split_agreements").insert({
      track_id: trackId,
      version: newVersion,
      legal_template_id: activeTemplate?.id ?? null,
      status: "draft",
      total_publishing_percentage: total(input),
      unique_agreement_reference: generateAgreementReference(),
    });

    await supabase
      .from("tracks")
      .update({ current_version: newVersion, status: "draft" })
      .eq("id", trackId);

    await recordAudit(admin, {
      eventType: "agreement_superseded",
      trackId,
      splitAgreementId: current.id,
      actorUserId: user.authId,
      actorEmail: user.email,
      eventData: { supersededVersion: current.version, newVersion },
    });
  }

  await recordAudit(admin, {
    eventType: "collaborator_updated",
    trackId,
    actorUserId: user.authId,
    actorEmail: user.email,
  });

  revalidatePath(`/splits/${trackId}`);
  redirect(`/splits/${trackId}/review`);
}

// --- Send to lock: email every collaborator a secure signing link ----------
export async function sendToLock(trackId: string) {
  const { user, supabase, track } = await assertOwner(trackId);
  const admin = createAdminClient();

  const { data: collaborators } = await supabase
    .from("collaborators")
    .select("*")
    .eq("track_id", trackId)
    .order("created_at");
  const collabs = collaborators ?? [];

  const sum = collabs.reduce(
    (s, c) => s + Number(c.publishing_percentage),
    0,
  );
  if (collabs.length === 0) return { error: "Add at least one collaborator." };
  if (Math.abs(sum - 100) > EPS)
    return { error: `Publishing splits must total 100% (currently ${sum}%).` };

  const { data: agreement } = await supabase
    .from("split_agreements")
    .select("*")
    .eq("track_id", trackId)
    .order("version", { ascending: false })
    .limit(1)
    .single<SplitAgreement>();
  if (!agreement) return { error: "No agreement found." };
  if (agreement.status === "locked")
    return { error: "This split is locked. Create a new version to make changes." };

  // Mark sent.
  await supabase
    .from("split_agreements")
    .update({ status: "sent", total_publishing_percentage: sum })
    .eq("id", agreement.id);
  await supabase.from("tracks").update({ status: "sent" }).eq("id", trackId);
  await supabase
    .from("collaborators")
    .update({ signature_status: "pending", signed_at: null })
    .eq("track_id", trackId);

  await recordAudit(admin, {
    eventType: "split_sent",
    trackId,
    splitAgreementId: agreement.id,
    actorUserId: user.authId,
    actorEmail: user.email,
    eventData: { version: agreement.version, collaborators: collabs.length },
  });

  // Fresh signing tokens for this version + invites.
  await admin.from("signing_tokens").delete().eq("split_agreement_id", agreement.id);
  for (const c of collabs) {
    const token = generateSigningToken();
    await admin.from("signing_tokens").insert({
      token,
      split_agreement_id: agreement.id,
      collaborator_id: c.id,
    });
    const link = `${appUrl()}/sign/${token}`;
    const tmpl = inviteEmail(track.title, link);
    await sendEmail({ ...tmpl, to: c.email });
    await admin.from("notifications").insert({
      recipient_email: c.email,
      type: "invite",
      status: "sent",
      related_track_id: trackId,
      related_agreement_id: agreement.id,
      sent_at: new Date().toISOString(),
    });
    await recordAudit(admin, {
      eventType: "invite_sent",
      trackId,
      splitAgreementId: agreement.id,
      actorEmail: c.email,
      eventData: { collaboratorId: c.id, name: c.name },
    });
  }

  revalidatePath(`/splits/${trackId}`);
  redirect(`/splits/${trackId}`);
}

// --- Reminders -------------------------------------------------------------
export async function remindCollaborator(trackId: string, collaboratorId: string) {
  const { track } = await assertOwner(trackId);
  const admin = createAdminClient();

  const { data: agreement } = await admin
    .from("split_agreements")
    .select("*")
    .eq("track_id", trackId)
    .order("version", { ascending: false })
    .limit(1)
    .single<SplitAgreement>();
  if (!agreement) return { error: "No agreement." };

  const { data: tokenRow } = await admin
    .from("signing_tokens")
    .select("token")
    .eq("split_agreement_id", agreement.id)
    .eq("collaborator_id", collaboratorId)
    .maybeSingle();
  const { data: collab } = await admin
    .from("collaborators")
    .select("*")
    .eq("id", collaboratorId)
    .single();
  if (!tokenRow || !collab) return { error: "Could not send reminder." };

  const link = `${appUrl()}/sign/${tokenRow.token}`;
  const tmpl = reminderEmail(track.title, link);
  await sendEmail({ ...tmpl, to: collab.email });
  await recordAudit(admin, {
    eventType: "reminder_sent",
    trackId,
    splitAgreementId: agreement.id,
    actorEmail: collab.email,
    eventData: { collaboratorId },
  });
  revalidatePath(`/splits/${trackId}`);
  return { ok: true };
}

// --- Resolve a change request ----------------------------------------------
export async function resolveChangeRequest(
  changeRequestId: string,
  trackId: string,
) {
  const { user } = await assertOwner(trackId);
  const admin = createAdminClient();
  const { data: cr } = await admin
    .from("change_requests")
    .select("*")
    .eq("id", changeRequestId)
    .single();
  if (!cr) return { error: "Change request not found." };

  await admin
    .from("change_requests")
    .update({ status: "resolved", resolved_at: new Date().toISOString() })
    .eq("id", changeRequestId);
  await recordAudit(admin, {
    eventType: "change_resolved",
    trackId,
    splitAgreementId: cr.split_agreement_id,
    actorUserId: user.authId,
    actorEmail: user.email,
    eventData: { changeRequestId },
  });
  revalidatePath(`/splits/${trackId}`);
  return { ok: true };
}

// --- Archive / unarchive ---------------------------------------------------
export async function setArchived(trackId: string, archived: boolean) {
  const { track } = await assertOwner(trackId);
  const supabase = await createClient();
  if (track.status === "locked" && archived) {
    // Archiving a locked track is allowed; the locked agreement stays immutable.
  }
  await supabase
    .from("tracks")
    .update({ status: archived ? "archived" : "draft" })
    .eq("id", trackId);
  revalidatePath("/dashboard");
  revalidatePath(`/splits/${trackId}`);
  return { ok: true };
}

export async function getRequestMeta() {
  const h = await headers();
  return {
    ip:
      h.get("x-forwarded-for")?.split(",")[0].trim() ||
      h.get("x-real-ip") ||
      null,
    userAgent: h.get("user-agent") || null,
  };
}
