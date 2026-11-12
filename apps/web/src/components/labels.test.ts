import { describe, expect, it } from 'vitest';
import { LEAGUE_STATUSES, MATCHUP_STATUSES } from '@ffc/domain';
import {
  LEAGUE_STATUS_LABEL,
  MATCHUP_STATUS_LABEL,
  formatPoints,
  formatRecord,
  formatWinPct,
} from './labels';

describe('labels', () => {
  it('has a label for every league status', () => {
    for (const status of LEAGUE_STATUSES) expect(LEAGUE_STATUS_LABEL[status]).toBeTruthy();
  });

  it('formats numbers the sports way', () => {
    expect(formatPoints(1032.4)).toBe('1,032.40');
    expect(formatWinPct(0.75)).toBe('.750');
    expect(formatWinPct(1)).toBe('1.000');
    expect(formatWinPct(0)).toBe('.000');
    expect(formatRecord(6, 3, 0)).toBe('6-3');
    expect(formatRecord(6, 2, 1)).toBe('6-2-1');
  });
});

describe('matchup labels', () => {
  it('has a label for every matchup status', () => {
    for (const status of MATCHUP_STATUSES) expect(MATCHUP_STATUS_LABEL[status]).toBeTruthy();
  });
});
