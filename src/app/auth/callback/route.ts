import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Handles the redirect from magic-link / email-confirmation flows.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");
  const redirect = searchParams.get("redirect") || "/dashboard";

  const supabase = await createClient();

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(`${origin}${redirect}`);
  } else if (tokenHash && type) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: type as any,
    });
    if (!error) return NextResponse.redirect(`${origin}${redirect}`);
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}
