// Sleeper implementation of FantasyProvider + UsernameLookup (DESIGN §5.3). Fetches through an
// injected HttpGetJson, validates with raw.ts, maps with map.ts. Does not own caching policy
// values (config) or how HTTP is performed (http.ts).
import { CACHE_TTL_SECONDS } from '@ffc/config';
import type { League, LeagueRef, ProviderUser, Sport } from '@ffc/domain';
import { z } from 'zod';
import { ProviderDataError, ProviderNotFoundError } from '../errors';
import type { HttpGetJson } from '../http';
import type { FantasyProvider, PartialList, UsernameLookup } from '../provider';
import { providerUrl } from '../provider-url';
import { mapLeague, mapTeams, mapUser } from './map';
import {
  SLEEPER_LIST_LIMITS,
  SleeperLeagueSchema,
  SleeperLeagueUserSchema,
  SleeperRosterSchema,
  SleeperStateSchema,
  SleeperUserSchema,
  SleeperUsernameSchema,
} from './raw';

const PROVIDER = 'sleeper' as const;

function parse<T extends z.ZodType>(schema: T, data: unknown, what: string): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) throw new ProviderDataError(PROVIDER, what);
  return result.data;
}

/** Parses each list item on its own so one malformed league can't hide the rest. */
function parseEach<T extends z.ZodType>(
  schema: T,
  data: unknown,
  max: number,
  what: string,
): PartialList<z.infer<T>> {
  const list = parse(z.array(z.unknown()).max(max), data, what);
  const items: z.infer<T>[] = [];
  for (const entry of list) {
    const result = schema.safeParse(entry);
    if (result.success) items.push(result.data);
  }
  return { items, skipped: list.length - items.length };
}

function strictList<T extends z.ZodType>(schema: T, data: unknown, max: number, what: string) {
  return parse(z.array(schema).max(max), data, what);
}

export function createSleeperProvider(get: HttpGetJson): FantasyProvider & UsernameLookup {
  const sports: readonly Sport[] = ['nfl'];

  async function getLeagueRaw(ref: LeagueRef) {
    if (ref.provider !== PROVIDER) throw new ProviderNotFoundError(PROVIDER, 'league');
    const data = await get(providerUrl(PROVIDER, ['league', ref.leagueId]), {
      ttlSeconds: CACHE_TTL_SECONDS.leagueSettings,
    });
    // Sleeper answers unknown ids with `null`, not 404.
    if (data === null) throw new ProviderNotFoundError(PROVIDER, 'league');
    const league = mapLeague(parse(SleeperLeagueSchema, data, 'league'));
    // A key whose season doesn't match the league is not this league. (Sport is always nfl
    // here: SleeperLeagueSchema only accepts nfl until basketball lands in M7.)
    if (league.ref.season !== ref.season) {
      throw new ProviderNotFoundError(PROVIDER, 'league');
    }
    return league;
  }

  return {
    id: PROVIDER,
    sports,

    async findUser(username: string): Promise<ProviderUser> {
      const parsed = SleeperUsernameSchema.safeParse(username);
      if (!parsed.success) throw new ProviderNotFoundError(PROVIDER, 'user');
      const data = await get(providerUrl(PROVIDER, ['user', parsed.data]), {
        ttlSeconds: CACHE_TTL_SECONDS.userProfile,
      });
      if (data === null) throw new ProviderNotFoundError(PROVIDER, 'user');
      return mapUser(parse(SleeperUserSchema, data, 'user'), parsed.data);
    },

    async currentSeason(sport: Sport): Promise<number> {
      const data = await get(providerUrl(PROVIDER, ['state', sport]), {
        ttlSeconds: CACHE_TTL_SECONDS.currentWeek,
      });
      const state = parse(SleeperStateSchema, data, 'state');
      return Number(state.league_season ?? state.season);
    },

    async listLeagues(user, sport, season): Promise<PartialList<League>> {
      const data = await get(
        providerUrl(PROVIDER, ['user', user.userId, 'leagues', sport, season]),
        { ttlSeconds: CACHE_TTL_SECONDS.userLeagues },
      );
      const { items, skipped } = parseEach(
        SleeperLeagueSchema,
        data ?? [],
        SLEEPER_LIST_LIMITS.leagues,
        'leagues',
      );
      return { items: items.map(mapLeague), skipped };
    },

    getLeague: getLeagueRaw,

    async getTeams(ref) {
      await getLeagueRaw(ref);
      const [rosters, users] = await Promise.all([
        get(providerUrl(PROVIDER, ['league', ref.leagueId, 'rosters']), {
          ttlSeconds: CACHE_TTL_SECONDS.rosters,
        }),
        get(providerUrl(PROVIDER, ['league', ref.leagueId, 'users']), {
          ttlSeconds: CACHE_TTL_SECONDS.leagueMembers,
        }),
      ]);
      return mapTeams(
        strictList(SleeperRosterSchema, rosters, SLEEPER_LIST_LIMITS.rosters, 'rosters'),
        strictList(SleeperLeagueUserSchema, users, SLEEPER_LIST_LIMITS.leagueUsers, 'users'),
      );
    },
  };
}
