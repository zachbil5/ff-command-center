import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { CACHE_TTL_SECONDS } from '@ffc/config';
import type { LeagueRef } from '@ffc/domain';
import { ProviderDataError, ProviderNotFoundError } from '../errors';
import { fixtureHttp } from '../testing/fixture-http';
import { describeProviderContract } from '../testing/provider-contract';
import { createSleeperProvider } from './adapter';
import responses from './fixtures/responses.json';

const USER_ID = '100000000000000001';
const LEAGUE_ID = '900000000000000001';
const ref: LeagueRef = { provider: 'sleeper', sport: 'nfl', season: 2026, leagueId: LEAGUE_ID };

function routes(overrides: Record<string, unknown> = {}) {
  return {
    '/state/nfl': responses.state,
    '/user/test_manager': responses.user,
    [`/user/${USER_ID}/leagues/nfl/2026`]: responses.leagues,
    [`/league/${LEAGUE_ID}/rosters`]: responses.rosters,
    [`/league/${LEAGUE_ID}/users`]: responses.leagueUsers,
    [`/league/${LEAGUE_ID}`]: responses.league,
    [`/league/${LEAGUE_ID}/matchups/9`]: responses.matchupsWeek9,
    [`/league/${LEAGUE_ID}/matchups/10`]: responses.matchupsWeek10,
    [`/league/${LEAGUE_ID}/matchups/11`]: [],
    ...overrides,
  };
}

function sleeper(overrides: Record<string, unknown> = {}) {
  const http = fixtureHttp('sleeper', routes(overrides));
  return { provider: createSleeperProvider(http.get), calls: http.calls };
}

describeProviderContract({
  name: 'Sleeper',
  provider: () => sleeper().provider,
  user: {
    provider: 'sleeper',
    userId: USER_ID,
    username: 'test_manager',
    displayName: 'Test_Manager',
    avatarId: null,
  },
  season: 2026,
  matchupWeeks: [9, 10, 11],
});

