import { describe, expect, it } from 'vitest';
import type { League, LeagueRef, Matchup, ProviderUser, Team } from '@ffc/domain';
import {
  ProviderNotFoundError,
  ProviderUnavailableError,
  type FantasyProvider,
  type Freshness,
  type UsernameLookup,
} from '@ffc/providers';
import { loadLeagueWeek } from './league-week';
import { loadMyMatchups } from './my-matchups';

const ME = 'u-me';
const user: ProviderUser = {
  provider: 'sleeper',
  userId: ME,
  username: 'test_manager',
  displayName: 'Test',
  avatarId: null,
};

function league(id: string, overrides: Partial<League> = {}): League {
  return {
    ref: { provider: 'sleeper', sport: 'nfl', season: 2026, leagueId: id },
    name: `League ${id}`,
    status: 'in_season',
    teamCount: 4,
    scoringKind: 'points',
    avatarId: null,
    currentWeek: 10,
    lastScoredWeek: 9,
    ...overrides,
  };
}

function team(teamId: string, owner: string | null): Team {
  return {
    teamId,
    ownerUserId: owner,
    ownerName: owner,
    teamName: `Team ${teamId}`,
    avatarId: null,
    record: { wins: 0, losses: 0, ties: 0, pointsFor: 0, pointsAgainst: 0 },
  };
}

const TEAMS = [team('1', ME), team('2', 'u-2'), team('3', 'u-3'), team('4', 'u-4')];

/** Week 9 (scored): I beat team 2. Week 10 (live): I'm behind team 3. */
const WEEKS: Record<number, Matchup[]> = {
  9: [
    {
      matchupId: '1',
      week: 9,
      home: { teamId: '1', points: 120 },
      away: { teamId: '2', points: 100 },
    },
    {
      matchupId: '2',
      week: 9,
      home: { teamId: '3', points: 90 },
      away: { teamId: '4', points: 95 },
    },
  ],
  10: [
    {
      matchupId: '1',
      week: 10,
      home: { teamId: '1', points: 30 },
      away: { teamId: '3', points: 40 },
    },
    {
      matchupId: '2',
      week: 10,
      home: { teamId: '2', points: 0 },
      away: { teamId: '4', points: 0 },
    },
  ],
};

function fake(leagues: League[], overrides: Partial<FantasyProvider & UsernameLookup> = {}) {
  const requests: { leagueId: string; week: number; freshness: Freshness }[] = [];
  const provider: FantasyProvider & UsernameLookup = {
    id: 'sleeper',
    sports: ['nfl'],
    findUser: () => Promise.resolve(user),
    currentSeason: () => Promise.resolve(2026),
    listLeagues: () => Promise.resolve({ items: leagues, skipped: 0 }),
    getLeague: (ref: LeagueRef) =>
      Promise.resolve(leagues.find((l) => l.ref.leagueId === ref.leagueId) ?? league(ref.leagueId)),
    getTeams: () => Promise.resolve(TEAMS),
    getMatchups: (ref, week, freshness) => {
      requests.push({ leagueId: ref.leagueId, week, freshness });
      return Promise.resolve({ items: WEEKS[week] ?? [], skipped: 0 });
    },
    ...overrides,
  };
  return { provider, requests };
}

