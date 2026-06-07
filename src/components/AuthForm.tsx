"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/ui";
import type { UserType } from "@/lib/types";

type Mode = "login" | "signup";

const USER_TYPES: { value: UserType; label: string; hint: string }[] = [
  { value: "creator", label: "Creator", hint: "Artist, producer, writer, engineer…" },
  { value: "manager", label: "Manager", hint: "Manage splits for multiple clients" },
  { value: "organisation", label: "Label / Publisher", hint: "Team account" },
];

export default function AuthForm({ mode }: { mode: Mode }) {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get("redirect") || "/dashboard";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [userType, setUserType] = useState<UserType>("creator");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const supabase = createClient();
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name, user_type: userType },
            emailRedirectTo: `${origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
          },
        });
        if (error) throw error;
        setInfo(
          "Check your email to confirm your account, then log in. (If confirmations are disabled, you can log in now.)",
        );
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push(redirect);
        router.refresh();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  async function handleMagicLink() {
    if (!email) {
      setError("Enter your email first.");
      return;
    }
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: mode === "signup",
          data: mode === "signup" ? { name, user_type: userType } : undefined,
          emailRedirectTo: `${origin}/auth/callback?redirect=${encodeURIComponent(redirect)}`,
        },
      });
      if (error) throw error;
      setInfo("Magic link sent — check your email to finish signing in.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Logo className="text-xl" />
          <h1 className="mt-6 text-2xl font-bold tracking-tight text-white">
            {mode === "signup" ? "Create your account" : "Welcome back"}
          </h1>
          <p className="mt-1.5 text-sm text-zinc-400">
            {mode === "signup"
              ? "Start locking splits in minutes."
              : "Log in to manage your splits."}
          </p>
        </div>

        <form onSubmit={handlePassword} className="card space-y-4">
          {mode === "signup" && (
            <>
              <div>
                <label className="label">Your name</label>
                <input
                  className="input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jordan Smith"
                  required
                />
              </div>
              <div>
                <label className="label">Account type</label>
                <div className="grid gap-2">
                  {USER_TYPES.map((t) => (
                    <button
                      type="button"
                      key={t.value}
                      onClick={() => setUserType(t.value)}
                      className={`rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                        userType === t.value
                          ? "border-violet-400/60 bg-violet-500/10"
                          : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <span className="font-medium text-white">{t.label}</span>
                      <span className="ml-2 text-xs text-zinc-500">{t.hint}</span>
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@studio.com"
              required
            />
          </div>
          <div>
            <label className="label">Password</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              minLength={6}
              required
            />
          </div>

          {error && <p className="text-sm text-rose-400">{error}</p>}
          {info && <p className="text-sm text-emerald-400">{info}</p>}

          <button type="submit" className="btn-primary w-full" disabled={busy}>
            {busy
              ? "Working…"
              : mode === "signup"
                ? "Create account"
                : "Log in"}
          </button>
          <button
            type="button"
            onClick={handleMagicLink}
            className="btn-secondary w-full"
            disabled={busy}
          >
            Email me a magic link
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-zinc-400">
          {mode === "signup" ? (
            <>
              Already have an account?{" "}
              <Link href="/login" className="font-medium text-white underline">
                Log in
              </Link>
            </>
          ) : (
            <>
              New to Tracklock?{" "}
              <Link href="/signup" className="font-medium text-white underline">
                Create an account
              </Link>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
