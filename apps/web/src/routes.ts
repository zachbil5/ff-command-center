// The one home for app URLs and for parsing URL input back into typed values (DESIGN §8 R4).
// Pages and components build links here instead of with string templates.
import { ExternalIdSchema, LeagueRefSchema, SeasonSchema, type LeagueRef } from '@ffc/domain';
import { SleeperUsernameSchema } from '@ffc/providers';

export const routes = {
  home: (error?: 'invalid_username') => (error ? `/?error=${error}` : '/'),
  sleeperSearch: '/sleeper',
  sleeperUser: (username: string, season?: number) =>
    `/sleeper/${encodeURIComponent(username)}${season === undefined ? '' : `?season=${season}`}`,
  league: (ref: LeagueRef, meUserId?: string) => {
    const path = [ref.provider, ref.sport, ref.season, ref.leagueId]
      .map((part) => encodeURIComponent(String(part)))
      .join('/');
    return `/leagues/${path}${meUserId === undefined ? '' : `?me=${encodeURIComponent(meUserId)}`}`;
  },
} as const;

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
