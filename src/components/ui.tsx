import Link from "next/link";
import { cn } from "@/lib/utils";
import { STATUS_BADGE } from "@/lib/constants";

export function Logo({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "inline-flex items-center gap-2 text-lg font-bold tracking-tight text-zinc-900",
        className,
      )}
    >
      <span aria-hidden>🔒</span> Tracklock
    </Link>
  );
}

export function Badge({
  status,
  label,
}: {
  status: string;
  label: string;
}) {
  const cls = STATUS_BADGE[status] ?? STATUS_BADGE.draft;
  return <span className={cn("badge", cls)}>{label}</span>;
}

export function EmptyState({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-zinc-200 bg-white/50 p-10 text-center">
      <p className="text-base font-semibold text-zinc-900">{title}</p>
      {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="mt-1.5 text-sm text-rose-600">{message}</p>;
}
