"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

const COLORS = ["#a78bfa", "#34d399", "#ffffff", "#818cf8", "#f472b6"];

// One-shot celebratory confetti burst. Dedupes per `fireKey` via sessionStorage
// so it celebrates the first time you see a locked split, not every refresh.
export function Confetti({ fireKey }: { fireKey: string }) {
  const [fire, setFire] = useState(false);

  useEffect(() => {
    const key = `tl-celebrated-${fireKey}`;
    if (typeof window === "undefined") return;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");
    setFire(true);
    try {
      navigator.vibrate?.([12, 40, 12]);
    } catch {
      /* no-op */
    }
    const t = setTimeout(() => setFire(false), 1600);
    return () => clearTimeout(t);
  }, [fireKey]);

  if (!fire) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[120] overflow-hidden">
      {Array.from({ length: 44 }).map((_, i) => {
        const angle = (Math.PI * (i / 44)) - Math.PI / 2; // fan upward
        const dist = 220 + Math.random() * 260;
        const x = Math.cos(angle) * dist * (Math.random() > 0.5 ? 1 : -1);
        const y = -Math.abs(Math.sin(angle) * dist) - Math.random() * 120;
        return (
          <motion.div
            key={i}
            initial={{ opacity: 1, x: 0, y: 0, rotate: 0 }}
            animate={{
              opacity: [1, 1, 0],
              x,
              y: [0, y, y + 320],
              rotate: Math.random() * 720 - 360,
            }}
            transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }}
            style={{
              position: "absolute",
              left: "50%",
              top: "38%",
              width: 8 + Math.random() * 6,
              height: 8 + Math.random() * 6,
              borderRadius: Math.random() > 0.5 ? "50%" : "2px",
              background: COLORS[i % COLORS.length],
            }}
          />
        );
      })}
    </div>
  );
}
