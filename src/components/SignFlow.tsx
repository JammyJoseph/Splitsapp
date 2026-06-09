"use client";

import { useEffect, useState, useTransition } from "react";
import { signAgreement, requestChange, markInviteViewed } from "@/app/sign/[token]/actions";
import { useToast } from "@/components/ui/Toast";
import type { AgreementStatus } from "@/lib/types";

type View = "choose" | "sign" | "change" | "signed" | "changed";

export default function SignFlow({
  token,
  collaboratorName,
  agreementStatus,
  alreadySigned,
  reference,
}: {
  token: string;
  collaboratorName: string;
  agreementStatus: AgreementStatus;
  alreadySigned: boolean;
  reference: string;
}) {
  const [view, setView] = useState<View>(alreadySigned ? "signed" : "choose");
  const [locked, setLocked] = useState(agreementStatus === "locked");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  // Sign form state
  const [typedSignature, setTypedSignature] = useState(collaboratorName);
  const [eSig, setESig] = useState(false);
  const [terms, setTerms] = useState(false);
  const [accuracy, setAccuracy] = useState(false);

  // Change form state
  const [reason, setReason] = useState("");
  const [proposed, setProposed] = useState("");

  useEffect(() => {
    markInviteViewed(token);
  }, [token]);

  if (agreementStatus === "locked" || locked) {
    return (
      <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center">
        <p className="text-2xl">🔒</p>
        <p className="mt-2 font-semibold text-emerald-200">Split Locked</p>
        <p className="mt-1 text-sm text-emerald-300">
          Everyone signed. This split is locked. Reference {reference}.
        </p>
      </div>
    );
  }

  if (agreementStatus === "superseded") {
    return (
      <div className="mt-6 rounded-2xl border border-white/10 bg-zinc-900 p-6 text-center text-sm text-zinc-400">
        A newer version of this split was created. Ask the creator for the
        latest signing link.
      </div>
    );
  }

  if (view === "signed") {
    return (
      <div className="mt-6 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-6 text-center">
        <p className="text-2xl">✓</p>
        <p className="mt-2 font-semibold text-emerald-200">You&apos;re signed</p>
        <p className="mt-1 text-sm text-emerald-300">
          Thanks{collaboratorName ? `, ${collaboratorName.split(" ")[0]}` : ""}.
          We&apos;ll lock the split as soon as everyone has signed.
        </p>
      </div>
    );
  }

  if (view === "changed") {
    return (
      <div className="mt-6 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-6 text-center">
        <p className="mt-2 font-semibold text-amber-200">Change requested</p>
        <p className="mt-1 text-sm text-amber-300">
          The creator has been notified. They&apos;ll review and send an updated
          version for everyone to sign.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-6">
      {view === "choose" && (
        <div className="flex flex-col gap-3 sm:flex-row">
          <button className="btn-primary flex-1" onClick={() => setView("sign")}>
            Accept &amp; Sign
          </button>
          <button className="btn-secondary flex-1" onClick={() => setView("change")}>
            Request Change
          </button>
        </div>
      )}

      {view === "sign" && (
        <div className="card space-y-4">
          <h3 className="font-semibold text-zinc-50">Accept &amp; Sign</h3>
          <p className="text-sm text-zinc-300">
            I confirm that the splits shown above are accurate for this track and
            that I agree to the standard protection terms attached to this Split
            Confirmation Agreement.
          </p>
          <div>
            <label className="label">Type your full legal name</label>
            <input
              className="input font-medium"
              value={typedSignature}
              onChange={(e) => setTypedSignature(e.target.value)}
              placeholder="Your full legal name"
            />
          </div>
          <Checkbox checked={eSig} onChange={setESig}>
            I agree to use an electronic signature.
          </Checkbox>
          <Checkbox checked={terms} onChange={setTerms}>
            I agree to the standard protection terms.
          </Checkbox>
          <Checkbox checked={accuracy} onChange={setAccuracy}>
            The split information is accurate to the best of my knowledge.
          </Checkbox>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <div className="flex gap-3">
            <button className="btn-secondary" onClick={() => setView("choose")}>
              Back
            </button>
            <button
              className="btn-primary flex-1"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setError(null);
                  const res = await signAgreement(token, {
                    typedSignature,
                    acceptedESignature: eSig,
                    acceptedTerms: terms,
                    confirmedAccuracy: accuracy,
                  });
                  if (res?.error) {
                    setError(res.error);
                    toast({ title: "Couldn't sign", description: res.error, variant: "error" });
                  } else if (res?.locked) {
                    setLocked(true);
                    toast({ title: "🔒 Split locked", description: "Everyone has signed.", variant: "success" });
                  } else {
                    setView("signed");
                    toast({ title: "You're signed", description: "Thanks — we'll lock it once everyone signs.", variant: "success" });
                  }
                })
              }
            >
              {pending ? "Signing…" : "Confirm & Sign"}
            </button>
          </div>
        </div>
      )}

      {view === "change" && (
        <div className="card space-y-4">
          <h3 className="font-semibold text-zinc-50">Request a change</h3>
          <div>
            <label className="label">What needs to change? *</label>
            <textarea
              className="input"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. My split should be 30%, not 25%."
            />
          </div>
          <div>
            <label className="label">Proposed correction (optional)</label>
            <textarea
              className="input"
              rows={2}
              value={proposed}
              onChange={(e) => setProposed(e.target.value)}
              placeholder="e.g. Move 5% from the topliner to me."
            />
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}

          <div className="flex gap-3">
            <button className="btn-secondary" onClick={() => setView("choose")}>
              Back
            </button>
            <button
              className="btn-primary flex-1"
              disabled={pending}
              onClick={() =>
                start(async () => {
                  setError(null);
                  const res = await requestChange(token, {
                    reason,
                    proposedChange: proposed,
                  });
                  if (res?.error) {
                    setError(res.error);
                    toast({ title: "Couldn't send", description: res.error, variant: "error" });
                  } else {
                    setView("changed");
                    toast({ title: "Change requested", description: "The creator has been notified.", variant: "info" });
                  }
                })
              }
            >
              {pending ? "Sending…" : "Send change request"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Checkbox({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 text-sm text-zinc-300">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-white/20"
      />
      <span>{children}</span>
    </label>
  );
}
