// Loads one league week and joins matchups to teams (DESIGN F2). Shared by the league page and
// "my matchups". Does not own status rules (analysis) or error mapping (provider-access).
import { matchupOutcome, weekStatus } from '@ffc/analysis';
import type { League, MatchupStatus, Team } from '@ffc/domain';
import type { FantasyProvider } from '@ffc/providers';

export interface ResolvedSide {
  readonly team: Team;
  readonly points: number;
}

export interface ResolvedMatchup {
  readonly matchupId: string;
  readonly home: ResolvedSide;
  /** Null on a bye. */
  readonly away: ResolvedSide | null;
  /** Which side won once final; null while not final or on a bye. */
  readonly winner: 'home' | 'away' | 'tie' | null;
}

export interface LeagueWeek {
  readonly week: number;
  readonly status: MatchupStatus;
  readonly matchups: readonly ResolvedMatchup[];
  /** Pairings the provider sent that couldn't be read or matched to a team. */
  readonly skipped: number;
}

function winnerOf(status: MatchupStatus, home: number, away: number): ResolvedMatchup['winner'] {
  const outcome = matchupOutcome(status, home, away);
  if (outcome === 'pending') return null;
  return outcome === 'win' ? 'home' : outcome === 'loss' ? 'away' : 'tie';
}

export async function resolveWeek(
  provider: FantasyProvider,
  league: League,
  teams: readonly Team[],
  week: number,
): Promise<LeagueWeek> {
  const status = weekStatus(league, week);
  const { items, skipped } = await provider.getMatchups(
    league.ref,
    week,
    status === 'live' ? 'live' : 'idle',
  );
  const byId = new Map(teams.map((team) => [team.teamId, team]));
  const matchups: ResolvedMatchup[] = [];
  let unmatched = 0;
  for (const m of items) {
    const home = byId.get(m.home.teamId);
    const away = m.away === null ? null : byId.get(m.away.teamId);
    if (home === undefined || away === undefined) {
      unmatched += 1;
      continue;
    }
    matchups.push({
      matchupId: m.matchupId,
      home: { team: home, points: m.home.points },
      away: away === null || m.away === null ? null : { team: away, points: m.away.points },
      winner: m.away === null ? null : winnerOf(status, m.home.points, m.away.points),
    });
  }
  return { week, status, matchups, skipped: skipped + unmatched };
}
