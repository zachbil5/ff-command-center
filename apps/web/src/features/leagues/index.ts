// Facade for the leagues feature: what routes may call (DESIGN §4).
export { loadLeagueStandings, type LeagueStandings } from './league-standings';
export type { LoadResult } from '../provider-access';
export { loadSleeperLeagues, type SleeperLeagues } from './sleeper-leagues';
