// League standings table. Presentational: rows are ranked already; `meUserId` only highlights.
import type { StandingRow } from '@ffc/analysis';
import { Avatar } from './avatar';
import { formatPoints, formatRecord, formatWinPct } from './labels';

export interface StandingsTableProps {
  readonly rows: readonly StandingRow[];
  readonly avatarSrc: (avatarId: string | null) => string | null;
  readonly meUserId: string | null;
}

export function StandingsTable({ rows, avatarSrc, meUserId }: StandingsTableProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-surface">
      <table className="w-full text-sm">
        <caption className="sr-only">League standings</caption>
        <thead className="text-left text-xs uppercase tracking-wide text-muted">
          <tr className="border-b border-border">
            <th scope="col" className="px-3 py-2 text-right">
              #
            </th>
            <th scope="col" className="px-3 py-2">
              Team
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              Record
            </th>
            <th scope="col" className="hidden px-3 py-2 text-right sm:table-cell">
              Pct
            </th>
            <th scope="col" className="px-3 py-2 text-right">
              PF
            </th>
            <th scope="col" className="hidden px-3 py-2 text-right sm:table-cell">
              PA
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ rank, team, winPct }) => {
            const isMe = meUserId !== null && team.ownerUserId === meUserId;
            const { wins, losses, ties, pointsFor, pointsAgainst } = team.record;
            return (
              <tr
                key={team.teamId}
                aria-current={isMe ? 'true' : undefined}
                className={`border-b border-border last:border-0 ${isMe ? 'bg-accent/10' : ''}`}
              >
                <td className="px-3 py-2 text-right tabular-nums text-muted">{rank}</td>
                {/* w-full + max-w-0 lets long names truncate instead of widening the table,
                    so PF stays visible on phones. */}
                <td className="w-full max-w-0 px-3 py-2">
                  <span className="flex items-center gap-2">
                    <Avatar src={avatarSrc(team.avatarId)} name={team.teamName} size="sm" />
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate font-medium">
                        {team.teamName}
                        {isMe ? <span className="ml-2 text-xs text-accent">You</span> : null}
                      </span>
                      <span className="truncate text-xs text-muted">
                        {team.ownerName ?? 'No manager'}
                      </span>
                    </span>
                  </span>
                </td>
                <td className="px-3 py-2 text-right tabular-nums">
                  {formatRecord(wins, losses, ties)}
                </td>
                <td className="hidden px-3 py-2 text-right tabular-nums sm:table-cell">
                  {formatWinPct(winPct)}
                </td>
                <td className="px-3 py-2 text-right tabular-nums">{formatPoints(pointsFor)}</td>
                <td className="hidden px-3 py-2 text-right tabular-nums sm:table-cell">
                  {formatPoints(pointsAgainst)}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
