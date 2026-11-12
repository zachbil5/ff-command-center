// Facade for @ffc/analysis: the only import path other packages may use (DESIGN §4).
export { matchupOutcome, type MatchupOutcome } from './matchup-outcome';
export { teamWeek, type TeamWeek } from './my-matchup';
export { standings, winPct, type StandingRow } from './standings';
export { celebrationWeek, commonDefaultWeek, defaultWeek, weekStatus } from './week';
