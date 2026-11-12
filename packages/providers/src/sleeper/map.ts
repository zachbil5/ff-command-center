// Maps validated Sleeper shapes to domain types (DESIGN §5.2). Pure. Does not own validation
// (raw.ts) or fetching (adapter.ts).
import type { League, LeagueStatus, Matchup, MatchupSide, ProviderUser, Team } from '@ffc/domain';
import type { PartialList } from '../provider';
import type {
  SleeperLeague,
  SleeperLeagueUser,
  SleeperMatchup,
  SleeperRoster,
  SleeperUser,
} from './raw';

const STATUS: Record<SleeperLeague['status'], LeagueStatus> = {
  pre_draft: 'pre_draft',
  drafting: 'drafting',
  in_season: 'in_season',
  postseason: 'in_season',
  complete: 'complete',
};

export function mapUser(raw: SleeperUser, requestedUsername: string): ProviderUser {
  return {
    provider: 'sleeper',
    userId: raw.user_id,
    username: raw.username ?? requestedUsername,
    displayName: raw.display_name,
    avatarId: raw.avatar,
  };
}

export function mapLeague(raw: SleeperLeague): League {
  return {
    ref: {
      provider: 'sleeper',
      sport: raw.sport,
      season: Number(raw.season),
      leagueId: raw.league_id,
    },
    name: raw.name,
    status: STATUS[raw.status],
    teamCount: raw.total_rosters,
    scoringKind: 'points',
    avatarId: raw.avatar,
    // Sleeper uses 0 for "no week yet"; the domain uses null.
    currentWeek: positiveOrNull(raw.settings?.leg),
    lastScoredWeek: positiveOrNull(raw.settings?.last_scored_leg),
  };
}

function positiveOrNull(value: number | null | undefined): number | null {
  return value !== null && value !== undefined && value >= 1 ? value : null;
}

/** Sleeper splits points into an integer and hundredths. */
function points(whole: number, hundredths: number): number {
  return Math.round(whole * 100 + hundredths) / 100;
}

/** Trimmed text, or null when missing or blank. */
function nonEmpty(value: string | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed === undefined || trimmed === '' ? null : trimmed;
}

/** Joins rosters (records) with league users (names) on owner id. */
export function mapTeams(
  rosters: readonly SleeperRoster[],
  users: readonly SleeperLeagueUser[],
): Team[] {
  const byId = new Map(users.map((user) => [user.user_id, user]));
  return rosters.map((roster) => {
    const ownerId = roster.owner_id ?? null;
    const owner = ownerId === null ? undefined : byId.get(ownerId);
    const s = roster.settings;
    return {
      teamId: String(roster.roster_id),
      ownerUserId: ownerId,
      ownerName: nonEmpty(owner?.display_name),
      // Custom team name, else the manager's name, else a numbered placeholder.
      teamName:
        nonEmpty(owner?.metadata?.team_name) ??
        nonEmpty(owner?.display_name) ??
        `Team ${roster.roster_id}`,
      avatarId: owner?.avatar ?? null,
      record: {
        wins: s.wins,
        losses: s.losses,
        ties: s.ties,
        pointsFor: points(s.fpts, s.fpts_decimal),
        pointsAgainst: points(s.fpts_against, s.fpts_against_decimal),
      },
    };
  });
}

function side(raw: SleeperMatchup): MatchupSide {
  // A commissioner's override wins over the computed score.
  return { teamId: String(raw.roster_id), points: raw.custom_points ?? raw.points ?? 0 };
}

/**
 * Pairs rosters that share a `matchup_id`. A roster with no `matchup_id`, or alone in its
 * group, has a bye. Groups larger than two, and rosters listed twice, can't be paired
 * honestly, so they are dropped and counted.
 */
export function mapMatchups(raws: readonly SleeperMatchup[], week: number): PartialList<Matchup> {
  const seen = new Set<number>();
  const groups = new Map<number, SleeperMatchup[]>();
  const byes: SleeperMatchup[] = [];
  let skipped = 0;
  for (const raw of raws) {
    if (seen.has(raw.roster_id)) {
      skipped += 1;
      continue;
    }
    seen.add(raw.roster_id);
    if (raw.matchup_id === null || raw.matchup_id === undefined) {
      byes.push(raw);
    } else {
      groups.set(raw.matchup_id, [...(groups.get(raw.matchup_id) ?? []), raw]);
    }
  }

  const items: Matchup[] = [];
  for (const [matchupId, group] of [...groups].sort(([a], [b]) => a - b)) {
    const [first, second, ...rest] = [...group].sort((a, b) => a.roster_id - b.roster_id);
    if (first === undefined) continue;
    if (rest.length > 0) {
      skipped += group.length;
      continue;
    }
    items.push({
      matchupId: String(matchupId),
      week,
      home: side(first),
      away: second === undefined ? null : side(second),
    });
  }
  for (const raw of byes) {
    items.push({ matchupId: `bye-${raw.roster_id}`, week, home: side(raw), away: null });
  }
  return { items, skipped };
}
