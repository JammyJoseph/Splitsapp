"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createLegalTemplate,
  activateLegalTemplate,
  deactivateLegalTemplate,
} from "@/app/admin/actions";
import type { LegalTemplate } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function LegalTemplateManager({
  templates,
}: {
  templates: LegalTemplate[];
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [version, setVersion] = useState("");
  const [title, setTitle] = useState("Tracklock Standard Protection Terms");
  const [law, setLaw] = useState("England and Wales");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [body, setBody] = useState("");
  const [activate, setActivate] = useState(true);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-400">
          Templates are immutable. Updating terms means creating a new version —
          existing agreements keep the version attached when they were sent.
        </p>
        <button className="btn-primary" onClick={() => setOpen((o) => !o)}>
          {open ? "Close" : "New version"}
        </button>
      </div>

      {open && (
        <div className="card space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Version *</label>
              <input
                className="input"
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="e.g. 1.1"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">Title *</label>
              <input
                className="input"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Governing law</label>
              <input
                className="input"
                value={law}
                onChange={(e) => setLaw(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Effective date</label>
              <input
                type="date"
                className="input"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <label className="flex items-end gap-2 pb-3 text-sm text-zinc-300">
              <input
                type="checkbox"
                checked={activate}
                onChange={(e) => setActivate(e.target.checked)}
              />
              Activate immediately
            </label>
          </div>
          <div>
            <label className="label">Body *</label>
            <textarea
              className="input font-mono text-xs"
              rows={12}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Full legal text…"
            />
          </div>
          {error && <p className="text-sm text-rose-400">{error}</p>}
          <button
            className="btn-primary"
            disabled={pending}
            onClick={() =>
              start(async () => {
                setError(null);
                const res = await createLegalTemplate({
                  version,
                  title,
                  body,
                  governing_law: law,
                  effective_date: date,
                  activate,
                });
                if (res?.error) setError(res.error);
                else {
                  setOpen(false);
                  setVersion("");
                  setBody("");
                  router.refresh();
                }
              })
            }
          >
            {pending ? "Saving…" : "Create version"}
          </button>
        </div>
      )}

      <div className="space-y-3">
        {templates.map((t) => (
          <div key={t.id} className="card">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-semibold text-zinc-50">
                  {t.title} · v{t.version}{" "}
                  {t.active && (
                    <span className="ml-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-300">
                      Active
                    </span>
                  )}
                </p>
                <p className="text-xs text-zinc-500">
                  {t.governing_law} · effective {formatDate(t.effective_date)}
                </p>
              </div>
              <div className="flex gap-2">
                {t.active ? (
                  <button
                    className="btn-secondary"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        await deactivateLegalTemplate(t.id);
                        router.refresh();
                      })
                    }
                  >
                    Deactivate
                  </button>
                ) : (
                  <button
                    className="btn-secondary"
                    disabled={pending}
                    onClick={() =>
                      start(async () => {
                        await activateLegalTemplate(t.id);
                        router.refresh();
                      })
                    }
                  >
                    Activate
                  </button>
                )}
              </div>
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer text-sm text-zinc-400">
                View terms
              </summary>
              <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-xl bg-white/[0.03] p-3 text-xs text-zinc-300">
                {t.body}
              </pre>
            </details>
          </div>
        ))}
        {templates.length === 0 && (
          <p className="text-sm text-zinc-500">No legal templates yet.</p>
        )}
      </div>
    </div>
  );
}
