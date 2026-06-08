import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTrack, spotifyConfigured } from "@/lib/spotify";
import { recordAudit } from "@/lib/audit";
import type { Track } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Daily job: for tracks being "watched", check Spotify and capture ISRC/UPC +
// flip to released once the release date has passed. Secured by CRON_SECRET
// (Vercel sends it as a Bearer token on scheduled invocations).
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`)
      return NextResponse.json({ error: "Unauthorised" }, { status: 401 });
  }
  if (!spotifyConfigured())
    return NextResponse.json({ ok: true, skipped: "spotify not configured" });

  const admin = createAdminClient();
  const { data: tracks } = await admin
    .from("tracks")
    .select("*")
    .eq("release_watch", true)
    .not("spotify_track_id", "is", null)
    .neq("release_status", "released")
    .limit(100);

  let checked = 0;
  let released = 0;
  for (const track of (tracks ?? []) as Track[]) {
    checked++;
    try {
      const t = await getTrack(track.spotify_track_id!);
      const releaseDate = t.releaseDate ? new Date(t.releaseDate) : null;
      const isReleased = !!releaseDate && releaseDate.getTime() <= Date.now();
      await admin
        .from("tracks")
        .update({
          isrc: t.isrc ?? track.isrc,
          upc: t.upc ?? track.upc,
          artwork_url: t.image ?? track.artwork_url,
          released_at:
            isReleased && releaseDate ? releaseDate.toISOString() : track.released_at,
          release_status: isReleased ? "released" : track.release_status,
          release_watch: isReleased ? false : true,
          last_release_check: new Date().toISOString(),
        })
        .eq("id", track.id);
      if (isReleased) {
        released++;
        await recordAudit(admin, {
          eventType: "collaborator_updated",
          trackId: track.id,
          actorEmail: "system:release-watch",
          eventData: { action: "went_live", isrc: t.isrc, upc: t.upc },
        });
      }
    } catch {
      await admin
        .from("tracks")
        .update({ last_release_check: new Date().toISOString() })
        .eq("id", track.id);
    }
  }

  return NextResponse.json({ ok: true, checked, released });
}
