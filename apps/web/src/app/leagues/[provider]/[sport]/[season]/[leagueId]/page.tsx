// League page: a week's matchups plus standings (DESIGN §6 F1, F2, F3). Composition only:
// the two features load in parallel; Next.js dedupes their identical provider fetches.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { CACHE_TTL_SECONDS } from '@ffc/config';
import { getSport } from '@ffc/domain';
import { avatarUrl } from '@ffc/providers';
import { Avatar } from '@/components/avatar';
import { LEAGUE_STATUS_LABEL, PROVIDER_LABEL } from '@/components/labels';
import { LeagueMatchups } from '@/components/league-matchups';
import { LiveRefresh } from '@/components/live-refresh';
import { Notice } from '@/components/notice';
import { PageShell } from '@/components/page-shell';
import { StandingsTable } from '@/components/standings-table';
import { StatusBadge } from '@/components/status-badge';
import { WeekNav } from '@/components/week-nav';
import { loadLeagueStandings } from '@/features/leagues';
import { loadLeagueWeek } from '@/features/matchups';
import { parseLeagueParams, parseMe, parseWeek, routes } from '@/routes';

export const metadata: Metadata = { title: 'League · Fantasy Football Center' };

function SectionTitle({ children }: { children: string }) {
  return <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">{children}</h2>;
}

export default async function LeaguePage({
  params,
  searchParams,
}: {
  params: Promise<{ provider: string; sport: string; season: string; leagueId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ref = parseLeagueParams(await params);
  if (ref === null) notFound();
  const query = await searchParams;
  const me = parseMe(query.me);
  const requestedWeek = parseWeek(query.week, ref.sport);
  const [standings, week] = await Promise.all([
    loadLeagueStandings(ref),
    loadLeagueWeek(ref, requestedWeek),
  ]);
  if (standings.kind === 'not_found' || week.kind === 'not_found') notFound();

  if (standings.kind === 'unavailable') {
    return (
      <PageShell>
        <Notice
          title={`${PROVIDER_LABEL[ref.provider]} isn’t answering right now`}
          action={{
            href: routes.league(ref, { me: me ?? undefined, week: requestedWeek ?? undefined }),
            label: 'Try again',
          }}
        >
          This is usually brief.
        </Notice>
      </PageShell>
    );
  }

  const { league, rows } = standings;
  const avatarSrc = (avatarId: string | null) => avatarUrl(ref.provider, avatarId);

  return (
    <PageShell>
      <header className="flex items-center gap-3">
        <Avatar src={avatarUrl(ref.provider, league.avatarId)} name={league.name} size="lg" />
        <div className="min-w-0">
          <h1 className="truncate text-2xl font-bold tracking-tight">{league.name}</h1>
          <p className="text-sm text-muted">
            {PROVIDER_LABEL[ref.provider]} · NFL {ref.season} · {league.teamCount} teams ·{' '}
            {LEAGUE_STATUS_LABEL[league.status]}
          </p>
        </div>
      </header>

      <section className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="flex items-center gap-2">
            <SectionTitle>Matchups</SectionTitle>
            {week.kind === 'ok' ? <StatusBadge status={week.week.status} /> : null}
          </span>
          {week.kind === 'ok' ? (
            <WeekNav
              week={week.week.week}
              maxWeek={getSport(ref.sport).maxWeek}
              hrefFor={(w) => routes.league(ref, { me: me ?? undefined, week: w })}
            />
          ) : null}
        </div>
        {week.kind === 'unavailable' ? (
          <Notice title="Couldn’t load this week’s matchups">Standings are below.</Notice>
        ) : week.week.matchups.length === 0 ? (
          <Notice title={`No matchups in week ${String(week.week.week)}`}>
            Sleeper hasn’t scheduled games for this week in this league.
          </Notice>
        ) : (
          <>
            {week.week.status === 'live' ? (
              <LiveRefresh intervalMs={CACHE_TTL_SECONDS.matchupsLive * 1000} />
            ) : null}
            <LeagueMatchups matchups={week.week.matchups} avatarSrc={avatarSrc} meUserId={me} />
          </>
        )}
      </section>

      <section className="flex flex-col gap-2">
        <SectionTitle>Standings</SectionTitle>
        <StandingsTable rows={rows} meUserId={me} avatarSrc={avatarSrc} />
        <p className="text-xs text-muted">
          Ranked by win percentage, then points for. {PROVIDER_LABEL[ref.provider]}’s own
          tiebreakers may differ.
        </p>
      </section>
    </PageShell>
  );
}
