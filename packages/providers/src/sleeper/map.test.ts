import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { mapLeague, mapMatchups } from './map';
import type { SleeperLeague, SleeperMatchup } from './raw';

function raw(
  roster_id: number,
  matchup_id: number | null,
  points = 0,
  custom_points: number | null = null,
): SleeperMatchup {
  return { roster_id, matchup_id, points, custom_points };
}

describe('mapMatchups', () => {
  it('pairs rosters by matchup id, lower roster id at home', () => {
    const { items, skipped } = mapMatchups(
      [raw(2, 1, 90), raw(1, 1, 100), raw(3, 2), raw(4, 2)],
      9,
    );
    expect(skipped).toBe(0);
    expect(items[0]).toEqual({
      matchupId: '1',
      week: 9,
      home: { teamId: '1', points: 100 },
      away: { teamId: '2', points: 90 },
    });
    expect(items).toHaveLength(2);
  });

  it('uses the commissioner override when set', () => {
    const { items } = mapMatchups([raw(1, 1, 88.1, 102), raw(2, 1, 95)], 9);
    expect(items[0]?.home.points).toBe(102);
  });

  it('treats a missing matchup id or a lone roster as a bye', () => {
    const { items, skipped } = mapMatchups([raw(5, null, 10), raw(6, 3, 20)], 15);
    expect(skipped).toBe(0);
    expect(items).toEqual([
      { matchupId: '3', week: 15, home: { teamId: '6', points: 20 }, away: null },
      { matchupId: 'bye-5', week: 15, home: { teamId: '5', points: 10 }, away: null },
    ]);
  });

  it('drops and counts groups of three and duplicate rosters', () => {
    const { items, skipped } = mapMatchups(
      [raw(1, 1), raw(2, 1), raw(3, 1), raw(4, 2), raw(4, 2), raw(5, 2)],
      9,
    );
    expect(items.map((m) => m.matchupId)).toEqual(['2']);
    expect(skipped).toBe(4);
  });

  it('never lists a team twice and accounts for every entry', () => {
    const entry = fc.record({
      roster_id: fc.integer({ min: 1, max: 12 }),
      matchup_id: fc.option(fc.integer({ min: 1, max: 6 }), { nil: null }),
      points: fc.double({ min: -10, max: 250, noNaN: true }),
      custom_points: fc.constant(null),
    });
    fc.assert(
      fc.property(fc.array(entry, { maxLength: 24 }), (raws) => {
        const { items, skipped } = mapMatchups(raws, 4);
        const teams = items.flatMap((m) => [m.home.teamId, ...(m.away ? [m.away.teamId] : [])]);
        expect(new Set(teams).size).toBe(teams.length);
        expect(teams.length + skipped).toBe(raws.length);
      }),
    );
  });
});

describe('mapLeague week markers', () => {
  const base: SleeperLeague = {
    league_id: '1',
    name: 'L',
    season: '2026',
    sport: 'nfl',
    status: 'in_season',
    total_rosters: 10,
    avatar: null,
  };

  it('reads leg and last_scored_leg, mapping 0 or missing to null', () => {
    expect(mapLeague({ ...base, settings: { leg: 10, last_scored_leg: 9 } })).toMatchObject({
      currentWeek: 10,
      lastScoredWeek: 9,
    });
    expect(mapLeague({ ...base, settings: { leg: 0, last_scored_leg: 0 } })).toMatchObject({
      currentWeek: null,
      lastScoredWeek: null,
    });
    expect(mapLeague(base)).toMatchObject({ currentWeek: null, lastScoredWeek: null });
  });
});
