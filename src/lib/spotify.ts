// Spotify Web API helper — app-level (Client Credentials) catalog access only.
// No user OAuth, no token storage. Used for artist claiming + track autofill.

const TOKEN_URL = "https://accounts.spotify.com/api/token";
const API = "https://api.spotify.com/v1";

export interface SpotifyArtist {
  id: string;
  name: string;
  image: string | null;
  followers: number;
  popularity: number;
  genres: string[];
  url: string;
}

export interface SpotifyTrack {
  id: string;
  name: string;
  artistNames: string;
  album: string;
  image: string | null;
  url: string;
  releaseDate: string | null;
  isrc?: string | null;
  upc?: string | null;
}

export function spotifyConfigured(): boolean {
  return !!(process.env.SPOTIFY_CLIENT_ID && process.env.SPOTIFY_CLIENT_SECRET);
}

let cached: { token: string; exp: number } | null = null;

async function getAppToken(): Promise<string> {
  if (cached && cached.exp > Date.now() + 5000) return cached.token;
  const id = process.env.SPOTIFY_CLIENT_ID;
  const secret = process.env.SPOTIFY_CLIENT_SECRET;
  if (!id || !secret) throw new Error("Spotify is not configured.");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Spotify auth failed (${res.status}).`);
  const json = (await res.json()) as { access_token: string; expires_in: number };
  cached = { token: json.access_token, exp: Date.now() + json.expires_in * 1000 };
  return json.access_token;
}

async function spotifyGet<T>(path: string): Promise<T> {
  const token = await getAppToken();
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Spotify request failed (${res.status}).`);
  return (await res.json()) as T;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapArtist(a: any): SpotifyArtist {
  return {
    id: a.id,
    name: a.name,
    image: a.images?.[0]?.url ?? null,
    followers: a.followers?.total ?? 0,
    popularity: a.popularity ?? 0,
    genres: a.genres ?? [],
    url: a.external_urls?.spotify ?? "",
  };
}

function mapTrack(t: any): SpotifyTrack {
  return {
    id: t.id,
    name: t.name,
    artistNames: (t.artists ?? []).map((x: any) => x.name).join(", "),
    album: t.album?.name ?? "",
    image: t.album?.images?.[2]?.url ?? t.album?.images?.[0]?.url ?? null,
    url: t.external_urls?.spotify ?? "",
    releaseDate: t.album?.release_date ?? null,
    isrc: t.external_ids?.isrc ?? null,
    upc: t.album?.external_ids?.upc ?? null,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export async function searchArtists(q: string, limit = 8): Promise<SpotifyArtist[]> {
  if (!q.trim()) return [];
  const data = await spotifyGet<{ artists: { items: unknown[] } }>(
    `/search?type=artist&limit=${limit}&q=${encodeURIComponent(q)}`,
  );
  return data.artists.items.map(mapArtist);
}

export async function searchTracks(q: string, limit = 8): Promise<SpotifyTrack[]> {
  if (!q.trim()) return [];
  const data = await spotifyGet<{ tracks: { items: unknown[] } }>(
    `/search?type=track&limit=${limit}&q=${encodeURIComponent(q)}`,
  );
  return data.tracks.items.map(mapTrack);
}

export async function getArtist(id: string): Promise<SpotifyArtist> {
  return mapArtist(await spotifyGet(`/artists/${id}`));
}

// Full track (includes ISRC and album UPC) — used for release metadata.
export async function getTrack(id: string): Promise<SpotifyTrack> {
  return mapTrack(await spotifyGet(`/tracks/${id}`));
}

export async function getArtistTopTracks(
  id: string,
  market = "GB",
): Promise<SpotifyTrack[]> {
  const data = await spotifyGet<{ tracks: unknown[] }>(
    `/artists/${id}/top-tracks?market=${market}`,
  );
  return data.tracks.map(mapTrack);
}
