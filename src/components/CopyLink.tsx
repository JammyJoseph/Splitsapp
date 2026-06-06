"use client";

import { useState } from "react";

export function CopyLink({ url, label = "Copy share link" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="btn-secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          /* ignore */
        }
      }}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
