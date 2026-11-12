// The adapter contract every provider implements (DESIGN §5.2). Features depend on this, never
// on a specific provider. Does not own HTTP, caching or provider JSON shapes.
import type { League, LeagueRef, ProviderId, ProviderUser, Sport, Team } from '@ffc/domain';

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
}

/** Providers whose users can be found by public username (Sleeper). Yahoo uses OAuth instead. */
export interface UsernameLookup {
  /** Throws ProviderNotFoundError for unknown or malformed usernames. */
  findUser(username: string): Promise<ProviderUser>;
}