describe('loadMyMatchups', () => {
  it('shows this week live and finds last week’s win for the celebration', async () => {
    const { provider, requests } = fake([league('a')]);
    const result = await loadMyMatchups('test_manager', null, provider);
    if (result.kind !== 'ok') throw new Error(result.kind);
    expect(result.week).toBe(10);
    const [entry] = result.leagues;
    expect(entry).toMatchObject({
      kind: 'matchup',
      status: 'live',
      outcome: 'pending',
      mine: { points: 30 },
      opponent: { team: { teamId: '3' }, points: 40 },
    });
    expect(result.wins).toEqual([
      expect.objectContaining({
        key: 'sleeper:nfl:2026:a:w9',
        week: 9,
        myPoints: 120,
        opponentPoints: 100,
        opponentName: 'Team 2',
      }),
    ]);
    expect(requests).toContainEqual({ leagueId: 'a', week: 10, freshness: 'live' });
    expect(requests).toContainEqual({ leagueId: 'a', week: 9, freshness: 'idle' });
  });

  it('reuses the shown week when it is the celebration week', async () => {
    const { provider, requests } = fake([league('a')]);
    const result = await loadMyMatchups('test_manager', 9, provider);
    if (result.kind !== 'ok') throw new Error(result.kind);
    expect(result.leagues[0]).toMatchObject({ kind: 'matchup', status: 'final', outcome: 'win' });
    expect(result.wins).toHaveLength(1);
    expect(requests.filter((r) => r.week === 9)).toHaveLength(1);
  });

  it('does not celebrate a loss', async () => {
    const { provider } = fake([league('a')], {
      getTeams: () =>
        Promise.resolve([team('1', 'u-x'), team('2', ME), team('3', 'u-3'), team('4', 'u-4')]),
    });
    const result = await loadMyMatchups('test_manager', null, provider);
    if (result.kind !== 'ok') throw new Error(result.kind);
    expect(result.wins).toEqual([]);
  });

  it('explains leagues without a matchup and keeps going when one league fails', async () => {
    const leagues = [
      league('a'),
      league('b', { status: 'pre_draft', currentWeek: null, lastScoredWeek: null }),
      league('c'),
    ];
    const { provider } = fake(leagues, {
      getTeams: (ref) =>
        ref.leagueId === 'c'
          ? Promise.reject(new ProviderUnavailableError('sleeper', 'HTTP 503'))
          : Promise.resolve(TEAMS),
    });
    const result = await loadMyMatchups('test_manager', null, provider);
    if (result.kind !== 'ok') throw new Error(result.kind);
    expect(result.leagues.map((l) => [l.league.ref.leagueId, l.kind])).toEqual([
      ['a', 'matchup'],
      ['b', 'none'],
      ['c', 'unavailable'],
    ]);
  });

  it('reports leagues where the user has no team', async () => {
    const { provider } = fake([league('a')], {
      getTeams: () => Promise.resolve([team('1', 'someone-else')]),
    });
    const result = await loadMyMatchups('test_manager', null, provider);
    if (result.kind !== 'ok') throw new Error(result.kind);
    expect(result.leagues[0]).toMatchObject({ kind: 'none', reason: 'no_team' });
  });

  it('is not found for unknown users', async () => {
    const { provider } = fake([], {
      findUser: () => Promise.reject(new ProviderNotFoundError('sleeper', 'user')),
    });
    expect((await loadMyMatchups('nobody_here', null, provider)).kind).toBe('not_found');
  });
});

describe('loadLeagueWeek', () => {
  const ref: LeagueRef = { provider: 'sleeper', sport: 'nfl', season: 2026, leagueId: 'a' };

  it('defaults to the current week and marks winners only once final', async () => {
    const live = await loadLeagueWeek(ref, null, fake([league('a')]).provider);
    if (live.kind !== 'ok') throw new Error(live.kind);
    expect(live.week.week).toBe(10);
    expect(live.week.matchups.map((m) => m.winner)).toEqual([null, null]);

    const final = await loadLeagueWeek(ref, 9, fake([league('a')]).provider);
    if (final.kind !== 'ok') throw new Error(final.kind);
    expect(final.week.matchups.map((m) => m.winner)).toEqual(['home', 'away']);
  });

  it('drops and counts pairings that name unknown teams', async () => {
    const { provider } = fake([league('a')], {
      getMatchups: () =>
        Promise.resolve({
          items: [
            {
              matchupId: '9',
              week: 9,
              home: { teamId: '1', points: 1 },
              away: { teamId: '99', points: 2 },
            },
          ],
          skipped: 1,
        }),
    });
    const result = await loadLeagueWeek(ref, 9, provider);
    if (result.kind !== 'ok') throw new Error(result.kind);
    expect(result.week.matchups).toEqual([]);
    expect(result.week.skipped).toBe(2);
  });
});
