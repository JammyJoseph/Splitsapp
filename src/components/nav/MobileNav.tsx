"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ICONS = {
  dashboard: (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2">
      <path d="M3 10.5 12 4l9 6.5M5 9.5V20h14V9.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  profile: (
    <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="8" r="3.5" /><path d="M5 20c0-3.5 3-6 7-6s7 2.5 7 6" strokeLinecap="round" />
    </svg>
  ),
};

export function MobileNav() {
  const pathname = usePathname();
  const isActive = (p: string) =>
    p === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(p);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-white/[0.08] bg-[#08080a]/90 backdrop-blur-xl pb-[env(safe-area-inset-bottom)] sm:hidden">
      <div className="mx-auto flex max-w-md items-center justify-around px-6 py-2">
        <Tab href="/dashboard" active={isActive("/dashboard")} label="Home">
          {ICONS.dashboard}
        </Tab>

        <Link
          href="/splits/new"
          className="flex h-12 w-12 -translate-y-3 items-center justify-center rounded-2xl bg-white text-zinc-950 shadow-lg shadow-violet-500/20 transition active:scale-95"
          aria-label="New split"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" stroke="currentColor" strokeWidth="2.5">
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
        </Link>

        <Tab href="/profile" active={isActive("/profile")} label="Profile">
          {ICONS.profile}
        </Tab>
      </div>
    </nav>
  );
}

function Tab({
  href,
  active,
  label,
  children,
}: {
  href: string;
  active: boolean;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center gap-0.5 px-4 py-1 text-[10px] font-medium transition-colors ${
        active ? "text-white" : "text-zinc-500"
      }`}
    >
      {children}
      {label}
    </Link>
  );
}
