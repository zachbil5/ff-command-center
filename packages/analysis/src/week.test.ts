import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { LEAGUE_STATUSES, type League, type MatchupStatus } from '@ffc/domain';
import { celebrationWeek, commonDefaultWeek, defaultWeek, weekStatus } from './week';

function league(overrides: Partial<League> = {}): League {
  return {
    ref: { provider: 'sleeper', sport: 'nfl', season: 2026, leagueId: '1' },
    name: 'L',
    status: 'in_season',
    teamCount: 10,
    scoringKind: 'points',
    avatarId: null,
    currentWeek: 10,
    lastScoredWeek: 9,
    ...overrides,
  };
}

const ORDER: Record<MatchupStatus, number> = { final: 0, live: 1, upcoming: 2 };

const leagueArb = fc
  .record({
    status: fc.constantFrom(...LEAGUE_STATUSES),
    currentWeek: fc.option(fc.integer({ min: 1, max: 18 }), { nil: null }),
    lastScoredWeek: fc.option(fc.integer({ min: 0, max: 18 }), { nil: null }),
  })
  .map((parts) => league(parts));

describe('weekStatus', () => {
  it('final through the last scored week, live this week, upcoming after', () => {
    const l = league();
    expect(weekStatus(l, 1)).toBe('final');
    expect(weekStatus(l, 9)).toBe('final');
    expect(weekStatus(l, 10)).toBe('live');
    expect(weekStatus(l, 11)).toBe('upcoming');
  });

  it('a completed league is final every week', () => {
    expect(weekStatus(league({ status: 'complete', lastScoredWeek: 17 }), 18)).toBe('final');
  });

  it('nothing is live before the season starts', () => {
    const l = league({ status: 'pre_draft', currentWeek: 1, lastScoredWeek: null });
    expect(weekStatus(l, 1)).toBe('upcoming');
  });

  it('never goes backwards: a later week is never "earlier" in state than an earlier week', () => {
    fc.assert(
      fc.property(leagueArb, fc.integer({ min: 1, max: 17 }), (l, week) => {
        expect(ORDER[weekStatus(l, week)]).toBeLessThanOrEqual(ORDER[weekStatus(l, week + 1)]);
      }),
    );
  });

  it('at most one week is live', () => {
    fc.assert(
      fc.property(leagueArb, (l) => {
        const live = Array.from({ length: 18 }, (_, i) => weekStatus(l, i + 1)).filter(
          (s) => s === 'live',
        );
        expect(live.length).toBeLessThanOrEqual(1);
      }),
    );
  });
});

describe('defaultWeek', () => {
  it('opens on this week in season, the last scored week when complete, else week 1', () => {
    expect(defaultWeek(league())).toBe(10);
    expect(defaultWeek(league({ status: 'complete', lastScoredWeek: 17 }))).toBe(17);
    expect(
      defaultWeek(league({ status: 'pre_draft', currentWeek: null, lastScoredWeek: null })),
    ).toBe(1);
  });

  it('always returns a valid week', () => {
    fc.assert(
      fc.property(leagueArb, (l) => {
        const week = defaultWeek(l);
        expect(week).toBeGreaterThanOrEqual(1);
        expect(week).toBeLessThanOrEqual(18);
      }),
    );
  });
});

describe('celebrationWeek', () => {
  it('is the last scored week for active or just-finished leagues', () => {
    expect(celebrationWeek(league())).toBe(9);
    expect(celebrationWeek(league({ status: 'complete', lastScoredWeek: 17 }))).toBe(17);
  });

  it('is null before any week is scored or before the season', () => {
    expect(celebrationWeek(league({ lastScoredWeek: null }))).toBeNull();
    expect(celebrationWeek(league({ lastScoredWeek: 0 }))).toBeNull();
    expect(celebrationWeek(league({ status: 'drafting', lastScoredWeek: 3 }))).toBeNull();
  });

  it('only ever names a week that is final', () => {
    fc.assert(
      fc.property(leagueArb, (l) => {
        const week = celebrationWeek(l);
        if (week !== null) expect(weekStatus(l, week)).toBe('final');
      }),
    );
  });
});

describe('commonDefaultWeek', () => {
  it('picks the week most leagues are on, later week on ties, 1 when empty', () => {
    expect(commonDefaultWeek([])).toBe(1);
    expect(commonDefaultWeek([league(), league(), league({ currentWeek: 11 })])).toBe(10);
    expect(commonDefaultWeek([league({ currentWeek: 9 }), league({ currentWeek: 11 })])).toBe(11);
  });

  it('is independent of league order', () => {
    fc.assert(
      fc.property(fc.array(leagueArb, { maxLength: 8 }), (leagues) => {
        expect(commonDefaultWeek([...leagues].reverse())).toBe(commonDefaultWeek(leagues));
      }),
    );
  });
});
