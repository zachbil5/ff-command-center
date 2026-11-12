// League page, matchups section: every pairing in a league for a week (DESIGN F2).
// Does not own standings (leagues feature) or rendering.
import { defaultWeek } from '@ffc/analysis';
import type { League, LeagueRef } from '@ffc/domain';
import type { FantasyProvider } from '@ffc/providers';
import { loadSafely, providerFor, type LoadResult } from '../provider-access';
import { resolveWeek, type LeagueWeek } from './resolve-week';

export interface LeagueWeekView {
  readonly league: League;
  readonly week: LeagueWeek;
}

export async function loadLeagueWeek(
  ref: LeagueRef,
  week: number | null,
  provider: FantasyProvider | null = providerFor(ref),
): Promise<LoadResult<LeagueWeekView>> {
  if (provider === null) return { kind: 'not_found' };
  return loadSafely(async () => {
    const [league, teams] = await Promise.all([provider.getLeague(ref), provider.getTeams(ref)]);
    return {
      league,
      week: await resolveWeek(provider, league, teams, week ?? defaultWeek(league)),
    };
  });
}
