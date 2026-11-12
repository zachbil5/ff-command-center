// Small pill for a week's state or a matchup result.
import type { MatchupOutcome } from '@ffc/analysis';
import type { MatchupStatus } from '@ffc/domain';
import { MATCHUP_STATUS_LABEL, OUTCOME_LABEL } from './labels';

const TONE = {
  neutral: 'bg-border text-muted',
  live: 'bg-accent/15 text-accent',
  good: 'bg-accent text-white',
  bad: 'bg-red-500/15 text-red-600 dark:text-red-400',
} as const;

function Pill({ tone, children }: { tone: keyof typeof TONE; children: string }) {
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${TONE[tone]}`}>
      {children}
    </span>
  );
}

export function StatusBadge({ status }: { status: MatchupStatus }) {
  return <Pill tone={status === 'live' ? 'live' : 'neutral'}>{MATCHUP_STATUS_LABEL[status]}</Pill>;
}

export function OutcomeBadge({ outcome }: { outcome: MatchupOutcome | 'bye' }) {
  if (outcome === 'pending') return null;
  const tone = outcome === 'win' ? 'good' : outcome === 'loss' ? 'bad' : 'neutral';
  return <Pill tone={tone}>{OUTCOME_LABEL[outcome]}</Pill>;
}
