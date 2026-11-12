// Home (DESIGN §6.1): with a linked Sleeper account, go straight to your matchups; otherwise
// offer to link one, plus the username search. Composition only.
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Notice } from '@/components/notice';
import { PageShell } from '@/components/page-shell';
import { UsernameForm } from '@/components/username-form';
import { linkedSleeper } from '@/features/accounts';
import { requireUser } from '@/features/auth';
import { routes } from '@/routes';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const { error } = await searchParams;
  const linked = await linkedSleeper(user.id);
  if (linked !== null && error === undefined) redirect(routes.myMatchups(linked.username));

  return (
    <PageShell user={user}>
      <section className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">All your leagues, one place</h1>
        <p className="text-muted">
          <Link href={routes.settings()} className="font-medium text-accent hover:underline">
            Link your Sleeper account
          </Link>{' '}
          and this page will open on your matchups. Or look anyone up by Sleeper username:
        </p>
      </section>
      <UsernameForm action={routes.sleeperSearch} />
      {error === 'invalid_username' ? (
        <Notice title="That doesn’t look like a Sleeper username">
          Sleeper usernames use letters, numbers and underscores.
        </Notice>
      ) : null}
    </PageShell>
  );
}
