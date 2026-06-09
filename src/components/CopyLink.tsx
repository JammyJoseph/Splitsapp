"use client";

import { useState } from "react";
import { useToast } from "@/components/ui/Toast";

export function CopyLink({ url, label = "Copy share link" }: { url: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const toast = useToast();
  return (
    <button
      className="btn-secondary"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(url);
          setCopied(true);
          toast({ title: "Link copied", description: url, variant: "success" });
          setTimeout(() => setCopied(false), 2000);
        } catch {
          toast({ title: "Couldn't copy", variant: "error" });
        }
      }}
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
