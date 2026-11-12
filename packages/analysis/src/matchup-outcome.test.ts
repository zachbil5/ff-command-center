import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { MATCHUP_STATUSES } from '@ffc/domain';
import { matchupOutcome, type MatchupOutcome } from './matchup-outcome';

const score = fc.double({ min: 0, max: 400, noNaN: true, noDefaultInfinity: true });

const MIRROR: Record<MatchupOutcome, MatchupOutcome> = {
  win: 'loss',
  loss: 'win',
  tie: 'tie',
  pending: 'pending',
};

describe('matchupOutcome', () => {
  it('is pending until the matchup is final', () => {
    expect(matchupOutcome('upcoming', 0, 0)).toBe('pending');
    expect(matchupOutcome('live', 120, 80)).toBe('pending');
  });

  it('decides final matchups', () => {
    expect(matchupOutcome('final', 120.5, 80)).toBe('win');
    expect(matchupOutcome('final', 80, 120.5)).toBe('loss');
    expect(matchupOutcome('final', 100, 100)).toBe('tie');
  });

  it('ignores float noise below a hundredth', () => {
    expect(matchupOutcome('final', 0.1 + 0.2, 0.3)).toBe('tie');
  });

  it('rejects non-finite scores', () => {
    expect(() => matchupOutcome('final', Number.NaN, 1)).toThrow(RangeError);
  });

  it('is antisymmetric: swapping sides mirrors the outcome', () => {
    fc.assert(
      fc.property(fc.constantFrom(...MATCHUP_STATUSES), score, score, (status, a, b) => {
        expect(matchupOutcome(status, b, a)).toBe(MIRROR[matchupOutcome(status, a, b)]);
      }),
    );
  });

  it('a final matchup is a win exactly when my rounded score is higher', () => {
    fc.assert(
      fc.property(score, score, (a, b) => {
        const won = matchupOutcome('final', a, b) === 'win';
        expect(won).toBe(Math.round(a * 100) > Math.round(b * 100));
      }),
    );
  });
});
