"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export function AccountMenu({
  email,
  isAdmin,
  isManager,
}: {
  email: string;
  isAdmin?: boolean;
  isManager?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const initial = (email || "?").charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-indigo-600 text-sm font-bold text-white ring-1 ring-white/10 transition hover:ring-white/30"
        aria-label="Account menu"
      >
        {initial}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.97 }}
              transition={{ duration: 0.16 }}
              className="absolute right-0 z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-white/10 bg-[#161618] p-1.5 shadow-[0_16px_50px_-12px_rgba(0,0,0,0.8)]"
            >
              <div className="px-3 py-2">
                <p className="text-xs text-zinc-500">Signed in as</p>
                <p className="truncate text-sm font-medium text-white">{email}</p>
              </div>
              <div className="my-1 h-px bg-white/[0.06]" />
              <MenuLink href="/dashboard" onClick={() => setOpen(false)}>Dashboard</MenuLink>
              <MenuLink href="/profile" onClick={() => setOpen(false)}>Profile</MenuLink>
              {isManager && <MenuLink href="/clients" onClick={() => setOpen(false)}>Clients</MenuLink>}
              {isAdmin && <MenuLink href="/admin" onClick={() => setOpen(false)}>Admin</MenuLink>}
              <div className="my-1 h-px bg-white/[0.06]" />
              <form action="/auth/signout" method="post">
                <button className="w-full rounded-lg px-3 py-2 text-left text-sm text-zinc-400 transition hover:bg-white/5 hover:text-white">
                  Sign out
                </button>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="block rounded-lg px-3 py-2 text-sm text-zinc-200 transition hover:bg-white/5 hover:text-white"
    >
      {children}
    </Link>
  );
}
