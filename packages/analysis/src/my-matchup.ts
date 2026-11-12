// Finds a team's matchup in a week and states the result from that team's side (DESIGN F2).
// Pure. Does not own which team is the user's (callers pass the team id) or rendering.
import type { Matchup, MatchupSide, MatchupStatus } from '@ffc/domain';
import { matchupOutcome, type MatchupOutcome } from './matchup-outcome';

export interface TeamWeek {
  readonly matchupId: string;
  readonly mine: MatchupSide;
  /** Null on a bye week. */
  readonly opponent: MatchupSide | null;
  /** `bye` when there is no opponent; otherwise from matchupOutcome. */
  readonly outcome: MatchupOutcome | 'bye';
}

export function teamWeek(
  matchups: readonly Matchup[],
  teamId: string,
  status: MatchupStatus,
): TeamWeek | null {
  for (const matchup of matchups) {
    const { home, away } = matchup;
    const mine = home.teamId === teamId ? home : away?.teamId === teamId ? away : null;
    if (mine === null) continue;
    const opponent = mine === home ? away : home;
    return {
      matchupId: matchup.matchupId,
      mine,
      opponent,
      outcome: opponent === null ? 'bye' : matchupOutcome(status, mine.points, opponent.points),
    };
  }
  return null;
}
