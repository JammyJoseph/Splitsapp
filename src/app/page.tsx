import Link from "next/link";
import { Logo } from "@/components/ui";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-white to-zinc-50">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          <Link href="/login" className="btn-secondary">
            Log in
          </Link>
          <Link href="/signup" className="btn-primary">
            Get started
          </Link>
        </nav>
      </header>

      <main className="mx-auto max-w-3xl px-5 pb-24 pt-16 text-center sm:pt-24">
        <span className="badge bg-zinc-100 text-zinc-600 border-zinc-200">
          Private beta
        </span>
        <h1 className="mt-6 text-4xl font-bold leading-tight tracking-tight text-zinc-900 sm:text-6xl">
          Lock your splits before the song leaves the room.
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-lg text-zinc-500">
          Create a track. Add collaborators. Set the splits. Everyone signs.
          Split locked — with a timestamped, downloadable confirmation everyone
          can trust.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link href="/signup" className="btn-primary w-full sm:w-auto">
            Create your first split
          </Link>
          <Link href="/login" className="btn-secondary w-full sm:w-auto">
            I have an account
          </Link>
        </div>

        <div className="mt-20 grid gap-4 text-left sm:grid-cols-3">
          {[
            {
              t: "One track. One split.",
              d: "Everyone signed. No spreadsheets, screenshots or WhatsApp threads.",
            },
            {
              t: "Locked means locked.",
              d: "Immutable terms, full audit trail, and a version every time something changes.",
            },
            {
              t: "Everyone sees the same truth.",
              d: "A shared, downloadable Split Confirmation Agreement for all parties.",
            },
          ].map((f) => (
            <div key={f.t} className="card">
              <p className="font-semibold text-zinc-900">{f.t}</p>
              <p className="mt-1.5 text-sm text-zinc-500">{f.d}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="mx-auto max-w-5xl px-5 py-10 text-center text-xs text-zinc-400">
        Tracklock is a technology provider, not a law firm, and does not provide
        legal advice.
      </footer>
    </div>
  );
}
