"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence, type Variants } from "framer-motion";
const EASE: [number, number, number, number] = [0.16, 1, 0.3, 1];
import { StepVisual } from "./StepVisual";

const STEPS = [
  {
    kicker: "01 — Create",
    title: "Start with the track.",
    body: "Title, artist, session date, a private audio link. No publishing-law jargon — just the song.",
  },
  {
    kicker: "02 — Collaborators",
    title: "Add everyone in the room.",
    body: "Artists, producers, writers, topliners. The people who made it, however you describe them.",
  },
  {
    kicker: "03 — Splits",
    title: "Agree the percentages.",
    body: "Set what everyone agreed. It has to total exactly 100% before it can leave the room.",
  },
  {
    kicker: "04 — Sign",
    title: "Everyone confirms.",
    body: "A secure link, a typed signature, three taps. Accept & sign — or request a change.",
  },
  {
    kicker: "05 — Locked",
    title: "Split locked. Forever.",
    body: "Timestamped, immutable, with a downloadable confirmation every party can trust.",
  },
];

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export default function Landing() {
  const [active, setActive] = useState(0);

  return (
    <div className="relative overflow-clip">
      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute left-1/2 top-[-10%] h-[600px] w-[800px] -translate-x-1/2 rounded-full bg-violet-600/20 blur-[140px]" />
        <div className="absolute bottom-[10%] right-[-10%] h-[400px] w-[500px] rounded-full bg-indigo-700/10 blur-[120px]" />
      </div>

      {/* Nav */}
      <header className="fixed inset-x-0 top-0 z-50">
        <div className="glass mx-auto mt-3 flex max-w-5xl items-center justify-between rounded-full border px-4 py-2.5 sm:px-5">
          <span className="flex items-center gap-2 text-base font-bold tracking-tight">
            <span>🔒</span> Tracklock
          </span>
          <nav className="flex items-center gap-2">
            <Link href="/login" className="btn-ghost rounded-full px-4 py-2 text-sm">
              Log in
            </Link>
            <Link href="/signup" className="btn-primary px-4 py-2 text-sm">
              Get started
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto flex max-w-5xl flex-col items-center px-5 pb-24 pt-36 text-center sm:pt-44">
        <motion.span
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="badge border-white/10 bg-white/5 text-zinc-400"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400" /> Private beta
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: EASE }}
          className="mt-6 max-w-3xl text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl"
        >
          Lock your splits
          <br />
          <span className="text-gradient">before the song</span>
          <br />
          leaves the room.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1, ease: EASE }}
          className="mt-7 max-w-xl text-lg text-zinc-400"
        >
          Create a track. Add collaborators. Set the splits. Everyone signs.
          Split locked — with a timestamped confirmation every party can trust.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-9 flex w-full flex-col items-center justify-center gap-3 sm:w-auto sm:flex-row"
        >
          <Link href="/signup" className="btn-primary w-full px-7 sm:w-auto">
            Create your first split
          </Link>
          <Link href="/login" className="btn-secondary w-full px-7 sm:w-auto">
            I have an account
          </Link>
        </motion.div>

        {/* Floating hero mock */}
        <motion.div
          initial={{ opacity: 0, y: 40, rotateX: 12 }}
          animate={{ opacity: 1, y: 0, rotateX: 0 }}
          transition={{ duration: 1, delay: 0.3, ease: EASE }}
          className="mt-16 [perspective:1200px]"
        >
          <motion.div
            animate={{ y: [0, -10, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          >
            <StepVisual step={4} />
          </motion.div>
        </motion.div>
      </section>

      {/* Scrollytelling walkthrough */}
      <section className="mx-auto max-w-5xl px-5 py-20">
        <motion.p
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mb-2 text-center text-sm font-semibold uppercase tracking-widest text-violet-400"
        >
          How it works
        </motion.p>
        <motion.h2
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mx-auto mb-20 max-w-2xl text-center text-3xl font-bold tracking-tight sm:text-5xl"
        >
          One track. One split. Everyone signed.
        </motion.h2>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* Sticky visual */}
          <div className="hidden lg:block">
            <div className="sticky top-32 flex h-[420px] items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={active}
                  initial={{ opacity: 0, scale: 0.96, y: 12 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96, y: -12 }}
                  transition={{ duration: 0.4, ease: EASE }}
                >
                  <StepVisual step={active} />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Step copy — each block updates the active visual as it enters view */}
          <div>
            {STEPS.map((s, i) => (
              <motion.div
                key={s.kicker}
                onViewportEnter={() => setActive(i)}
                viewport={{ margin: "-45% 0px -45% 0px" }}
                className="flex min-h-[60vh] flex-col justify-center lg:min-h-[80vh]"
              >
                <motion.div
                  variants={fadeUp}
                  initial="hidden"
                  whileInView="show"
                  viewport={{ once: true, margin: "-20%" }}
                >
                  <p className="text-sm font-semibold uppercase tracking-widest text-violet-400">
                    {s.kicker}
                  </p>
                  <h3 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                    {s.title}
                  </h3>
                  <p className="mt-4 max-w-md text-lg text-zinc-400">{s.body}</p>

                  {/* Inline visual on mobile */}
                  <div className="mt-8 flex justify-center lg:hidden">
                    <StepVisual step={i} />
                  </div>
                </motion.div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="mx-auto max-w-5xl px-5 py-20">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { t: "Locked means locked.", d: "Immutable terms, a full audit trail, and a new version every time something changes." },
            { t: "Everyone sees the same truth.", d: "A shared, downloadable Split Confirmation Agreement for every party." },
            { t: "We never take your music.", d: "Tracklock is a technology provider — not a publisher, label, or rights owner." },
          ].map((f, i) => (
            <motion.div
              key={f.t}
              variants={fadeUp}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              transition={{ delay: i * 0.1 }}
              className="card-elevated"
            >
              <p className="text-lg font-semibold text-white">{f.t}</p>
              <p className="mt-2 text-sm text-zinc-400">{f.d}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-5 py-28 text-center">
        <motion.h2
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="text-4xl font-bold tracking-tight sm:text-6xl"
        >
          Make the spreadsheet
          <br />
          <span className="text-gradient">obsolete.</span>
        </motion.h2>
        <motion.div
          variants={fadeUp}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true }}
          className="mt-9"
        >
          <Link href="/signup" className="btn-primary px-8 py-4 text-base">
            Lock your first split
          </Link>
        </motion.div>
      </section>

      <footer className="border-t border-white/[0.06] py-10 text-center text-xs text-zinc-600">
        Tracklock is a technology provider, not a law firm, and does not provide
        legal advice.
      </footer>
    </div>
  );
}
