"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/Toast";
import {
  sendToLock,
  remindCollaborator,
  resolveChangeRequest,
  setArchived,
} from "@/app/splits/actions";

export function SendToLockButton({ trackId }: { trackId: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();
  return (
    <div>
      <button
        className="btn-primary w-full sm:w-auto"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            const res = await sendToLock(trackId);
            // On success the action redirects; we only reach here on error.
            if (res?.error) {
              setError(res.error);
              toast({ title: "Couldn't send", description: res.error, variant: "error" });
            }
          })
        }
      >
        {pending ? "Sending…" : "Send to Lock"}
      </button>
      {error && <p className="mt-2 text-sm text-rose-400">{error}</p>}
    </div>
  );
}

export function RemindButton({
  trackId,
  collaboratorId,
  name,
}: {
  trackId: string;
  collaboratorId: string;
  name?: string;
}) {
  const [pending, start] = useTransition();
  const [sent, setSent] = useState(false);
  const toast = useToast();
  return (
    <button
      className="text-sm font-medium text-zinc-300 hover:text-white disabled:opacity-50"
      disabled={pending || sent}
      onClick={() =>
        start(async () => {
          const res = await remindCollaborator(trackId, collaboratorId);
          if (res?.error) {
            toast({ title: "Couldn't send reminder", description: res.error, variant: "error" });
          } else {
            setSent(true);
            toast({
              title: "Reminder sent",
              description: name ? `We nudged ${name}.` : undefined,
              variant: "success",
            });
          }
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
  const toast = useToast();
  return (
    <button
      className="btn-secondary"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await resolveChangeRequest(changeRequestId, trackId);
          toast({ title: "Marked resolved", variant: "success" });
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
  const toast = useToast();
  return (
    <button
      className="text-sm text-zinc-500 hover:text-zinc-200"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await setArchived(trackId, !archived);
          toast({
            title: archived ? "Restored" : "Archived",
            variant: "success",
          });
          router.refresh();
        })
      }
    >
      {pending ? "…" : archived ? "Unarchive" : "Archive"}
    </button>
  );
}
