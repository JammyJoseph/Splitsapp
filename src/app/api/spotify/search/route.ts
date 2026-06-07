import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchArtists, searchTracks, spotifyConfigured } from "@/lib/spotify";

// GET /api/spotify/search?type=artist|track&q=...
// Authenticated app-level Spotify catalog search.
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorised" }, { status: 401 });

  if (!spotifyConfigured())
    return NextResponse.json({ error: "Spotify is not connected." }, { status: 503 });

  const q = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  const type = request.nextUrl.searchParams.get("type") === "track" ? "track" : "artist";
  if (!q) return NextResponse.json({ results: [] });

  try {
    const results = type === "track" ? await searchTracks(q) : await searchArtists(q);
    return NextResponse.json({ results });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Search failed." },
      { status: 502 },
    );
  }
}
