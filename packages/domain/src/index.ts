// Facade for @ffc/domain: the only import path other packages may use (DESIGN §4).
export { PROVIDER_IDS, ProviderIdSchema, type ProviderId } from './provider-id';
export {
  SPORT_IDS,
  SPORT_REGISTRY,
  SCORING_KINDS,
  SportSchema,
  getSport,
  weekSchema,
  type Sport,
  type ScoringKind,
  type SportDefinition,
  type LineupSlotDefinition,
} from './sport';
export {
  LEAGUE_STATUSES,
  type LeagueStatus,
  type League,
  type ProviderUser,
  type Team,
  type TeamRecord,
} from './league';
export { MATCHUP_STATUSES, type Matchup, type MatchupSide, type MatchupStatus } from './matchup';
export {
  ExternalIdSchema,
  SeasonSchema,
  LeagueRefSchema,
  leagueRefKey,
  parseLeagueRefKey,
  type LeagueRef,
} from './league-ref';
