// Ranks a league's teams by record (DESIGN F1/F3). Pure and deterministic: the same teams in
// any order give the same table. Does not own fetching teams or provider tiebreak rules.
import type { Team } from '@ffc/domain';

export interface StandingRow {
  /** 1-based, unique, contiguous. */
  readonly rank: number;
  readonly team: Team;
  readonly gamesPlayed: number;
  /** Ties count as half a win; 0 before any game is played. */
  readonly winPct: number;
}

export function winPct(team: Team): number {
  const { wins, losses, ties } = team.record;
  const games = wins + losses + ties;
  return games === 0 ? 0 : (wins + ties / 2) / games;
}

/**
 * Order: win % (desc), points for (desc), then team id so the result never depends on input
 * order. Providers have their own tiebreakers (head-to-head, divisions); this is the
 * cross-provider default until a league's rules are modelled.
 */
function compare(a: Team, b: Team): number {
  return (
    winPct(b) - winPct(a) ||
    b.record.pointsFor - a.record.pointsFor ||
    (a.teamId < b.teamId ? -1 : a.teamId > b.teamId ? 1 : 0)
  );
}

export function standings(teams: readonly Team[]): StandingRow[] {
  return [...teams].sort(compare).map((team, index) => {
    const { wins, losses, ties } = team.record;
    return { rank: index + 1, team, gamesPlayed: wins + losses + ties, winPct: winPct(team) };
  });
}
