import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/ui";
import { SplitTable } from "@/components/SplitTable";
import SignFlow from "@/components/SignFlow";
import { formatDate } from "@/lib/utils";
import { RELEASE_STATUS_LABELS, ROLE_LABELS } from "@/lib/constants";
import type {
  Collaborator,
  LegalTemplate,
  SplitAgreement,
  Track,
} from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SignPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: tokenRow } = await admin
    .from("signing_tokens")
    .select("*")
    .eq("token", token)
    .maybeSingle();

  if (!tokenRow) return <Invalid />;

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
  if (!agreement || !collaborator) return <Invalid />;

  const { data: track } = await admin
    .from("tracks")
    .select("*")
    .eq("id", agreement.track_id)
    .single<Track>();
  if (!track) return <Invalid />;

  const { data: collaborators } = await admin
    .from("collaborators")
    .select("*")
    .eq("track_id", track.id)
    .order("created_at");

  let legalTemplate: LegalTemplate | null = null;
  if (agreement.legal_template_id) {
    const { data: lt } = await admin
      .from("legal_templates")
      .select("*")
      .eq("id", agreement.legal_template_id)
      .maybeSingle<LegalTemplate>();
    legalTemplate = lt ?? null;
  }

  const { data: existingSig } = await admin
    .from("signatures")
    .select("id, signed_at")
    .eq("split_agreement_id", agreement.id)
    .eq("collaborator_id", collaborator.id)
    .maybeSingle();

  const alreadySigned = !!existingSig || collaborator.signature_status === "signed";

  return (
    <div className="min-h-screen bg-[#08080a]">
      <header className="border-b border-white/[0.06] bg-[#0a0a0c]/80 backdrop-blur-xl">
        <div className="mx-auto max-w-2xl px-4 py-4">
          <Logo className="text-base" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <p className="text-sm text-zinc-500">You've been invited to confirm the splits for</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-50">
          {track.title}
        </h1>
        <p className="mt-1 text-sm text-zinc-400">
          {track.artist_project_name || "—"} ·{" "}
          {RELEASE_STATUS_LABELS[track.release_status ?? "unknown"]} ·{" "}
          {track.session_date ? `Session ${formatDate(track.session_date)}` : "Session date not set"}
        </p>

        {/* Your row */}
        <div className="mt-6 rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] p-5">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Your details</p>
          <p className="mt-1 text-lg font-semibold text-zinc-50">{collaborator.name}</p>
          <p className="text-sm text-zinc-400">
            {ROLE_LABELS[collaborator.role] ?? collaborator.role} · proposed split{" "}
            <span className="font-semibold text-zinc-50">
              {collaborator.publishing_percentage}%
            </span>
          </p>
        </div>

        {/* Full split table */}
        <div className="mt-6">
          <h2 className="mb-3 font-semibold text-zinc-50">The full split</h2>
          <SplitTable
            collaborators={(collaborators ?? []) as Collaborator[]}
            showStatus
            highlightEmail={collaborator.email}
          />
        </div>

        {/* Protection terms summary */}
        {legalTemplate && (
          <details className="mt-6 card-elevated">
            <summary className="cursor-pointer font-semibold text-zinc-50">
              Standard protection terms · v{legalTemplate.version}
            </summary>
            <pre className="mt-3 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-white/[0.03] p-3 text-xs leading-relaxed text-zinc-300">
              {legalTemplate.body}
            </pre>
          </details>
        )}

        <SignFlow
          token={token}
          collaboratorName={collaborator.name}
          agreementStatus={agreement.status}
          alreadySigned={alreadySigned}
          reference={agreement.unique_agreement_reference}
        />

        <p className="mt-8 text-center text-xs text-zinc-500">
          Tracklock is a technology provider, not a law firm, and does not
          provide legal advice. Seek independent legal advice where required.
        </p>
      </main>
    </div>
  );
}

function Invalid() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Logo />
      <h1 className="mt-6 text-xl font-bold text-zinc-50">
        This signing link isn&apos;t valid
      </h1>
      <p className="mt-2 max-w-sm text-sm text-zinc-400">
        The link may have expired or a newer version of the split was created.
        Ask the person who invited you to resend it.
      </p>
    </div>
  );
}
