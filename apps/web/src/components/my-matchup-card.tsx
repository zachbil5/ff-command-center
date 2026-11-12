// One league's card on "My matchups": me vs opponent, status and result. Presentational:
// links, avatar URLs and the replay key come in as props.
import type { MyLeagueWeek } from '@/features/matchups';
import Link from 'next/link';
import { MatchupRow } from './matchup-row';
import { OutcomeBadge, StatusBadge } from './status-badge';
import { ReplayCelebrationButton } from './win-celebration';

const NONE_TEXT = {
  not_started: 'Season hasn’t started yet.',
  no_game: 'No matchup this week.',
  no_team: 'You don’t have a team in this league.',
} as const;

export function MyMatchupCard({
  entry,
  leagueHref,
  avatarSrc,
  replayKey,
}: {
  entry: MyLeagueWeek;
  leagueHref: string;
  avatarSrc: (avatarId: string | null) => string | null;
  /** Set when this card is a celebrated win, to offer "Replay". */
  replayKey: string | null;
}) {
  return (
    <article className="flex flex-col gap-2 rounded-xl border border-border bg-surface p-4">
      <header className="flex items-center justify-between gap-2">
        <Link href={leagueHref} className="truncate font-semibold hover:underline">
          {entry.league.name}
        </Link>
        {entry.kind === 'matchup' ? (
          <span className="flex shrink-0 items-center gap-2">
            {replayKey !== null ? <ReplayCelebrationButton winKey={replayKey} /> : null}
            <OutcomeBadge outcome={entry.outcome} />
            <StatusBadge status={entry.status} />
          </span>
        ) : null}
      </header>
      {entry.kind === 'matchup' ? (
        <div className="flex flex-col gap-1">
          <MatchupRow
            team={entry.mine.team}
            points={entry.mine.points}
            avatarSrc={avatarSrc(entry.mine.team.avatarId)}
            emphasis={entry.outcome === 'win'}
            highlight
          />
          {entry.opponent === null ? (
            <p className="px-2 text-sm text-muted">Bye week</p>
          ) : (
            <MatchupRow
              team={entry.opponent.team}
              points={entry.opponent.points}
              avatarSrc={avatarSrc(entry.opponent.team.avatarId)}
              emphasis={entry.outcome === 'loss'}
            />
          )}
        </div>
      ) : entry.kind === 'none' ? (
        <p className="text-sm text-muted">{NONE_TEXT[entry.reason]}</p>
      ) : (
        <p className="text-sm text-muted">Couldn’t load this league right now.</p>
      )}
    </article>
  );
}
