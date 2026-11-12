// One team's line in a matchup: avatar, names, points. Presentational.
import type { Team } from '@ffc/domain';
import { Avatar } from './avatar';
import { formatPoints } from './labels';

export function MatchupRow({
  team,
  points,
  avatarSrc,
  emphasis,
  highlight = false,
}: {
  team: Team;
  points: number;
  avatarSrc: string | null;
  /** Bold the winner once a week is final. */
  emphasis: boolean;
  /** Mark the viewer's own team. */
  highlight?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${highlight ? 'bg-accent/10' : ''}`}
    >
      <Avatar src={avatarSrc} name={team.teamName} size="sm" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={`truncate ${emphasis ? 'font-bold' : 'font-medium'}`}>
          {team.teamName}
          {highlight ? <span className="ml-2 text-xs text-accent">You</span> : null}
        </span>
        <span className="truncate text-xs text-muted">{team.ownerName ?? 'No manager'}</span>
      </span>
      <span className={`tabular-nums ${emphasis ? 'font-bold' : ''}`}>{formatPoints(points)}</span>
    </div>
  );
}
