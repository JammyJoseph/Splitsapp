import Link from "next/link";
import { AccountMenu } from "@/components/nav/AccountMenu";
import { MobileNav } from "@/components/nav/MobileNav";

export function AppHeader({
  email,
  isAdmin,
  isManager,
}: {
  email: string;
  isAdmin?: boolean;
  isManager?: boolean;
}) {
  return (
    <>
      <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-[#08080a]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-5">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-base font-bold tracking-tight text-white"
            >
              <span aria-hidden>🔒</span> Tracklock
            </Link>
            <nav className="hidden items-center gap-1 text-sm text-zinc-400 sm:flex">
              <Link href="/dashboard" className="rounded-full px-3 py-1.5 hover:bg-white/5 hover:text-white">
                Dashboard
              </Link>
              <Link href="/profile" className="rounded-full px-3 py-1.5 hover:bg-white/5 hover:text-white">
                Profile
              </Link>
              {isManager && (
                <Link href="/clients" className="rounded-full px-3 py-1.5 hover:bg-white/5 hover:text-white">
                  Clients
                </Link>
              )}
              {isAdmin && (
                <Link href="/admin" className="rounded-full px-3 py-1.5 hover:bg-white/5 hover:text-white">
                  Admin
                </Link>
              )}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/splits/new" className="btn-primary hidden px-4 py-2 text-sm sm:inline-flex">
              + New Split
            </Link>
            <AccountMenu email={email} isAdmin={isAdmin} isManager={isManager} />
          </div>
        </div>
      </header>
      <MobileNav />
    </>
  );
}
