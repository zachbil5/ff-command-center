// "My matchups": the user's matchup in every league for a week, with the win celebration
// (DESIGN F2, F6). Composition only.
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CACHE_TTL_SECONDS } from '@ffc/config';
import { getSport, leagueRefKey } from '@ffc/domain';
import { avatarUrl } from '@ffc/providers';
import { LiveRefresh } from '@/components/live-refresh';
import { MyMatchupCard } from '@/components/my-matchup-card';
import { Notice } from '@/components/notice';
import { PageShell } from '@/components/page-shell';
import { WeekNav } from '@/components/week-nav';
import { WinCelebration } from '@/components/win-celebration';
import { linkedSleeper } from '@/features/accounts';
import { requireUser } from '@/features/auth';
import { celebrationsFor, loadMyMatchups } from '@/features/matchups';
import { markCelebratedAction } from '@/features/matchups/actions';
import { parseSleeperUsername, parseWeek, routes } from '@/routes';

export const metadata: Metadata = { title: 'My matchups · Fantasy Football Center' };

export default async function MyMatchupsPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const username = parseSleeperUsername(decodeURIComponent((await params).username));
  if (username === null) notFound();
  const week = parseWeek((await searchParams).week, 'nfl');
  const result = await loadMyMatchups(username, week);
  if (result.kind === 'not_found') notFound();

  if (result.kind === 'unavailable') {
    return (
      <PageShell user={user}>
        <Notice
          title="Sleeper isn’t answering right now"
          action={{ href: routes.myMatchups(username, week ?? undefined), label: 'Try again' }}
        >
          This is usually brief.
        </Notice>
      </PageShell>
    );
  }

  // Celebrate only on the signed-in user's own linked account, never a friend's username.
  const linked = await linkedSleeper(user.id);
  const celebrations = await celebrationsFor(
    user.id,
    result.wins,
    linked?.externalUserId === result.user.userId,
  );
  const replayKeyFor = (leagueKey: string) =>
    celebrations.replayable.find((w) => w.leagueKey === leagueKey && w.week === result.week)?.key ??
    null;
  const anyLive = result.leagues.some((l) => l.kind === 'matchup' && l.status === 'live');

  return (
    <PageShell user={user}>
      <WinCelebration
        unseen={celebrations.unseen}
        replayable={celebrations.replayable}
        markSeen={markCelebratedAction}
      />
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {result.user.displayName}’s matchups
          </h1>
          <p className="text-sm text-muted">
            Sleeper · NFL {result.season} ·{' '}
            <Link href={routes.sleeperUser(result.user.username)} className="hover:underline">
              All leagues
            </Link>
          </p>
        </div>
        <WeekNav
          week={result.week}
          maxWeek={getSport('nfl').maxWeek}
          hrefFor={(w) => routes.myMatchups(result.user.username, w)}
        />
      </header>
      {anyLive ? <LiveRefresh intervalMs={CACHE_TTL_SECONDS.matchupsLive * 1000} /> : null}
      {result.leagues.length === 0 ? (
        <Notice title={`No NFL leagues in ${result.season}`} />
      ) : (
        <div className="flex flex-col gap-3">
          {result.leagues.map((entry) => (
            <MyMatchupCard
              key={leagueRefKey(entry.league.ref)}
              entry={entry}
              leagueHref={routes.league(entry.league.ref, {
                me: result.user.userId,
                week: result.week,
              })}
              avatarSrc={(id) => avatarUrl(entry.league.ref.provider, id)}
              replayKey={replayKeyFor(leagueRefKey(entry.league.ref))}
            />
          ))}
        </div>
      )}
    </PageShell>
  );
}
