// Every pairing in a league week (DESIGN F2 league-wide view). Presentational.
import type { ResolvedMatchup } from '@/features/matchups';
import { MatchupRow } from './matchup-row';

export function LeagueMatchups({
  matchups,
  avatarSrc,
  meUserId,
}: {
  matchups: readonly ResolvedMatchup[];
  avatarSrc: (avatarId: string | null) => string | null;
  meUserId: string | null;
}) {
  const isMe = (ownerUserId: string | null) => meUserId !== null && ownerUserId === meUserId;
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {matchups.map(({ matchupId, home, away, winner }) => (
        <li
          key={matchupId}
          className="flex flex-col gap-1 rounded-xl border border-border bg-surface p-3"
        >
          <MatchupRow
            team={home.team}
            points={home.points}
            avatarSrc={avatarSrc(home.team.avatarId)}
            emphasis={winner === 'home'}
            highlight={isMe(home.team.ownerUserId)}
          />
          {away === null ? (
            <p className="px-2 text-sm text-muted">Bye week</p>
          ) : (
            <MatchupRow
              team={away.team}
              points={away.points}
              avatarSrc={avatarSrc(away.team.avatarId)}
              emphasis={winner === 'away'}
              highlight={isMe(away.team.ownerUserId)}
            />
          )}
        </li>
      ))}
    </ul>
  );
}
