// League page data: the league plus its standings table (DESIGN §6 F1, F3).
// Does not own ranking rules (analysis) or rendering.
import { standings, type StandingRow } from '@ffc/analysis';
import type { League, LeagueRef } from '@ffc/domain';
import type { FantasyProvider } from '@ffc/providers';
import { loadSafely, type LoadResult } from './load-result';
import { sleeperProvider } from './provider-registry';

export interface LeagueStandings {
  readonly league: League;
  readonly rows: readonly StandingRow[];
}

/** Adapter for each provider; Yahoo joins in M3. */
function providerFor(ref: LeagueRef): FantasyProvider | null {
  return ref.provider === 'sleeper' ? sleeperProvider() : null;
}

export async function loadLeagueStandings(
  ref: LeagueRef,
  provider: FantasyProvider | null = providerFor(ref),
): Promise<LoadResult<LeagueStandings>> {
  if (provider === null) return { kind: 'not_found' };
  return loadSafely(async () => {
    const [league, teams] = await Promise.all([provider.getLeague(ref), provider.getTeams(ref)]);
    return { league, rows: standings(teams) };
  });
}
