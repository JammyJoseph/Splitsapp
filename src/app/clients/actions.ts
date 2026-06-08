"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { appUrl, APP_NAME } from "@/lib/constants";
import type { AccountAccess, AccountAccessScope } from "@/lib/types";

// A manager requests delegated access to a producer/artist account.
export async function requestAccess(
  email: string,
  scope: AccountAccessScope,
  message: string,
) {
  const user = await requireUser();
  const supabase = await createClient();
  const admin = createAdminClient();

  const target = email.trim().toLowerCase();
  if (!target || !target.includes("@")) return { error: "Enter a valid email." };
  if (target === user.email.toLowerCase())
    return { error: "You can't request access to your own account." };

  // Match an existing user by email (privileged lookup).
  const { data: existing } = await admin
    .from("users")
    .select("id")
    .ilike("email", target)
    .maybeSingle();

  const { error } = await supabase.from("account_access").insert({
    manager_user_id: user.authId,
    artist_email: target,
    artist_user_id: existing?.id ?? null,
    scope,
    status: "pending",
    message: message.trim() || null,
  });
  if (error) {
    if (error.code === "23505")
      return { error: "You already have a request or link with this person." };
    return { error: error.message };
  }

  // Notify the producer.
  await sendEmail({
    to: target,
    subject: `${user.profile?.name || user.email} requested access on ${APP_NAME}`,
    html: `<div style="font-family:sans-serif"><p><strong>${user.profile?.name || user.email}</strong> has asked to ${scope === "manage" ? "manage" : "view"} your splits and catalogue on ${APP_NAME}.</p>${message.trim() ? `<blockquote>${message.trim()}</blockquote>` : ""}<p>Log in to approve or decline: <a href="${appUrl()}/profile">${appUrl()}/profile</a></p></div>`,
  });

  revalidatePath("/clients");
  return { ok: true };
}

// The producer approves or declines a pending request.
export async function respondToAccess(id: string, approve: boolean) {
  const user = await requireUser();
  const admin = createAdminClient();

  const { data: req } = await admin
    .from("account_access")
    .select("*")
    .eq("id", id)
    .single<AccountAccess>();
  if (!req) return { error: "Request not found." };

  const mine =
    req.artist_user_id === user.authId ||
    req.artist_email.toLowerCase() === user.email.toLowerCase();
  if (!mine) return { error: "This request isn't addressed to you." };

  const { error } = await admin
    .from("account_access")
    .update({
      status: approve ? "approved" : "declined",
      artist_user_id: user.authId,
      responded_at: new Date().toISOString(),
    })
    .eq("id", id);
  if (error) return { error: error.message };

  // Tell the manager.
  const { data: manager } = await admin
    .from("users")
    .select("email")
    .eq("id", req.manager_user_id)
    .maybeSingle();
  if (manager?.email) {
    await sendEmail({
      to: manager.email,
      subject: `Access ${approve ? "approved" : "declined"} on ${APP_NAME}`,
      html: `<div style="font-family:sans-serif"><p>${user.profile?.name || user.email} ${approve ? "approved" : "declined"} your request to access their account.</p>${approve ? `<p><a href="${appUrl()}/clients">View their catalogue</a></p>` : ""}</div>`,
    });
  }

  revalidatePath("/profile");
  revalidatePath("/clients");
  return { ok: true };
}

// Either party can end the relationship.
export async function revokeAccess(id: string) {
  const user = await requireUser();
  const admin = createAdminClient();
  const { data: req } = await admin
    .from("account_access")
    .select("*")
    .eq("id", id)
    .single<AccountAccess>();
  if (!req) return { error: "Not found." };
  if (req.manager_user_id !== user.authId && req.artist_user_id !== user.authId)
    return { error: "Not allowed." };

  await admin
    .from("account_access")
    .update({ status: "revoked", responded_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/profile");
  revalidatePath("/clients");
  return { ok: true };
}
