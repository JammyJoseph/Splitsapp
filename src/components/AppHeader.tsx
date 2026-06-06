import Link from "next/link";
import { Logo } from "@/components/ui";

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
    <header className="sticky top-0 z-20 border-b border-zinc-200 bg-white/80 backdrop-blur">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-5">
          <Logo className="text-base" />
          <nav className="hidden items-center gap-4 text-sm text-zinc-500 sm:flex">
            <Link href="/dashboard" className="hover:text-zinc-900">
              Dashboard
            </Link>
            {isManager && (
              <Link href="/clients" className="hover:text-zinc-900">
                Clients
              </Link>
            )}
            {isAdmin && (
              <Link href="/admin" className="hover:text-zinc-900">
                Admin
              </Link>
            )}
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden text-xs text-zinc-400 sm:inline">{email}</span>
          <form action="/auth/signout" method="post">
            <button className="text-sm text-zinc-500 hover:text-zinc-900">
              Sign out
            </button>
          </form>
        </div>
      </div>
    </header>
  );
}
