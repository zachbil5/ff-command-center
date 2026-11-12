import { describe, expect, it } from 'vitest';
import { celebrationTitle, shouldAnimate, winLine, type WinSummary } from './copy';

const win: WinSummary = {
  key: 'k',
  leagueName: 'Example League',
  week: 9,
  myPoints: 121.3,
  opponentPoints: 99.5,
  opponentName: 'Second_Manager',
};

describe('celebration copy', () => {
  it('titles one or several wins', () => {
    expect(celebrationTitle([win])).toBe('You won!');
    expect(celebrationTitle([win, { ...win, key: 'k2' }])).toBe('You won 2 matchups!');
  });

  it('shows both scores to two decimals and the opponent', () => {
    expect(winLine(win)).toBe('121.30 – 99.50 vs Second_Manager');
  });

  it('skips the animation when the viewer prefers reduced motion', () => {
    expect(shouldAnimate(true)).toBe(false);
    expect(shouldAnimate(false)).toBe(true);
  });
});
