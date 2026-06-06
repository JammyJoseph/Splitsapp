import { Resend } from "resend";
import { appUrl, APP_NAME } from "./constants";

const FROM = process.env.EMAIL_FROM || "Tracklock <splits@tracklock.app>";

interface SendArgs {
  to: string;
  subject: string;
  html: string;
}

// Sends an email via Resend. If RESEND_API_KEY is not configured (private
// beta / local dev), the message is logged to the server console instead.
export async function sendEmail({ to, subject, html }: SendArgs): Promise<void> {
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.log(
      `\n[email:dev] To: ${to}\n[email:dev] Subject: ${subject}\n[email:dev] ${html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()}\n`,
    );
    return;
  }
  try {
    const resend = new Resend(key);
    await resend.emails.send({ from: FROM, to, subject, html });
  } catch (err) {
    console.error("[email] send failed", err);
  }
}

function shell(title: string, body: string): string {
  return `
  <div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;background:#0a0a0a;padding:32px;color:#fff">
    <div style="max-width:480px;margin:0 auto;background:#141414;border:1px solid #262626;border-radius:16px;overflow:hidden">
      <div style="padding:24px 28px;border-bottom:1px solid #262626">
        <span style="font-size:18px;font-weight:700;letter-spacing:-0.02em">🔒 ${APP_NAME}</span>
      </div>
      <div style="padding:28px">
        <h1 style="font-size:20px;margin:0 0 12px;font-weight:700;letter-spacing:-0.02em">${title}</h1>
        ${body}
      </div>
      <div style="padding:16px 28px;border-top:1px solid #262626;color:#737373;font-size:12px">
        Tracklock is a technology provider, not a law firm, and does not provide legal advice.
      </div>
    </div>
  </div>`;
}

function button(href: string, label: string): string {
  return `<a href="${href}" style="display:inline-block;background:#fff;color:#0a0a0a;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:10px;margin:8px 0">${label}</a>`;
}

export function inviteEmail(trackTitle: string, link: string): SendArgs {
  return {
    to: "",
    subject: `Confirm the splits for "${trackTitle}"`,
    html: shell(
      `You've been invited to confirm the splits for "${trackTitle}".`,
      `<p style="color:#a3a3a3;line-height:1.6">Review the agreed publishing splits and either accept &amp; sign, or request a change. It only takes a moment.</p>
       ${button(link, "Review & Sign")}
       <p style="color:#737373;font-size:13px;margin-top:16px">If the button doesn't work, paste this link into your browser:<br/><span style="color:#a3a3a3">${link}</span></p>`,
    ),
  };
}

export function reminderEmail(trackTitle: string, link: string): SendArgs {
  return {
    to: "",
    subject: `Reminder: sign the splits for "${trackTitle}"`,
    html: shell(
      `Still waiting on your signature for "${trackTitle}".`,
      `<p style="color:#a3a3a3;line-height:1.6">The split for this track can't lock until everyone signs.</p>
       ${button(link, "Review & Sign")}`,
    ),
  };
}

export function signedNotificationEmail(
  trackTitle: string,
  signerName: string,
  link: string,
): SendArgs {
  return {
    to: "",
    subject: `${signerName} signed the splits for "${trackTitle}"`,
    html: shell(
      `${signerName} just signed.`,
      `<p style="color:#a3a3a3;line-height:1.6"><strong>${signerName}</strong> accepted and signed the split for "${trackTitle}".</p>
       ${button(link, "View split")}`,
    ),
  };
}

export function changeRequestedEmail(
  trackTitle: string,
  reason: string,
  link: string,
): SendArgs {
  return {
    to: "",
    subject: `Change requested on "${trackTitle}"`,
    html: shell(
      `A change was requested on "${trackTitle}".`,
      `<p style="color:#a3a3a3;line-height:1.6">A collaborator asked for a change before signing:</p>
       <blockquote style="border-left:3px solid #525252;padding-left:14px;color:#d4d4d4;margin:14px 0">${reason}</blockquote>
       ${button(link, "Review the split")}`,
    ),
  };
}

export function lockedEmail(trackTitle: string, ref: string, link: string): SendArgs {
  return {
    to: "",
    subject: `Split locked: "${trackTitle}" (${ref})`,
    html: shell(
      `🔒 Split locked for "${trackTitle}".`,
      `<p style="color:#a3a3a3;line-height:1.6">Everyone signed. The split is now locked and timestamped. Reference <strong>${ref}</strong>.</p>
       ${button(link, "View locked split")}`,
    ),
  };
}
