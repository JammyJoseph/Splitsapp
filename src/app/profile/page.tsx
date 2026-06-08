import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AppHeader } from "@/components/AppHeader";
import { ArtistSearch } from "@/components/spotify/ArtistSearch";
import { ProfileActions } from "@/components/spotify/ProfileActions";
import { RespondButtons } from "@/components/access/AccessControls";
import { getArtistTopTracks, type SpotifyTrack } from "@/lib/spotify";
import type { AccountAccess } from "@/lib/types";

export const dynamic = "force-dynamic";

interface ArtistProfile {
  spotify_artist_id: string | null;
  name: string | null;
  image_url: string | null;
  followers: number | null;
  popularity: number | null;
  genres: string[] | null;
  spotify_url: string | null;
}

export default async function ProfilePage() {
  const user = await requireUser();
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("artist_profiles")
    .select("spotify_artist_id, name, image_url, followers, popularity, genres, spotify_url")
    .eq("user_id", user.authId)
    .maybeSingle<ArtistProfile>();

  let topTracks: SpotifyTrack[] = [];
  if (profile?.spotify_artist_id) {
    try {
      topTracks = (await getArtistTopTracks(profile.spotify_artist_id)).slice(0, 5);
    } catch {
      /* non-fatal */
    }
  }

  // Incoming requests from managers wanting access to my account.
  const { data: reqRows } = await supabase
    .from("account_access")
    .select("*")
    .eq("status", "pending");
  const incoming = ((reqRows ?? []) as AccountAccess[]).filter(
    (r) => r.manager_user_id !== user.authId,
  );
  const managerNames = new Map<string, string>();
  if (incoming.length) {
    const admin = createAdminClient();
    const { data: mgrs } = await admin
      .from("users")
      .select("id, name, email")
      .in(
        "id",
        incoming.map((r) => r.manager_user_id),
      );
    for (const m of mgrs ?? []) managerNames.set(m.id, m.name || m.email);
  }

  const isManager = user.profile?.user_type === "manager";

  return (
    <div className="min-h-screen">
      <AppHeader email={user.email} isAdmin={user.isAdmin} isManager={isManager} />
      <main className="mx-auto max-w-2xl px-4 py-10">
        <h1 className="text-3xl font-bold tracking-tight text-white">Profile</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Your artist credentials. Linking Spotify shows verified, public
          insights — it never affects your splits.
        </p>

        {/* Account */}
        <div className="card mt-6">
          <p className="text-xs uppercase tracking-wide text-zinc-500">Account</p>
          <p className="mt-1 font-medium text-white">{user.profile?.name || "—"}</p>
          <p className="text-sm text-zinc-400">{user.email}</p>
        </div>

        {/* Access requests */}
        {incoming.length > 0 && (
          <div className="mt-6">
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-amber-300">
              Access requests
            </h2>
            <div className="space-y-3">
              {incoming.map((r) => (
                <div key={r.id} className="card-elevated">
                  <p className="text-sm text-zinc-200">
                    <span className="font-semibold text-white">
                      {managerNames.get(r.manager_user_id) ?? "A manager"}
                    </span>{" "}
                    wants <strong>{r.scope === "manage" ? "manage" : "view"}</strong> access
                    to your splits &amp; catalogue.
                  </p>
                  {r.message && (
                    <p className="mt-2 rounded-lg bg-white/[0.03] px-3 py-2 text-sm text-zinc-400">
                      “{r.message}”
                    </p>
                  )}
                  <div className="mt-3">
                    <RespondButtons id={r.id} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Spotify */}
        <div className="mt-6">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-emerald-400">●</span>
            <h2 className="text-sm font-semibold uppercase tracking-wider text-zinc-500">
              Spotify
            </h2>
          </div>

          {!profile?.spotify_artist_id ? (
            <ArtistSearch />
          ) : (
            <div className="card-elevated">
              <div className="flex items-center gap-4">
                {profile.image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={profile.image_url}
                    alt=""
                    className="h-20 w-20 rounded-2xl object-cover"
                  />
                ) : (
                  <div className="h-20 w-20 rounded-2xl bg-white/10" />
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xl font-bold text-white">
                    {profile.name}
                  </p>
                  <p className="text-sm text-zinc-400">
                    {(profile.followers ?? 0).toLocaleString()} followers
                  </p>
                  {profile.genres && profile.genres.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {profile.genres.slice(0, 3).map((g) => (
                        <span
                          key={g}
                          className="badge border-white/10 bg-white/5 text-zinc-400"
                        >
                          {g}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Popularity */}
              <div className="mt-5">
                <div className="mb-1 flex items-center justify-between text-xs text-zinc-500">
                  <span>Spotify popularity</span>
                  <span className="text-zinc-300">{profile.popularity ?? 0}/100</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-400"
                    style={{ width: `${profile.popularity ?? 0}%` }}
                  />
                </div>
              </div>

              {/* Top tracks */}
              {topTracks.length > 0 && (
                <div className="mt-5">
                  <p className="mb-2 text-xs uppercase tracking-wide text-zinc-500">
                    Top tracks
                  </p>
                  <div className="space-y-1">
                    {topTracks.map((t, i) => (
                      <a
                        key={t.id}
                        href={t.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-3 rounded-xl px-2 py-2 transition hover:bg-white/[0.03]"
                      >
                        <span className="w-4 text-sm text-zinc-600">{i + 1}</span>
                        {t.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={t.image} alt="" className="h-9 w-9 rounded object-cover" />
                        ) : (
                          <div className="h-9 w-9 rounded bg-white/10" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm text-white">{t.name}</p>
                          <p className="truncate text-xs text-zinc-500">{t.album}</p>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4">
                {profile.spotify_url && (
                  <a
                    href={profile.spotify_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-emerald-400 hover:underline"
                  >
                    Open on Spotify ↗
                  </a>
                )}
                <ProfileActions />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
