"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";

interface ConfirmOptions {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "danger";
}

const ConfirmContext = createContext<
  ((o: ConfirmOptions) => Promise<boolean>) | null
>(null);

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) throw new Error("useConfirm must be used within <ConfirmProvider>");
  return ctx;
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [opts, setOpts] = useState<ConfirmOptions | null>(null);
  const resolver = useRef<(v: boolean) => void>(() => {});

  const confirm = useCallback((o: ConfirmOptions) => {
    setOpts(o);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (v: boolean) => {
    resolver.current(v);
    setOpts(null);
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AnimatePresence>
        {opts && (
          <motion.div
            className="fixed inset-0 z-[110] flex items-end justify-center p-4 sm:items-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => close(false)}
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              initial={{ opacity: 0, y: 24, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.97 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="relative w-full max-w-sm rounded-3xl border border-white/10 bg-[#161618] p-6 shadow-[0_24px_70px_-12px_rgba(0,0,0,0.8)]"
            >
              <h3 className="text-lg font-bold tracking-tight text-white">
                {opts.title}
              </h3>
              {opts.description && (
                <p className="mt-2 text-sm leading-relaxed text-zinc-400">
                  {opts.description}
                </p>
              )}
              <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <button className="btn-secondary" onClick={() => close(false)}>
                  {opts.cancelLabel ?? "Cancel"}
                </button>
                <button
                  className={opts.variant === "danger" ? "btn-danger" : "btn-primary"}
                  onClick={() => close(true)}
                  autoFocus
                >
                  {opts.confirmLabel ?? "Confirm"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </ConfirmContext.Provider>
  );
}
