// Maps validated Sleeper shapes to domain types (DESIGN §5.2). Pure. Does not own validation
// (raw.ts) or fetching (adapter.ts).
import type { League, LeagueStatus, ProviderUser, Team } from '@ffc/domain';
import type { SleeperLeague, SleeperLeagueUser, SleeperRoster, SleeperUser } from './raw';

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
  };
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
