// Home: Sleeper username search (DESIGN §6 F1). Composition only.
import { Notice } from '@/components/notice';
import { PageShell } from '@/components/page-shell';
import { UsernameForm } from '@/components/username-form';
import { routes } from '@/routes';

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { error } = await searchParams;
  return (
    <PageShell>
      <section className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">All your leagues, one place</h1>
        <p className="text-muted">
          Enter your Sleeper username to see every NFL league you’re in this season. Yahoo is coming
          next.
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
