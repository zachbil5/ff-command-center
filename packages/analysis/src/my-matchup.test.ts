import { describe, expect, it } from 'vitest';
import type { Matchup } from '@ffc/domain';
import { teamWeek } from './my-matchup';

const matchups: Matchup[] = [
  {
    matchupId: '1',
    week: 9,
    home: { teamId: '1', points: 120.5 },
    away: { teamId: '2', points: 99 },
  },
  { matchupId: '2', week: 9, home: { teamId: '3', points: 80 }, away: { teamId: '4', points: 80 } },
  { matchupId: 'bye-5', week: 9, home: { teamId: '5', points: 0 }, away: null },
];

describe('teamWeek', () => {
  it('finds the team on either side and states the result from its side', () => {
    expect(teamWeek(matchups, '1', 'final')).toMatchObject({
      outcome: 'win',
      opponent: { teamId: '2' },
    });
    expect(teamWeek(matchups, '2', 'final')).toMatchObject({
      outcome: 'loss',
      mine: { teamId: '2', points: 99 },
      opponent: { teamId: '1' },
    });
    expect(teamWeek(matchups, '4', 'final')?.outcome).toBe('tie');
  });

  it('is pending until the week is final', () => {
    expect(teamWeek(matchups, '1', 'live')?.outcome).toBe('pending');
  });

  it('reports a bye', () => {
    expect(teamWeek(matchups, '5', 'final')).toMatchObject({ outcome: 'bye', opponent: null });
  });

  it('is null when the team has no matchup', () => {
    expect(teamWeek(matchups, '9', 'final')).toBeNull();
  });
});
