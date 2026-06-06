import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildSplitConfirmationPdf } from "@/lib/pdf";
import type {
  Collaborator,
  LegalTemplate,
  Signature,
  SplitAgreement,
  Track,
} from "@/lib/types";

// GET /api/pdf/[id]?token=...
// [id] is a split_agreement id. Generates the Split Confirmation Agreement PDF.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const token = request.nextUrl.searchParams.get("token");
  const admin = createAdminClient();

  const { data: agreement } = await admin
    .from("split_agreements")
    .select("*")
    .eq("id", id)
    .maybeSingle<SplitAgreement>();
  if (!agreement) {
    return new NextResponse("Not found", { status: 404 });
  }

  // ---- Authorisation ------------------------------------------------------
  let authorised = false;

  // 1) Authenticated viewer with RLS access to the track.
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    const { data: visible } = await supabase
      .from("tracks")
      .select("id")
      .eq("id", agreement.track_id)
      .maybeSingle();
    if (visible) authorised = true;
  }

  // 2) A valid signing token for this agreement (for invitees without an account).
  if (!authorised && token) {
    const { data: tk } = await admin
      .from("signing_tokens")
      .select("id")
      .eq("token", token)
      .eq("split_agreement_id", id)
      .maybeSingle();
    if (tk) authorised = true;
  }

  if (!authorised) {
    return new NextResponse("Unauthorised", { status: 401 });
  }

  // ---- Load everything ----------------------------------------------------
  const { data: track } = await admin
    .from("tracks")
    .select("*")
    .eq("id", agreement.track_id)
    .single<Track>();
  const { data: collaborators } = await admin
    .from("collaborators")
    .select("*")
    .eq("track_id", agreement.track_id)
    .order("created_at");
  const { data: signatures } = await admin
    .from("signatures")
    .select("*")
    .eq("split_agreement_id", id);

  let legalTemplate: LegalTemplate | null = null;
  if (agreement.legal_template_id) {
    const { data: lt } = await admin
      .from("legal_templates")
      .select("*")
      .eq("id", agreement.legal_template_id)
      .maybeSingle<LegalTemplate>();
    legalTemplate = lt ?? null;
  }

  const { data: audit } = await admin
    .from("audit_events")
    .select("event_type, created_at, actor_email")
    .eq("split_agreement_id", id)
    .order("created_at", { ascending: true });

  if (!track) return new NextResponse("Not found", { status: 404 });

  const bytes = await buildSplitConfirmationPdf({
    track,
    agreement,
    collaborators: (collaborators ?? []) as Collaborator[],
    signatures: (signatures ?? []) as Signature[],
    legalTemplate,
    auditSummary: (audit ?? []) as {
      event_type: string;
      created_at: string;
      actor_email: string | null;
    }[],
  });

  const filename = `Split-Confirmation-${agreement.unique_agreement_reference}.pdf`;
  return new NextResponse(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
