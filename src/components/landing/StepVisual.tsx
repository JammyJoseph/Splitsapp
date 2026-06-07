"use client";

import { motion } from "framer-motion";

// Abstract, on-brand product mocks for each step of the scrollytelling walk.
// Pure CSS/motion — no external assets, and reusable in the native app later.

const spring = { type: "spring" as const, stiffness: 220, damping: 26 };

function Frame({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full max-w-sm overflow-hidden rounded-[28px] border border-white/10 bg-[#0d0d10] p-4 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)]">
      <div className="mb-3 flex items-center gap-1.5 px-1">
        <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/10" />
        <span className="ml-auto text-[10px] font-medium uppercase tracking-widest text-zinc-600">
          Tracklock
        </span>
      </div>
      {children}
    </div>
  );
}

function Row({
  name,
  role,
  pct,
  i,
  signed,
}: {
  name: string;
  role: string;
  pct: number;
  i: number;
  signed?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: i * 0.08 }}
      className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
    >
      <div
        className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white"
        style={{
          background: `linear-gradient(135deg, hsl(${250 + i * 20} 70% 60%), hsl(${280 + i * 20} 70% 45%))`,
        }}
      >
        {name.charAt(0)}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-zinc-100">{name}</p>
        <p className="text-[11px] text-zinc-500">{role}</p>
      </div>
      {signed !== undefined &&
        (signed ? (
          <span className="text-xs font-semibold text-emerald-400">✓ Signed</span>
        ) : (
          <span className="text-xs text-amber-400">Pending</span>
        ))}
      <span className="w-12 text-right text-sm font-bold text-white">{pct}%</span>
    </motion.div>
  );
}

const PEOPLE = [
  { name: "Jordan", role: "Artist", pct: 40 },
  { name: "Maya", role: "Producer", pct: 35 },
  { name: "Theo", role: "Topliner", pct: 25 },
];

export function StepVisual({ step }: { step: number }) {
  return (
    <Frame>
      {step === 0 && (
        <div className="space-y-3">
          <p className="px-1 text-[11px] uppercase tracking-widest text-zinc-500">
            New Split
          </p>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={spring}
            className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
          >
            <p className="text-[11px] text-zinc-500">Track title</p>
            <p className="text-lg font-semibold text-white">Midnight Drive</p>
          </motion.div>
          <div className="grid grid-cols-2 gap-2">
            {["Artist / project", "Session date"].map((l, i) => (
              <motion.div
                key={l}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ ...spring, delay: 0.1 + i * 0.08 }}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-3 py-2.5"
              >
                <p className="text-[10px] text-zinc-500">{l}</p>
                <p className="text-xs font-medium text-zinc-300">
                  {i === 0 ? "NOVA" : "Tonight"}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-2">
          <p className="px-1 pb-1 text-[11px] uppercase tracking-widest text-zinc-500">
            Collaborators
          </p>
          {PEOPLE.map((p, i) => (
            <Row key={p.name} {...p} i={i} />
          ))}
        </div>
      )}

      {step === 2 && (
        <div className="space-y-2">
          {PEOPLE.map((p, i) => (
            <Row key={p.name} {...p} i={i} />
          ))}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...spring, delay: 0.3 }}
            className="mt-2 flex items-center justify-between rounded-xl bg-emerald-500/15 px-4 py-3"
          >
            <span className="text-sm font-semibold text-emerald-300">
              100% ready to send
            </span>
            <span className="text-lg">✓</span>
          </motion.div>
        </div>
      )}

      {step === 3 && (
        <div className="space-y-2">
          {PEOPLE.map((p, i) => (
            <Row key={p.name} {...p} i={i} signed={i < 2} />
          ))}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-2 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3"
          >
            <p className="text-[11px] text-zinc-500">Typed signature</p>
            <p className="font-[cursive] text-lg text-white">Theo Adeyemi</p>
          </motion.div>
        </div>
      )}

      {step === 4 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={spring}
          className="space-y-3 py-2 text-center"
        >
          <motion.div
            animate={{ scale: [1, 1.08, 1] }}
            transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/15 text-3xl"
          >
            🔒
          </motion.div>
          <div>
            <p className="text-lg font-bold text-white">Split Locked</p>
            <p className="font-mono text-xs text-emerald-400">TL-7F3A-K29Q</p>
          </div>
          {PEOPLE.map((p, i) => (
            <Row key={p.name} {...p} i={i} signed />
          ))}
          <div className="flex items-center justify-center gap-2 pt-1 text-xs text-zinc-400">
            <span className="rounded-lg border border-white/10 px-3 py-1.5">
              ⤓ Split Confirmation.pdf
            </span>
          </div>
        </motion.div>
      )}
    </Frame>
  );
}
