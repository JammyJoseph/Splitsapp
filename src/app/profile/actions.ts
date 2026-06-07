"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getArtist } from "@/lib/spotify";

// Link (or re-link) the user's Spotify artist profile by artist id.
export async function linkArtist(spotifyArtistId: string) {
  const user = await requireUser();
  const supabase = await createClient();

  let artist;
  try {
    artist = await getArtist(spotifyArtistId);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Could not fetch artist." };
  }

  const { error } = await supabase.from("artist_profiles").upsert(
    {
      user_id: user.authId,
      spotify_artist_id: artist.id,
      name: artist.name,
      image_url: artist.image,
      followers: artist.followers,
      popularity: artist.popularity,
      genres: artist.genres,
      spotify_url: artist.url,
      raw: artist as unknown as Record<string, unknown>,
    },
    { onConflict: "user_id" },
  );
  if (error) return { error: error.message };

  revalidatePath("/profile");
  return { ok: true };
}

export async function refreshArtist() {
  const user = await requireUser();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("artist_profiles")
    .select("spotify_artist_id")
    .eq("user_id", user.authId)
    .maybeSingle();
  if (!profile?.spotify_artist_id) return { error: "No linked artist." };
  return linkArtist(profile.spotify_artist_id);
}

export async function unlinkArtist() {
  const user = await requireUser();
  const supabase = await createClient();
  await supabase.from("artist_profiles").delete().eq("user_id", user.authId);
  revalidatePath("/profile");
  return { ok: true };
}
