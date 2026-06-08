"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { getTrack, spotifyConfigured } from "@/lib/spotify";
import { recordAudit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Track } from "@/lib/types";

async function ownedTrack(trackId: string) {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: track } = await supabase
    .from("tracks")
    .select("*")
    .eq("id", trackId)
    .single<Track>();
  if (!track) throw new Error("Track not found.");
  if (track.created_by_user_id !== user.authId && !user.isAdmin)
    throw new Error("Only the creator can do that.");
  return { user, supabase, track };
}

// Save the uploaded audio's storage path on the track.
export async function setTrackAudio(trackId: string, path: string) {
  const { supabase } = await ownedTrack(trackId);
  const { error } = await supabase
    .from("tracks")
    .update({ audio_path: path })
    .eq("id", trackId);
  if (error) return { error: error.message };
  revalidatePath(`/splits/${trackId}`);
  return { ok: true };
}

export async function removeTrackAudio(trackId: string) {
  const { supabase, track } = await ownedTrack(trackId);
  if (track.audio_path) {
    await supabase.storage.from("track-audio").remove([track.audio_path]);
  }
  await supabase.from("tracks").update({ audio_path: null }).eq("id", trackId);
  revalidatePath(`/splits/${trackId}`);
  return { ok: true };
}

export async function setReleaseWatch(trackId: string, watch: boolean) {
  const { supabase } = await ownedTrack(trackId);
  await supabase.from("tracks").update({ release_watch: watch }).eq("id", trackId);
  revalidatePath(`/splits/${trackId}`);
  return { ok: true };
}

// Pull ISRC / UPC / artwork / release date from the linked Spotify track.
export async function syncReleaseFromSpotify(trackId: string) {
  const { user, supabase, track } = await ownedTrack(trackId);
  if (!spotifyConfigured()) return { error: "Spotify is not connected." };
  if (!track.spotify_track_id)
    return { error: "Link a Spotify track first (edit the split and search Spotify)." };

  let t;
  try {
    t = await getTrack(track.spotify_track_id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Spotify lookup failed." };
  }

  const releaseDate = t.releaseDate ? new Date(t.releaseDate) : null;
  const isReleased = !!releaseDate && releaseDate.getTime() <= Date.now();

  await supabase
    .from("tracks")
    .update({
      isrc: t.isrc ?? track.isrc,
      upc: t.upc ?? track.upc,
      artwork_url: t.image ?? track.artwork_url,
      released_at: isReleased && releaseDate ? releaseDate.toISOString() : track.released_at,
      release_status: isReleased ? "released" : track.release_status,
      last_release_check: new Date().toISOString(),
    })
    .eq("id", trackId);

  await recordAudit(createAdminClient(), {
    eventType: "collaborator_updated",
    trackId,
    actorUserId: user.authId,
    actorEmail: user.email,
    eventData: { action: "release_synced", isrc: t.isrc, upc: t.upc, released: isReleased },
  });

  revalidatePath(`/splits/${trackId}`);
  return { ok: true, isrc: t.isrc, upc: t.upc, released: isReleased };
}