describe('Sleeper adapter', () => {
  it('finds a user by username', async () => {
    const user = await sleeper().provider.findUser('test_manager');
    expect(user).toEqual({
      provider: 'sleeper',
      userId: USER_ID,
      username: 'test_manager',
      displayName: 'Test_Manager',
      avatarId: '0a1b2c3d4e5f60718293a4b5c6d7e8f9',
    });
  });

  it('treats Sleeper’s `null` body as not found', async () => {
    const { provider } = sleeper({ '/user/nobody_here': null });
    await expect(provider.findUser('nobody_here')).rejects.toBeInstanceOf(ProviderNotFoundError);
  });

  it.each(['', 'a', 'has space', '../league/1', 'x'.repeat(41), 'semi;colon'])(
    'rejects malformed username %j without any request',
    async (username) => {
      const { provider, calls } = sleeper();
      await expect(provider.findUser(username)).rejects.toBeInstanceOf(ProviderNotFoundError);
      expect(calls).toEqual([]);
    },
  );

  it('uses league_season for the current season', async () => {
    expect(await sleeper().provider.currentSeason('nfl')).toBe(2026);
  });

  it('maps leagues and statuses', async () => {
    const { items, skipped } = await sleeper().provider.listLeagues(
      { provider: 'sleeper', userId: USER_ID, username: 'x', displayName: 'x', avatarId: null },
      'nfl',
      2026,
    );
    expect(skipped).toBe(0);
    expect(items.map((l) => [l.name, l.status, l.teamCount])).toEqual([
      ['Example Dynasty League', 'in_season', 4],
      ['Example Redraft League', 'pre_draft', 10],
    ]);
  });

  it('skips and counts malformed leagues instead of failing the list', async () => {
    const broken = { ...responses.leagues[0], league_id: '../x' };
    const { provider } = sleeper({
      [`/user/${USER_ID}/leagues/nfl/2026`]: [broken, responses.leagues[1]],
    });
    const user = await provider.findUser('test_manager');
    const { items, skipped } = await provider.listLeagues(user, 'nfl', 2026);
    expect(items).toHaveLength(1);
    expect(skipped).toBe(1);
  });

  it('joins rosters with users, handles orphans and drops non-id avatars', async () => {
    const teams = await sleeper().provider.getTeams(ref);
    expect(teams.map((t) => [t.teamId, t.teamName, t.ownerName])).toEqual([
      ['1', 'The Placeholders', 'Test_Manager'],
      ['2', 'Second_Manager', 'Second_Manager'],
      ['3', 'Third_Manager', 'Third_Manager'],
      ['4', 'Team 4', null],
    ]);
    expect(teams[0]?.record).toEqual({
      wins: 6,
      losses: 3,
      ties: 0,
      pointsFor: 1032.45,
      pointsAgainst: 980.1,
    });
    expect(teams[2]?.avatarId).toBeNull();
    expect(teams[3]?.record.pointsAgainst).toBe(0);
  });

  it('rejects a league key whose season does not match the league', async () => {
    await expect(sleeper().provider.getLeague({ ...ref, season: 2025 })).rejects.toBeInstanceOf(
      ProviderNotFoundError,
    );
  });

  it('treats a null league as not found', async () => {
    const { provider } = sleeper({ [`/league/${LEAGUE_ID}`]: null });
    await expect(provider.getLeague(ref)).rejects.toBeInstanceOf(ProviderNotFoundError);
  });

  it('asks for the cache lifetime configured for each kind of data', async () => {
    const { provider, calls } = sleeper();
    await provider.findUser('test_manager');
    await provider.getTeams(ref);
    const ttl = (suffix: string) => calls.find((c) => c.path.endsWith(suffix))?.ttlSeconds;
    expect(ttl('/user/test_manager')).toBe(CACHE_TTL_SECONDS.userProfile);
    expect(ttl(`/league/${LEAGUE_ID}`)).toBe(CACHE_TTL_SECONDS.leagueSettings);
    expect(ttl('/rosters')).toBe(CACHE_TTL_SECONDS.rosters);
    expect(ttl('/users')).toBe(CACHE_TTL_SECONDS.leagueMembers);
  });

  it('never throws anything but a ProviderError on arbitrary JSON', async () => {
    await fc.assert(
      fc.asyncProperty(fc.jsonValue(), async (junk) => {
        const { provider } = sleeper({
          [`/league/${LEAGUE_ID}/rosters`]: junk,
          [`/league/${LEAGUE_ID}/users`]: junk,
          '/user/test_manager': junk,
        });
        for (const attempt of [provider.getTeams(ref), provider.findUser('test_manager')]) {
          try {
            await attempt;
          } catch (error) {
            expect(
              error instanceof ProviderDataError || error instanceof ProviderNotFoundError,
            ).toBe(true);
          }
        }
      }),
      { numRuns: 200 },
    );
  });
});

describe('Sleeper matchups', () => {
  it('reads the league week markers', async () => {
    expect(await sleeper().provider.getLeague(ref)).toMatchObject({
      currentWeek: 10,
      lastScoredWeek: 9,
    });
  });

  it('pairs a week and applies commissioner overrides', async () => {
    const { items, skipped } = await sleeper().provider.getMatchups(ref, 9, 'idle');
    expect(skipped).toBe(0);
    expect(
      items.map((m) => [m.home.teamId, m.home.points, m.away?.teamId, m.away?.points]),
    ).toEqual([
      ['1', 121.34, '2', 99.5],
      ['3', 102, '4', 95.25],
    ]);
  });

  it('returns an empty week for weeks without games', async () => {
    expect((await sleeper().provider.getMatchups(ref, 11, 'idle')).items).toEqual([]);
  });

  it('caches live weeks briefly and finished weeks longer', async () => {
    const { provider, calls } = sleeper();
    await provider.getMatchups(ref, 10, 'live');
    await provider.getMatchups(ref, 9, 'idle');
    expect(calls.find((c) => c.path.endsWith('/matchups/10'))?.ttlSeconds).toBe(
      CACHE_TTL_SECONDS.matchupsLive,
    );
    expect(calls.find((c) => c.path.endsWith('/matchups/9'))?.ttlSeconds).toBe(
      CACHE_TTL_SECONDS.matchupsIdle,
    );
  });

  it.each([0, 19, 1.5, -1])('rejects week %s without a request', async (week) => {
    const { provider, calls } = sleeper();
    await expect(provider.getMatchups(ref, week, 'idle')).rejects.toBeInstanceOf(
      ProviderNotFoundError,
    );
    expect(calls).toEqual([]);
  });
});
