import { describe, expect, it } from 'vitest';
import type { League, LeagueRef, ProviderUser, Team } from '@ffc/domain';
import {
  ProviderDataError,
  ProviderNotFoundError,
  ProviderUnavailableError,
  type FantasyProvider,
  type UsernameLookup,
} from '@ffc/providers';
import { loadLeagueStandings } from './league-standings';
import { loadSleeperLeagues } from './sleeper-leagues';

const user: ProviderUser = {
  provider: 'sleeper',
  userId: '1',
  username: 'test_manager',
  displayName: 'Test',
  avatarId: null,
};

function league(name: string, season = 2026): League {
  return {
    ref: { provider: 'sleeper', sport: 'nfl', season, leagueId: name.length.toString() },
    name,
    status: 'in_season',
    teamCount: 2,
    scoringKind: 'points',
    avatarId: null,
  };
}

function team(teamId: string, wins: number): Team {
  return {
    teamId,
    ownerUserId: null,
    ownerName: null,
    teamName: teamId,
    avatarId: null,
    record: { wins, losses: 10 - wins, ties: 0, pointsFor: 0, pointsAgainst: 0 },
  };
}

function fake(overrides: Partial<FantasyProvider & UsernameLookup> = {}) {
  const seasons: number[] = [];
  const provider: FantasyProvider & UsernameLookup = {
    id: 'sleeper',
    sports: ['nfl'],
    findUser: () => Promise.resolve(user),
    currentSeason: () => Promise.resolve(2026),
    listLeagues: (_u, _s, season) => {
      seasons.push(season);
      return Promise.resolve({
        items: [league('Zeta', season), league('Alpha', season)],
        skipped: 1,
      });
    },
    getLeague: (ref: LeagueRef) => Promise.resolve({ ...league('Alpha'), ref }),
    getTeams: () => Promise.resolve([team('b', 3), team('a', 7)]),
    ...overrides,
  };
  return { provider, seasons };
}

describe('loadSleeperLeagues', () => {
  it('loads the current season sorted by name and reports skipped leagues', async () => {
    const result = await loadSleeperLeagues('test_manager', null, fake().provider);
    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') return;
    expect(result.season).toBe(2026);
    expect(result.leagues.map((l) => l.name)).toEqual(['Alpha', 'Zeta']);
    expect(result.skipped).toBe(1);
  });

  it('loads a requested season', async () => {
    const { provider, seasons } = fake();
    await loadSleeperLeagues('test_manager', 2024, provider);
    expect(seasons).toEqual([2024]);
  });

  it('maps not found and provider failures without throwing', async () => {
    const notFound = fake({
      findUser: () => Promise.reject(new ProviderNotFoundError('sleeper', 'user')),
    });
    expect((await loadSleeperLeagues('x_y', null, notFound.provider)).kind).toBe('not_found');
    for (const error of [
      new ProviderUnavailableError('sleeper', 'HTTP 503'),
      new ProviderDataError('sleeper', 'user'),
    ]) {
      const broken = fake({ currentSeason: () => Promise.reject(error) });
      expect((await loadSleeperLeagues('x_y', null, broken.provider)).kind).toBe('unavailable');
    }
  });
});

describe('loadLeagueStandings', () => {
  const ref: LeagueRef = { provider: 'sleeper', sport: 'nfl', season: 2026, leagueId: '5' };

  it('returns the league with ranked rows', async () => {
    const result = await loadLeagueStandings(ref, fake().provider);
    expect(result.kind).toBe('ok');
    if (result.kind !== 'ok') return;
    expect(result.rows.map((r) => r.team.teamId)).toEqual(['a', 'b']);
  });

  it('is not found for providers without an adapter yet', async () => {
    expect((await loadLeagueStandings({ ...ref, provider: 'yahoo' }, null)).kind).toBe('not_found');
  });
});
