// "My matchups": the user's matchup in every league this season for one week, plus their
// wins in the latest scored week for the celebration (DESIGN F2, F6).
// Does not own rendering or remembering which wins were already celebrated (client state).
import { celebrationWeek, commonDefaultWeek, teamWeek, type MatchupOutcome } from '@ffc/analysis';
import {
  leagueRefKey,
  type League,
  type MatchupStatus,
  type ProviderUser,
  type Team,
} from '@ffc/domain';
import type { FantasyProvider, UsernameLookup } from '@ffc/providers';
import { loadSafely, sleeperProvider, type LoadResult } from '../provider-access';
import { resolveWeek, type LeagueWeek } from './resolve-week';

export interface MyWin {
  /** Stable per league-week; used to remember the win was celebrated. */
  readonly key: string;
  readonly league: League;
  readonly week: number;
  readonly myPoints: number;
  readonly opponentPoints: number;
  readonly opponentName: string;
}

export type MyLeagueWeek =
  | {
      readonly kind: 'matchup';
      readonly league: League;
      readonly status: MatchupStatus;
      readonly mine: { readonly team: Team; readonly points: number };
      readonly opponent: { readonly team: Team; readonly points: number } | null;
      readonly outcome: MatchupOutcome | 'bye';
    }
  /** The season hasn't started, there are no games this week, or the user has no team. */
  | {
      readonly kind: 'none';
      readonly league: League;
      readonly reason: 'not_started' | 'no_game' | 'no_team';
    }
  /** This league failed to load; the others still show. */
  | { readonly kind: 'unavailable'; readonly league: League };

export interface MyMatchups {
  readonly user: ProviderUser;
  readonly season: number;
  readonly week: number;
  readonly leagues: readonly MyLeagueWeek[];
  readonly wins: readonly MyWin[];
}

const ACTIVE = new Set<League['status']>(['in_season', 'complete']);

function myTeam(teams: readonly Team[], user: ProviderUser): Team | undefined {
  return teams.find((team) => team.ownerUserId === user.userId);
}

function toLeagueWeek(league: League, week: LeagueWeek, team: Team): MyLeagueWeek {
  const flat = week.matchups.map((m) => ({
    matchupId: m.matchupId,
    week: week.week,
    home: { teamId: m.home.team.teamId, points: m.home.points },
    away: m.away === null ? null : { teamId: m.away.team.teamId, points: m.away.points },
  }));
  const result = teamWeek(flat, team.teamId, week.status);
  if (result === null) return { kind: 'none', league, reason: 'no_game' };
  const matchup = week.matchups.find((m) => m.matchupId === result.matchupId);
  const opponentSide =
    matchup === undefined
      ? null
      : matchup.home.team.teamId === team.teamId
        ? matchup.away
        : matchup.home;
  return {
    kind: 'matchup',
    league,
    status: week.status,
    mine: { team, points: result.mine.points },
    opponent: opponentSide,
    outcome: result.outcome,
  };
}

function winFrom(league: League, week: LeagueWeek, team: Team): MyWin | null {
  const entry = toLeagueWeek(league, week, team);
  if (entry.kind !== 'matchup' || entry.outcome !== 'win' || entry.opponent === null) return null;
  return {
    key: `${leagueRefKey(league.ref)}:w${String(week.week)}`,
    league,
    week: week.week,
    myPoints: entry.mine.points,
    opponentPoints: entry.opponent.points,
    opponentName: entry.opponent.team.teamName,
  };
}

async function loadOne(
  provider: FantasyProvider,
  league: League,
  user: ProviderUser,
  week: number,
): Promise<{ entry: MyLeagueWeek; win: MyWin | null }> {
  if (!ACTIVE.has(league.status)) {
    return { entry: { kind: 'none', league, reason: 'not_started' }, win: null };
  }
  try {
    const teams = await provider.getTeams(league.ref);
    const team = myTeam(teams, user);
    if (team === undefined)
      return { entry: { kind: 'none', league, reason: 'no_team' }, win: null };
    const shown = await resolveWeek(provider, league, teams, week);
    const scored = celebrationWeek(league);
    const scoredWeek =
      scored === null
        ? null
        : scored === week
          ? shown
          : await resolveWeek(provider, league, teams, scored);
    return {
      entry: toLeagueWeek(league, shown, team),
      win: scoredWeek === null ? null : winFrom(league, scoredWeek, team),
    };
  } catch {
    // One league's provider hiccup shouldn't blank the whole page.
    return { entry: { kind: 'unavailable', league }, win: null };
  }
}

export function loadMyMatchups(
  username: string,
  week: number | null,
  provider: FantasyProvider & UsernameLookup = sleeperProvider(),
): Promise<LoadResult<MyMatchups>> {
  return loadSafely(async () => {
    const [user, season] = await Promise.all([
      provider.findUser(username),
      provider.currentSeason('nfl'),
    ]);
    const { items } = await provider.listLeagues(user, 'nfl', season);
    const leagues = [...items].sort((a, b) => a.name.localeCompare(b.name));
    const chosen = week ?? commonDefaultWeek(leagues.filter((l) => ACTIVE.has(l.status)));
    const loaded = await Promise.all(
      leagues.map((league) => loadOne(provider, league, user, chosen)),
    );
    return {
      user,
      season,
      week: chosen,
      leagues: loaded.map((l) => l.entry),
      wins: loaded.flatMap((l) => (l.win === null ? [] : [l.win])),
    };
  });
}
