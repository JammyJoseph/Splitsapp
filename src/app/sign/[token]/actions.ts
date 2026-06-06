"use server";

import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { recordAudit } from "@/lib/audit";
import { attemptLockAgreement } from "@/lib/agreements";
import {
  sendEmail,
  signedNotificationEmail,
  changeRequestedEmail,
} from "@/lib/email";
import { appUrl } from "@/lib/constants";
import type { Collaborator, SplitAgreement, Track } from "@/lib/types";

async function resolveToken(token: string) {
  const admin = createAdminClient();
  const { data: tokenRow } = await admin
    .from("signing_tokens")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (!tokenRow) return null;

  const { data: agreement } = await admin
    .from("split_agreements")
    .select("*")
    .eq("id", tokenRow.split_agreement_id)
    .single<SplitAgreement>();
  const { data: collaborator } = await admin
    .from("collaborators")
    .select("*")
    .eq("id", tokenRow.collaborator_id)
    .single<Collaborator>();
  if (!agreement || !collaborator) return null;

  const { data: track } = await admin
    .from("tracks")
    .select("*")
    .eq("id", agreement.track_id)
    .single<Track>();
  if (!track) return null;

  return { admin, tokenRow, agreement, collaborator, track };
}

async function reqMeta() {
  const h = await headers();
  return {
    ip:
      h.get("x-forwarded-for")?.split(",")[0].trim() ||
      h.get("x-real-ip") ||
      null,
    userAgent: h.get("user-agent") || null,
  };
}

interface SignInput {
  typedSignature: string;
  acceptedESignature: boolean;
  acceptedTerms: boolean;
  confirmedAccuracy: boolean;
}

export async function signAgreement(token: string, input: SignInput) {
  if (!input.typedSignature?.trim())
    return { error: "Type your full legal name to sign." };
  if (!input.acceptedESignature || !input.acceptedTerms || !input.confirmedAccuracy)
    return { error: "Please confirm all three checkboxes to sign." };

  const ctx = await resolveToken(token);
  if (!ctx) return { error: "This signing link is no longer valid." };
  const { admin, agreement, collaborator, track } = ctx;

  if (agreement.status === "locked")
    return { error: "This split is already locked." };
  if (agreement.status === "superseded")
    return { error: "This version is out of date — a newer version was created." };

  const meta = await reqMeta();

  // Idempotent: ignore if already signed.
  const { data: existing } = await admin
    .from("signatures")
    .select("id")
    .eq("split_agreement_id", agreement.id)
    .eq("collaborator_id", collaborator.id)
    .maybeSingle();

  if (!existing) {
    const { error: sigErr } = await admin.from("signatures").insert({
      split_agreement_id: agreement.id,
      collaborator_id: collaborator.id,
      name: collaborator.name,
      email: collaborator.email,
      typed_signature: input.typedSignature.trim(),
      accepted_terms: input.acceptedTerms,
      accepted_e_signature: input.acceptedESignature,
      confirmed_accuracy: input.confirmedAccuracy,
      ip_address: meta.ip,
      user_agent: meta.userAgent,
    });
    if (sigErr) return { error: sigErr.message };

    await admin
      .from("collaborators")
      .update({
        signature_status: "signed",
        signed_at: new Date().toISOString(),
      })
      .eq("id", collaborator.id);

    await recordAudit(admin, {
      eventType: "collaborator_signed",
      trackId: track.id,
      splitAgreementId: agreement.id,
      actorEmail: collaborator.email,
      ipAddress: meta.ip,
      userAgent: meta.userAgent,
      eventData: { collaboratorId: collaborator.id, name: collaborator.name },
    });

    // Notify the creator that someone signed.
    const { data: creator } = await admin
      .from("users")
      .select("email")
      .eq("id", track.created_by_user_id)
      .maybeSingle();
    if (creator?.email) {
      const tmpl = signedNotificationEmail(
        track.title,
        collaborator.name,
        `${appUrl()}/splits/${track.id}`,
      );
      await sendEmail({ ...tmpl, to: creator.email });
    }
  }

  // Try to lock if everyone has now signed.
  const { locked } = await attemptLockAgreement(admin, agreement.id);
  return { ok: true, locked };
}

interface ChangeInput {
  reason: string;
  proposedChange?: string;
}

export async function requestChange(token: string, input: ChangeInput) {
  if (!input.reason?.trim())
    return { error: "Please describe the change you're requesting." };

  const ctx = await resolveToken(token);
  if (!ctx) return { error: "This signing link is no longer valid." };
  const { admin, agreement, collaborator, track } = ctx;

  if (agreement.status === "locked")
    return { error: "This split is already locked." };

  const meta = await reqMeta();

  await admin.from("change_requests").insert({
    split_agreement_id: agreement.id,
    collaborator_id: collaborator.id,
    reason: input.reason.trim(),
    proposed_change: input.proposedChange?.trim() || null,
    status: "open",
  });

  await admin
    .from("collaborators")
    .update({ signature_status: "change_requested" })
    .eq("id", collaborator.id);
  await admin
    .from("split_agreements")
    .update({ status: "changes_requested" })
    .eq("id", agreement.id);
  await admin
    .from("tracks")
    .update({ status: "changes_requested" })
    .eq("id", track.id);

  await recordAudit(admin, {
    eventType: "change_requested",
    trackId: track.id,
    splitAgreementId: agreement.id,
    actorEmail: collaborator.email,
    ipAddress: meta.ip,
    userAgent: meta.userAgent,
    eventData: { reason: input.reason, proposed: input.proposedChange ?? null },
  });

  const { data: creator } = await admin
    .from("users")
    .select("email")
    .eq("id", track.created_by_user_id)
    .maybeSingle();
  if (creator?.email) {
    const tmpl = changeRequestedEmail(
      track.title,
      input.reason.trim(),
      `${appUrl()}/splits/${track.id}`,
    );
    await sendEmail({ ...tmpl, to: creator.email });
  }

  return { ok: true };
}

export async function markInviteViewed(token: string) {
  const ctx = await resolveToken(token);
  if (!ctx) return;
  const { admin, agreement, collaborator, track } = ctx;
  await recordAudit(admin, {
    eventType: "invite_viewed",
    trackId: track.id,
    splitAgreementId: agreement.id,
    actorEmail: collaborator.email,
    eventData: { collaboratorId: collaborator.id },
  });
}
