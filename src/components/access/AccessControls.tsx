"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { requestAccess, respondToAccess, revokeAccess } from "@/app/clients/actions";
import type { AccountAccessScope } from "@/lib/types";

export function RequestAccessForm() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [email, setEmail] = useState("");
  const [scope, setScope] = useState<AccountAccessScope>("view");
  const [message, setMessage] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  return (
    <div className="card space-y-3">
      <h2 className="font-semibold text-white">Request access to an artist</h2>
      <p className="text-sm text-zinc-500">
        Ask a producer or artist to let you view (or manage) their splits and
        catalogue. They approve from their profile.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          className="input"
          type="email"
          placeholder="artist@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <select
          className="input"
          value={scope}
          onChange={(e) => setScope(e.target.value as AccountAccessScope)}
        >
          <option value="view">View only (catalogue + earnings)</option>
          <option value="manage">Manage (create &amp; manage splits)</option>
        </select>
      </div>
      <textarea
        className="input"
        rows={2}
        placeholder="Add a note (optional)"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />
      {error && <p className="text-sm text-rose-400">{error}</p>}
      {done && <p className="text-sm text-emerald-400">Request sent.</p>}
      <button
        className="btn-primary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null);
            setDone(false);
            const res = await requestAccess(email, scope, message);
            if (res?.error) setError(res.error);
            else {
              setDone(true);
              setEmail("");
              setMessage("");
              router.refresh();
            }
          })
        }
      >
        {pending ? "Sending…" : "Send request"}
      </button>
    </div>
  );
}

export function RespondButtons({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      <button
        className="btn-primary"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await respondToAccess(id, true);
            router.refresh();
          })
        }
      >
        Approve
      </button>
      <button
        className="btn-ghost"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await respondToAccess(id, false);
            router.refresh();
          })
        }
      >
        Decline
      </button>
    </div>
  );
}

export function RevokeButton({ id, label = "Revoke" }: { id: string; label?: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      className="text-sm text-zinc-500 hover:text-rose-300"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await revokeAccess(id);
          router.refresh();
        })
      }
    >
      {pending ? "…" : label}
    </button>
  );
}
