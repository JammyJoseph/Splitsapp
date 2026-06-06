"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  sendToLock,
  remindCollaborator,
  resolveChangeRequest,
  setArchived,
} from "@/app/splits/actions";

export function SendToLockButton({ trackId }: { trackId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div>
      <button
        className="btn-primary w-full sm:w-auto"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await sendToLock(trackId);
            if (res?.error) setError(res.error);
          })
        }
      >
        {pending ? "Sending…" : "Send to Lock"}
      </button>
      {error && <p className="mt-2 text-sm text-rose-600">{error}</p>}
    </div>
  );
}

export function RemindButton({
  trackId,
  collaboratorId,
}: {
  trackId: string;
  collaboratorId: string;
}) {
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  return (
    <button
      className="text-sm font-medium text-zinc-600 hover:text-zinc-900 disabled:opacity-50"
      disabled={pending || sent}
      onClick={() =>
        start(async () => {
          await remindCollaborator(trackId, collaboratorId);
          setSent(true);
        })
      }
    >
      {sent ? "Reminder sent" : pending ? "Sending…" : "Remind"}
    </button>
  );
}

export function ResolveButton({
  trackId,
  changeRequestId,
}: {
  trackId: string;
  changeRequestId: string;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      className="btn-secondary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await resolveChangeRequest(changeRequestId, trackId);
          router.refresh();
        })
      }
    >
      {pending ? "…" : "Mark resolved"}
    </button>
  );
}

export function ArchiveButton({
  trackId,
  archived,
}: {
  trackId: string;
  archived: boolean;
}) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      className="text-sm text-zinc-400 hover:text-zinc-700"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setArchived(trackId, !archived);
          router.refresh();
        })
      }
    >
      {pending ? "…" : archived ? "Unarchive" : "Archive"}
    </button>
  );
}
