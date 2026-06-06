// Small shared helpers.

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatPct(n: number): string {
  const rounded = Math.round(n * 1000) / 1000;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(3).replace(/0+$/, "").replace(/\.$/, "")}%`;
}

// A short, human-readable agreement reference, e.g. TL-7F3A-K29Q.
export function generateAgreementReference(): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const block = (len: number) =>
    Array.from(
      { length: len },
      () => alphabet[Math.floor(Math.random() * alphabet.length)],
    ).join("");
  return `TL-${block(4)}-${block(4)}`;
}
