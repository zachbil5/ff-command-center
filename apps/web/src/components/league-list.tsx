// List of league cards linking to each league page. Presentational: links come in as props.
import type { League } from '@ffc/domain';
import Link from 'next/link';
import { Avatar } from './avatar';
import { LEAGUE_STATUS_LABEL, PROVIDER_LABEL } from './labels';

export interface LeagueListItem {
  readonly league: League;
  readonly href: string;
  readonly avatarSrc: string | null;
}

export function LeagueList({ items }: { items: readonly LeagueListItem[] }) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map(({ league, href, avatarSrc }) => (
        <li key={`${league.ref.provider}:${league.ref.leagueId}`}>
          <Link
            href={href}
            className="flex items-center gap-3 rounded-xl border border-border bg-surface p-4 hover:border-accent"
          >
            <Avatar src={avatarSrc} name={league.name} size="lg" />
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="truncate font-semibold">{league.name}</span>
              <span className="text-sm text-muted">
                {PROVIDER_LABEL[league.ref.provider]} · {league.teamCount} teams ·{' '}
                {LEAGUE_STATUS_LABEL[league.status]}
              </span>
            </span>
            <span aria-hidden className="text-muted">
              ›
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
