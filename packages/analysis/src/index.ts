// Facade for @ffc/analysis: the only import path other packages may use (DESIGN §4).
export {
  MATCHUP_STATUSES,
  matchupOutcome,
  type MatchupStatus,
  type MatchupOutcome,
} from './matchup-outcome';
export { standings, winPct, type StandingRow } from './standings';
