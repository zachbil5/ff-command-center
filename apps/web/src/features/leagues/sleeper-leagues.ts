// F1 for Sleeper: username → that user's leagues for a season (DESIGN §6 F1).
// Does not own rendering or URL building.
import type { League, ProviderUser } from '@ffc/domain';
import type { FantasyProvider, UsernameLookup } from '@ffc/providers';
import { loadSafely, sleeperProvider, type LoadResult } from '../provider-access';

export interface SleeperLeagues {
  readonly user: ProviderUser;
  readonly season: number;
  readonly currentSeason: number;
  readonly leagues: readonly League[];
  /** Leagues Sleeper returned in a shape we couldn't read. */
  readonly skipped: number;
}

export function loadSleeperLeagues(
  username: string,
  season: number | null,
  provider: FantasyProvider & UsernameLookup = sleeperProvider(),
): Promise<LoadResult<SleeperLeagues>> {
  return loadSafely(async () => {
    const [user, currentSeason] = await Promise.all([
      provider.findUser(username),
      provider.currentSeason('nfl'),
    ]);
    const chosen = season ?? currentSeason;
    const { items, skipped } = await provider.listLeagues(user, 'nfl', chosen);
    const leagues = [...items].sort((a, b) => a.name.localeCompare(b.name));
    return { user, season: chosen, currentSeason, leagues, skipped };
  });
}
