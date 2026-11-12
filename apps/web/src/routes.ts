// The one home for app URLs and for parsing URL input back into typed values (DESIGN §8 R4).
// Pages and components build links here instead of with string templates.
import {
  ExternalIdSchema,
  LeagueRefSchema,
  SeasonSchema,
  weekSchema,
  type LeagueRef,
  type Sport,
} from '@ffc/domain';
import { SleeperUsernameSchema } from '@ffc/providers';

/** `?a=1&b=2` from the defined entries only; '' when none. */
function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.set(key, String(value));
  }
  const text = search.toString();
  return text === '' ? '' : `?${text}`;
}

export const routes = {
  home: (error?: 'invalid_username') => `/${query({ error })}`,
  signIn: (error?: string) => `/sign-in${query({ error })}`,
  settings: (status?: SettingsStatus) => `/settings${query({ status })}`,
  invites: (status?: string) => `/invites${query({ status })}`,
  authApi: '/api/auth',
  sleeperSearch: '/sleeper',
  sleeperUser: (username: string, season?: number) =>
    `/sleeper/${encodeURIComponent(username)}${query({ season })}`,
  myMatchups: (username: string, week?: number) =>
    `/sleeper/${encodeURIComponent(username)}/matchups${query({ week })}`,
  league: (
    ref: LeagueRef,
    options: { me?: string | undefined; week?: number | undefined } = {},
  ) => {
    const path = [ref.provider, ref.sport, ref.season, ref.leagueId]
      .map((part) => encodeURIComponent(String(part)))
      .join('/');
    return `/leagues/${path}${query({ me: options.me, week: options.week })}`;
  },
} as const;

/** Outcome codes the settings page shows after a form submit. */
export type SettingsStatus = 'linked' | 'unlinked' | 'not_found' | 'unavailable' | 'invalid';

/** Paths reachable without a session (DESIGN §6.1). Everything else redirects to sign-in. */
export const PUBLIC_PATH_PREFIXES = [
  '/sign-in',
  '/api/auth',
  '/api/health',
  '/manifest.webmanifest',
] as const;

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/** Optional `?week=` value valid for the sport; null means "the default week". */
export function parseWeek(value: unknown, sport: Sport): number | null {
  if (typeof value !== 'string' || !/^\d{1,2}$/.test(value)) return null;
  const result = weekSchema(sport).safeParse(Number(value));
  return result.success ? result.data : null;
}

/** Parse a username from a form or URL; null when it isn't a valid Sleeper username. */
export function parseSleeperUsername(value: unknown): string | null {
  const result = SleeperUsernameSchema.safeParse(value);
  return result.success ? result.data : null;
}

/** Optional `?season=` value; null means "current season". Invalid values are ignored. */
export function parseSeason(value: unknown): number | null {
  if (typeof value !== 'string' || !/^\d{4}$/.test(value)) return null;
  const result = SeasonSchema.safeParse(Number(value));
  return result.success ? result.data : null;
}

/** League route params → LeagueRef, or null when any part is invalid. */
export function parseLeagueParams(params: {
  provider: string;
  sport: string;
  season: string;
  leagueId: string;
}): LeagueRef | null {
  const season = parseSeason(params.season);
  if (season === null) return null;
  const result = LeagueRefSchema.safeParse({ ...params, season });
  return result.success ? result.data : null;
}

/** Optional `?me=` user id used only to highlight a row; never fetched or rendered. */
export function parseMe(value: unknown): string | null {
  const result = ExternalIdSchema.safeParse(value);
  return result.success ? result.data : null;
}
