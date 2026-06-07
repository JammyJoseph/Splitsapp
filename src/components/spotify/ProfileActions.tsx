"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { refreshArtist, unlinkArtist } from "@/app/profile/actions";

export function ProfileActions() {
  const router = useRouter();
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
        onClick={() => start(async () => {
          await unlinkArtist();
          router.refresh();
        })}
      >
        Disconnect
      </button>
    </div>
  );
}
