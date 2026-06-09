"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useConfirm } from "@/components/ui/Confirm";
import { refreshArtist, unlinkArtist } from "@/app/profile/actions";

export function ProfileActions() {
  const router = useRouter();
  const confirm = useConfirm();
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <button
        className="btn-secondary"
        disabled={pending}
        onClick={() => start(async () => {
          await refreshArtist();
          router.refresh();
        })}
      >
        {pending ? "…" : "Refresh stats"}
      </button>
      <button
        className="btn-ghost"
        disabled={pending}
        onClick={async () => {
          const ok = await confirm({
            title: "Disconnect Spotify?",
            description: "Your artist insights will be removed. You can reconnect anytime.",
            confirmLabel: "Disconnect",
            variant: "danger",
          });
          if (!ok) return;
          start(async () => {
            await unlinkArtist();
            router.refresh();
          });
        }}
      >
        Disconnect
      </button>
    </div>
  );
}
