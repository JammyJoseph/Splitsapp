import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { adminEmails } from "./constants";
import type { DbUser } from "./types";

// Returns the authenticated Supabase auth user, or null.
export async function getAuthUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

// Returns the Tracklock profile for the current user, redirecting to /login
// if not authenticated.
export async function requireUser(): Promise<{
  authId: string;
  email: string;
  profile: DbUser | null;
  isAdmin: boolean;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  const email = (user.email || "").toLowerCase();
  const isAdmin =
    (profile as DbUser | null)?.user_type === "admin" ||
    adminEmails().includes(email);

  return {
    authId: user.id,
    email: user.email || "",
    profile: (profile as DbUser | null) ?? null,
    isAdmin,
  };
}

export async function requireAdmin() {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/dashboard");
  return user;
}
