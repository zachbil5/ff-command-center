// The adapter contract every provider implements (DESIGN §5.2). Features depend on this, never
// on a specific provider. Does not own HTTP, caching or provider JSON shapes.
import type {
  League,
  LeagueRef,
  Matchup,
  ProviderId,
  ProviderUser,
  Sport,
  Team,
} from '@ffc/domain';

/**
 * How fresh matchup scores must be: `live` during a week being played, `idle` otherwise.
 * Maps to the matchupsLive / matchupsIdle cache lifetimes (DESIGN §3.2).
 */
export type Freshness = 'live' | 'idle';

/** A list where items the provider sent in an unusable shape were dropped and counted. */
export interface PartialList<T> {
  readonly items: readonly T[];
  readonly skipped: number;
}

export interface FantasyProvider {
  readonly id: ProviderId;
  readonly sports: readonly Sport[];
  currentSeason(sport: Sport): Promise<number>;
  listLeagues(user: ProviderUser, sport: Sport, season: number): Promise<PartialList<League>>;
  getLeague(ref: LeagueRef): Promise<League>;
  getTeams(ref: LeagueRef): Promise<readonly Team[]>;
  /** Every pairing in a week. Unpairable entries are dropped and counted. */
  getMatchups(ref: LeagueRef, week: number, freshness: Freshness): Promise<PartialList<Matchup>>;
}

/** Providers whose users can be found by public username (Sleeper). Yahoo uses OAuth instead. */
export interface UsernameLookup {
  /** Throws ProviderNotFoundError for unknown or malformed usernames. */
  findUser(username: string): Promise<ProviderUser>;
}
