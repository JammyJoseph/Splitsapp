import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import { ROLE_LABELS } from "./constants";
import type {
  Collaborator,
  LegalTemplate,
  Signature,
  SplitAgreement,
  Track,
} from "./types";
import { formatDate, formatDateTime, formatPct } from "./utils";

interface BuildPdfArgs {
  track: Track;
  agreement: SplitAgreement;
  collaborators: Collaborator[];
  signatures: Signature[];
  legalTemplate: LegalTemplate | null;
  auditSummary?: { event_type: string; created_at: string; actor_email: string | null }[];
}

const PAGE_W = 595.28; // A4
const PAGE_H = 841.89;
const MARGIN = 56;
const INK = rgb(0.06, 0.06, 0.06);
const MUTE = rgb(0.42, 0.42, 0.42);
const LINE = rgb(0.85, 0.85, 0.85);

// Generates the "Split Confirmation Agreement" PDF and returns raw bytes.
export async function buildSplitConfirmationPdf(
  args: BuildPdfArgs,
): Promise<Uint8Array> {
  const { track, agreement, collaborators, signatures, legalTemplate } = args;
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([PAGE_W, PAGE_H]);
  let y = PAGE_H - MARGIN;

  const newPage = () => {
    page = doc.addPage([PAGE_W, PAGE_H]);
    y = PAGE_H - MARGIN;
  };
  const ensure = (needed: number) => {
    if (y - needed < MARGIN) newPage();
  };
  const text = (
    str: string,
    opts: { font?: PDFFont; size?: number; color?: typeof INK; x?: number } = {},
  ) => {
    const f = opts.font ?? font;
    const size = opts.size ?? 10;
    page.drawText(str, {
      x: opts.x ?? MARGIN,
      y,
      size,
      font: f,
      color: opts.color ?? INK,
    });
  };
  const line = () => {
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_W - MARGIN, y },
      thickness: 0.5,
      color: LINE,
    });
  };
  // Word-wrap helper.
  const wrap = (str: string, size: number, f: PDFFont, maxW: number): string[] => {
    const out: string[] = [];
    for (const rawLine of str.split("\n")) {
      if (rawLine.trim() === "") {
        out.push("");
        continue;
      }
      const words = rawLine.split(/\s+/);
      let cur = "";
      for (const w of words) {
        const test = cur ? cur + " " + w : w;
        if (f.widthOfTextAtSize(test, size) > maxW && cur) {
          out.push(cur);
          cur = w;
        } else {
          cur = test;
        }
      }
      if (cur) out.push(cur);
    }
    return out;
  };
  const paragraph = (str: string, size = 9.5, f: PDFFont = font, color = MUTE) => {
    const lines = wrap(str, size, f, PAGE_W - MARGIN * 2);
    for (const ln of lines) {
      ensure(size + 4);
      text(ln, { size, font: f, color });
      y -= size + 4;
    }
  };

  // ---- Header -------------------------------------------------------------
  text("🔒 TRACKLOCK", { font: bold, size: 13 });
  y -= 22;
  text("Split Confirmation Agreement", { font: bold, size: 20 });
  y -= 16;
  text(`Agreement reference: ${agreement.unique_agreement_reference}`, {
    size: 10,
    color: MUTE,
  });
  y -= 16;
  line();
  y -= 22;

  // ---- Track metadata -----------------------------------------------------
  const meta: [string, string][] = [
    ["Track title", track.title],
    ["Artist / project", track.artist_project_name || "—"],
    ["Session date", formatDate(track.session_date)],
    ["Agreement created", formatDate(agreement.created_at)],
    ["Locked", formatDateTime(agreement.locked_at)],
    ["Agreement version", `v${agreement.version}`],
    [
      "Legal template version",
      legalTemplate ? `${legalTemplate.title} v${legalTemplate.version}` : "—",
    ],
    ["Governing law", legalTemplate?.governing_law || "England and Wales"],
  ];
  for (const [k, v] of meta) {
    ensure(16);
    text(k, { font: bold, size: 9.5 });
    text(v, { size: 9.5, x: MARGIN + 150, color: INK });
    y -= 15;
  }
  y -= 10;
  line();
  y -= 22;

  // ---- Collaborator / split table ----------------------------------------
  text("Publishing splits", { font: bold, size: 13 });
  y -= 18;
  const cols = { name: MARGIN, role: MARGIN + 150, email: MARGIN + 270, pct: PAGE_W - MARGIN - 50 };
  text("Name", { font: bold, size: 9, x: cols.name });
  text("Role", { font: bold, size: 9, x: cols.role });
  text("Email", { font: bold, size: 9, x: cols.email });
  text("Split", { font: bold, size: 9, x: cols.pct });
  y -= 6;
  line();
  y -= 14;
  for (const c of collaborators) {
    ensure(16);
    text(c.name, { size: 9, x: cols.name });
    text(ROLE_LABELS[c.role] ?? c.role, { size: 9, x: cols.role });
    text(c.email.length > 28 ? c.email.slice(0, 27) + "…" : c.email, {
      size: 9,
      x: cols.email,
    });
    text(formatPct(c.publishing_percentage), { size: 9, x: cols.pct, font: bold });
    y -= 15;
  }
  y -= 4;
  line();
  y -= 14;
  text("Total publishing", { font: bold, size: 9.5, x: cols.email });
  text(formatPct(agreement.total_publishing_percentage), {
    font: bold,
    size: 9.5,
    x: cols.pct,
  });
  y -= 20;

  if (track.master_ownership_note) {
    ensure(30);
    text("Master ownership note (informational only)", { font: bold, size: 9.5 });
    y -= 14;
    paragraph(track.master_ownership_note, 9, font, MUTE);
    y -= 6;
  }

  // ---- Confirmation statement --------------------------------------------
  ensure(40);
  y -= 6;
  line();
  y -= 20;
  text("Confirmation", { font: bold, size: 13 });
  y -= 16;
  paragraph(
    "Each signatory confirmed that the splits shown above are accurate for this track and that they agree to the standard protection terms attached to this Split Confirmation Agreement.",
  );
  y -= 8;

  // ---- Signature blocks ---------------------------------------------------
  ensure(30);
  text("Signatures", { font: bold, size: 13 });
  y -= 18;
  const sigByCollab = new Map(signatures.map((s) => [s.collaborator_id, s]));
  for (const c of collaborators) {
    const sig = sigByCollab.get(c.id);
    ensure(64);
    text(c.name, { font: bold, size: 10 });
    y -= 14;
    if (sig) {
      text(`Signed: "${sig.typed_signature}"`, { size: 9, color: INK });
      y -= 13;
      text(`Email: ${sig.email}`, { size: 8.5, color: MUTE });
      y -= 12;
      text(`Timestamp: ${formatDateTime(sig.signed_at)}`, { size: 8.5, color: MUTE });
      y -= 12;
      text(
        `IP: ${sig.ip_address || "n/a"}   Device: ${(sig.user_agent || "n/a").slice(0, 60)}`,
        { size: 7.5, color: MUTE },
      );
      y -= 12;
      text(
        `e-signature: ${sig.accepted_e_signature ? "yes" : "no"}  ·  terms: ${sig.accepted_terms ? "yes" : "no"}  ·  accuracy: ${sig.confirmed_accuracy ? "yes" : "no"}`,
        { size: 7.5, color: MUTE },
      );
      y -= 18;
    } else {
      text("Not signed", { size: 9, color: MUTE });
      y -= 18;
    }
  }

  // ---- Audit summary ------------------------------------------------------
  if (args.auditSummary && args.auditSummary.length) {
    ensure(40);
    y -= 4;
    line();
    y -= 20;
    text("Audit summary", { font: bold, size: 13 });
    y -= 16;
    for (const e of args.auditSummary) {
      ensure(14);
      text(
        `${formatDateTime(e.created_at)}  ·  ${e.event_type}${e.actor_email ? "  ·  " + e.actor_email : ""}`,
        { size: 8, color: MUTE },
      );
      y -= 12;
    }
  }

  // ---- Standard protection terms -----------------------------------------
  newPage();
  text("Standard Protection Terms", { font: bold, size: 16 });
  y -= 14;
  text(
    legalTemplate ? `Version ${legalTemplate.version} · effective ${formatDate(legalTemplate.effective_date)}` : "—",
    { size: 9, color: MUTE },
  );
  y -= 16;
  line();
  y -= 18;
  paragraph(legalTemplate?.body || "Standard protection terms unavailable.", 9, font, INK);

  // ---- Disclaimer / change mechanism -------------------------------------
  y -= 10;
  ensure(60);
  line();
  y -= 18;
  text("Change mechanism", { font: bold, size: 10 });
  y -= 14;
  paragraph(
    "This record is immutable. Any change to a split percentage, collaborator, role or material term requires a new version of this agreement to be created and re-signed by all affected parties. Old versions remain available in the version history.",
    9,
  );
  y -= 6;
  text("Disclaimer", { font: bold, size: 10 });
  y -= 14;
  paragraph(
    "Tracklock is a technology provider and is not a law firm. Tracklock does not provide legal advice and does not take ownership of any music, publishing, master rights, royalties or intellectual property. Parties should seek independent legal advice where required.",
    9,
  );

  return doc.save();
}
