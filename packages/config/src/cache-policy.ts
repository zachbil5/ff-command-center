// How long each kind of provider data stays fresh (DESIGN §3.2). The one home for TTLs;
// callers name a data kind instead of inlining seconds. Does not own the cache store.

const MINUTE = 60;
const HOUR = 60 * MINUTE;

export const CACHE_TTL_SECONDS = {
  /** Sleeper asks that the full player list be fetched at most once a day. */
  playerDatabase: 24 * HOUR,
  /** Username → user id; Sleeper ids never change. */
  userProfile: 6 * HOUR,
  userLeagues: 6 * HOUR,
  leagueSettings: 15 * MINUTE,
  leagueMembers: 15 * MINUTE,
  rosters: 15 * MINUTE,
  matchupsLive: 1 * MINUTE,
  matchupsIdle: 1 * HOUR,
  currentWeek: 15 * MINUTE,
} as const;

export type CacheDataKind = keyof typeof CACHE_TTL_SECONDS;
