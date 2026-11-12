import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import type { Team } from '@ffc/domain';
import { standings, winPct } from './standings';

function team(teamId: string, wins: number, losses: number, ties = 0, pointsFor = 0): Team {
  return {
    teamId,
    ownerUserId: null,
    ownerName: `Owner ${teamId}`,
    teamName: `Team ${teamId}`,
    avatarId: null,
    record: { wins, losses, ties, pointsFor, pointsAgainst: 0 },
  };
}

const teamArb: fc.Arbitrary<Team> = fc
  .record({
    wins: fc.integer({ min: 0, max: 17 }),
    losses: fc.integer({ min: 0, max: 17 }),
    ties: fc.integer({ min: 0, max: 3 }),
    pointsFor: fc.integer({ min: 0, max: 300000 }).map((n) => n / 100),
  })
  .map(({ wins, losses, ties, pointsFor }) => team('x', wins, losses, ties, pointsFor));

/** Teams with unique ids, as a real league has. */
const leagueArb = fc
  .array(teamArb, { minLength: 0, maxLength: 16 })
  .map((teams) => teams.map((t, i) => ({ ...t, teamId: String(i + 1) })));

describe('winPct', () => {
  it('counts ties as half a win and is 0 before any game', () => {
    expect(winPct(team('1', 0, 0))).toBe(0);
    expect(winPct(team('1', 3, 1))).toBe(0.75);
    expect(winPct(team('1', 1, 0, 1))).toBe(0.75);
  });
});

describe('standings', () => {
  it('ranks by record, then points for', () => {
    const rows = standings([
      team('a', 5, 5, 0, 1200),
      team('b', 8, 2, 0, 1100),
      team('c', 5, 5, 0, 1300),
    ]);
    expect(rows.map((r) => [r.rank, r.team.teamId])).toEqual([
      [1, 'b'],
      [2, 'c'],
      [3, 'a'],
    ]);
    expect(rows[0]?.gamesPlayed).toBe(10);
  });

  it('breaks full ties by team id so the order is stable', () => {
    const rows = standings([team('2', 1, 1, 0, 100), team('1', 1, 1, 0, 100)]);
    expect(rows.map((r) => r.team.teamId)).toEqual(['1', '2']);
  });

  it('returns every team exactly once with ranks 1..n', () => {
    fc.assert(
      fc.property(leagueArb, (teams) => {
        const rows = standings(teams);
        expect(rows.map((r) => r.rank)).toEqual(teams.map((_, i) => i + 1));
        expect(rows.map((r) => r.team.teamId).sort()).toEqual(teams.map((t) => t.teamId).sort());
      }),
    );
  });

  it('never ranks a lower win % above a higher one', () => {
    fc.assert(
      fc.property(leagueArb, (teams) => {
        const rows = standings(teams);
        for (let i = 1; i < rows.length; i++) {
          expect(rows[i - 1]!.winPct).toBeGreaterThanOrEqual(rows[i]!.winPct);
        }
      }),
    );
  });

  it('does not depend on input order', () => {
    fc.assert(
      fc.property(
        leagueArb.chain((teams) =>
          fc.tuple(fc.constant(teams), fc.shuffledSubarray(teams, { minLength: teams.length })),
        ),
        ([teams, shuffled]) => {
          const ids = (list: readonly Team[]) => standings(list).map((r) => r.team.teamId);
          expect(ids(shuffled)).toEqual(ids(teams));
        },
      ),
    );
  });

  it('does not mutate its input', () => {
    const teams = [team('b', 1, 0), team('a', 0, 1)];
    standings(teams);
    expect(teams.map((t) => t.teamId)).toEqual(['b', 'a']);
  });
});
