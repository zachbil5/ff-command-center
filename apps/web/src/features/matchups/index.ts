// Facade for the matchups feature: what routes may call (DESIGN §4).
export { loadLeagueWeek, type LeagueWeekView } from './league-week';
export { loadMyMatchups, type MyLeagueWeek, type MyMatchups, type MyWin } from './my-matchups';
export type { LeagueWeek, ResolvedMatchup, ResolvedSide } from './resolve-week';
