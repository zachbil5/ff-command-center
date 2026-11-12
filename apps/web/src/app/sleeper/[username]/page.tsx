// A Sleeper user's leagues for a season (DESIGN §6 F1). Composition only.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { avatarUrl } from '@ffc/providers';
import { LeagueList } from '@/components/league-list';
import { Notice } from '@/components/notice';
import { PageShell } from '@/components/page-shell';
import { requireUser } from '@/features/auth';
import { UsernameForm } from '@/components/username-form';
import { loadSleeperLeagues } from '@/features/leagues';
import { parseSeason, parseSleeperUsername, routes } from '@/routes';

export const metadata: Metadata = { title: 'Your leagues · Fantasy Football Center' };

export default async function SleeperUserPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const username = parseSleeperUsername(decodeURIComponent((await params).username));
  if (username === null) notFound();
  const season = parseSeason((await searchParams).season);
  const result = await loadSleeperLeagues(username, season);

  return (
    <PageShell user={user}>
      <UsernameForm action={routes.sleeperSearch} defaultValue={username} />
      {result.kind === 'not_found' ? (
        <Notice title={`No Sleeper user called “${username}”`}>
          Check the spelling. It’s the username on your Sleeper profile, not your display name.
        </Notice>
      ) : result.kind === 'unavailable' ? (
        <Notice
          title="Sleeper isn’t answering right now"
          action={{ href: routes.sleeperUser(username), label: 'Try again' }}
        >
          This is usually brief. Your leagues are fine.
        </Notice>
      ) : (
        <>
          <header className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                {result.user.displayName}’s leagues
              </h1>
              <p className="text-sm text-muted">
                Sleeper · NFL {result.season}
                {result.season === result.currentSeason ? (
                  <>
                    {' · '}
                    <Link
                      href={routes.myMatchups(result.user.username)}
                      className="font-medium text-accent hover:underline"
                    >
                      My matchups this week
                    </Link>
                  </>
                ) : null}
              </p>
            </div>
            <nav aria-label="Season" className="flex gap-3 text-sm">
              {[result.currentSeason, result.currentSeason - 1].map((year) => (
                <Link
                  key={year}
                  href={routes.sleeperUser(
                    result.user.username,
                    year === result.currentSeason ? undefined : year,
                  )}
                  aria-current={year === result.season ? 'page' : undefined}
                  className={
                    year === result.season
                      ? 'font-semibold text-accent'
                      : 'text-muted hover:underline'
                  }
                >
                  {year}
                </Link>
              ))}
            </nav>
          </header>
          {result.leagues.length === 0 ? (
            <Notice title={`No NFL leagues in ${result.season}`}>
              Leagues show up here once you’ve joined them on Sleeper.
            </Notice>
          ) : (
            <LeagueList
              items={result.leagues.map((league) => ({
                league,
                href: routes.league(league.ref, { me: result.user.userId }),
                avatarSrc: avatarUrl(league.ref.provider, league.avatarId),
              }))}
            />
          )}
          {result.skipped > 0 ? (
            <p className="text-sm text-muted">
              {result.skipped === 1 ? '1 league' : `${result.skipped} leagues`} couldn’t be read
              from Sleeper and
              {result.skipped === 1 ? ' is' : ' are'} hidden.
            </p>
          ) : null}
        </>
      )}
    </PageShell>
  );
}
