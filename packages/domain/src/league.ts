// Provider-neutral shapes for a user, a league and its teams (DESIGN §5.1). Adapters map raw
// provider JSON into these; features and UI only see these. Does not own fetching or ranking.
import type { LeagueRef } from './league-ref';
import type { ProviderId } from './provider-id';
import type { ScoringKind } from './sport';

export interface ProviderUser {
  readonly provider: ProviderId;
  readonly userId: string;
  readonly username: string;
  readonly displayName: string;
  /** Provider-specific avatar id; turned into a URL by the provider package. */
  readonly avatarId: string | null;
}

export const LEAGUE_STATUSES = ['pre_draft', 'drafting', 'in_season', 'complete'] as const;
export type LeagueStatus = (typeof LEAGUE_STATUSES)[number];

export interface League {
  readonly ref: LeagueRef;
  readonly name: string;
  readonly status: LeagueStatus;
  readonly teamCount: number;
  readonly scoringKind: ScoringKind;
  readonly avatarId: string | null;
}

export interface TeamRecord {
  readonly wins: number;
  readonly losses: number;
  readonly ties: number;
  readonly pointsFor: number;
  readonly pointsAgainst: number;
}

export interface Team {
  /** Unique within its league. */
  readonly teamId: string;
  /** Null for an orphaned team with no manager. */
  readonly ownerUserId: string | null;
  /** Null for an orphaned team. */
  readonly ownerName: string | null;
  readonly teamName: string;
  readonly avatarId: string | null;
  readonly record: TeamRecord;
}
