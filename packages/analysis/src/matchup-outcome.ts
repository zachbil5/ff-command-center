// Decides a points matchup's outcome from the user's side (DESIGN F2, F6). Pure: the caller
// supplies status and scores. Does not own fetching scores or deciding when a week is final.

export const MATCHUP_STATUSES = ['upcoming', 'live', 'final'] as const;
export type MatchupStatus = (typeof MATCHUP_STATUSES)[number];

export type MatchupOutcome = 'win' | 'loss' | 'tie' | 'pending';

/**
 * Providers report fractional points; compare at hundredths so float noise
 * (e.g. 0.1 + 0.2) never turns a tie into a win.
 */
const SCORE_PRECISION = 100;

export function matchupOutcome(
  status: MatchupStatus,
  myScore: number,
  opponentScore: number,
): MatchupOutcome {
  if (status !== 'final') {
    return 'pending';
  }
  if (!Number.isFinite(myScore) || !Number.isFinite(opponentScore)) {
    throw new RangeError('scores must be finite numbers');
  }
  const mine = Math.round(myScore * SCORE_PRECISION);
  const theirs = Math.round(opponentScore * SCORE_PRECISION);
  if (mine === theirs) return 'tie';
  return mine > theirs ? 'win' : 'loss';
}
