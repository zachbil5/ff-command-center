// User-facing labels and number formats for domain values. One home so pages agree.
import type { MatchupOutcome } from '@ffc/analysis';
import type { LeagueStatus, MatchupStatus, ProviderId } from '@ffc/domain';

export const PROVIDER_LABEL: Record<ProviderId, string> = {
  sleeper: 'Sleeper',
  yahoo: 'Yahoo',
};

export const LEAGUE_STATUS_LABEL: Record<LeagueStatus, string> = {
  pre_draft: 'Pre-draft',
  drafting: 'Drafting',
  in_season: 'In season',
  complete: 'Complete',
};

export const MATCHUP_STATUS_LABEL: Record<MatchupStatus, string> = {
  upcoming: 'Upcoming',
  // Sleeper's current week starts before kickoff, so "Live" would mislead early in the week.
  live: 'This week',
  final: 'Final',
};

export const OUTCOME_LABEL: Record<Exclude<MatchupOutcome, 'pending'> | 'bye', string> = {
  win: 'Won',
  loss: 'Lost',
  tie: 'Tied',
  bye: 'Bye',
};

const points = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const pct = new Intl.NumberFormat('en-US', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

export function formatPoints(value: number): string {
  return points.format(value);
}

/** Win percentage in the sports style: .750, 1.000. */
export function formatWinPct(value: number): string {
  return pct.format(value).replace(/^0(?=\.)/, '');
}

export function formatRecord(wins: number, losses: number, ties: number): string {
  return ties > 0 ? `${wins}-${losses}-${ties}` : `${wins}-${losses}`;
}
