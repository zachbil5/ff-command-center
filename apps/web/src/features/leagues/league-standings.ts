// League page data: the league plus its standings table (DESIGN §6 F1, F3).
// Does not own ranking rules (analysis) or rendering.
import { standings, type StandingRow } from '@ffc/analysis';
import type { League, LeagueRef } from '@ffc/domain';
import type { FantasyProvider } from '@ffc/providers';
import { loadSafely, providerFor, type LoadResult } from '../provider-access';

export interface LeagueStandings {
  readonly league: League;
  readonly rows: readonly StandingRow[];
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
