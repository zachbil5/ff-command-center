// League page: standings for one league (DESIGN §6 F1, F3). Composition only.
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { avatarUrl } from '@ffc/providers';
import { Avatar } from '@/components/avatar';
import { LEAGUE_STATUS_LABEL, PROVIDER_LABEL } from '@/components/labels';
import { Notice } from '@/components/notice';
import { PageShell } from '@/components/page-shell';
import { StandingsTable } from '@/components/standings-table';
import { loadLeagueStandings } from '@/features/leagues';
import { parseLeagueParams, parseMe, routes } from '@/routes';

export const metadata: Metadata = { title: 'League · Fantasy Football Center' };

export default async function LeaguePage({
  params,
  searchParams,
}: {
  params: Promise<{ provider: string; sport: string; season: string; leagueId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ref = parseLeagueParams(await params);
  if (ref === null) notFound();
  const me = parseMe((await searchParams).me);
  const result = await loadLeagueStandings(ref);
  if (result.kind === 'not_found') notFound();

  return (
    <PageShell>
      {result.kind === 'unavailable' ? (
        <Notice
          title={`${PROVIDER_LABEL[ref.provider]} isn’t answering right now`}
          action={{ href: routes.league(ref, me ?? undefined), label: 'Try again' }}
        >
          This is usually brief.
        </Notice>
      ) : (
        <>
          <header className="flex items-center gap-3">
            <Avatar
              src={avatarUrl(ref.provider, result.league.avatarId)}
              name={result.league.name}
              size="lg"
            />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold tracking-tight">{result.league.name}</h1>
              <p className="text-sm text-muted">
                {PROVIDER_LABEL[ref.provider]} · NFL {ref.season} · {result.league.teamCount} teams
                · {LEAGUE_STATUS_LABEL[result.league.status]}
              </p>
            </div>
          </header>
          <section className="flex flex-col gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Standings</h2>
            <StandingsTable
              rows={result.rows}
              meUserId={me}
              avatarSrc={(avatarId) => avatarUrl(ref.provider, avatarId)}
            />
            <p className="text-xs text-muted">
              Ranked by win percentage, then points for. {PROVIDER_LABEL[ref.provider]}’s own
              tiebreakers may differ.
            </p>
          </section>
        </>
      )}
    </PageShell>
  );
}
