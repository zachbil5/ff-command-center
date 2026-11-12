// Provider-neutral weekly matchup shapes (DESIGN §5.1, F2). Does not own deciding status,
// winners or which team is "mine" (analysis).

export const MATCHUP_STATUSES = ['upcoming', 'live', 'final'] as const;
export type MatchupStatus = (typeof MATCHUP_STATUSES)[number];

export interface MatchupSide {
  /** Team id within the league (matches Team.teamId). */
  readonly teamId: string;
  readonly points: number;
}

export interface Matchup {
  /** Unique within the league and week. */
  readonly matchupId: string;
  readonly week: number;
  readonly home: MatchupSide;
  /** Null when the team has no opponent this week (a bye, e.g. in the playoffs). */
  readonly away: MatchupSide | null;
}
