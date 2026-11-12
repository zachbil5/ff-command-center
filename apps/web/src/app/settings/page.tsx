// Settings: link or unlink a Sleeper account (DESIGN §6.1). Composition only; the forms post
// server actions that re-check the session.
import type { Metadata } from 'next';
import Link from 'next/link';
import { Notice } from '@/components/notice';
import { PageShell } from '@/components/page-shell';
import { linkedSleeper } from '@/features/accounts';
import { linkSleeperAction, unlinkSleeperAction } from '@/features/accounts/actions';
import { requireUser } from '@/features/auth';
import { routes, type SettingsStatus } from '@/routes';

export const metadata: Metadata = { title: 'Settings · Fantasy Football Center' };

const STATUS: Record<SettingsStatus, { title: string; detail?: string }> = {
  linked: { title: 'Sleeper account linked' },
  unlinked: { title: 'Sleeper account unlinked' },
  invalid: {
    title: 'That doesn’t look like a Sleeper username',
    detail: 'Sleeper usernames use letters, numbers and underscores.',
  },
  not_found: {
    title: 'No Sleeper user by that name',
    detail: 'Use the username on your Sleeper profile, not your display name.',
  },
  unavailable: { title: 'Sleeper isn’t answering right now', detail: 'Try again in a minute.' },
};

function isStatus(value: unknown): value is SettingsStatus {
  return typeof value === 'string' && value in STATUS;
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireUser();
  const { status } = await searchParams;
  const linked = await linkedSleeper(user.id);
  const message = isStatus(status) ? STATUS[status] : null;

  return (
    <PageShell user={user}>
      <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
      {message ? <Notice title={message.title}>{message.detail}</Notice> : null}
      <section className="flex flex-col gap-3 rounded-xl border border-border bg-surface p-5">
        <h2 className="font-semibold">Sleeper</h2>
        {linked ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p>
              Linked as <span className="font-medium">{linked.displayName}</span>{' '}
              <span className="text-sm text-muted">(@{linked.username})</span>
            </p>
            <form action={unlinkSleeperAction}>
              <button type="submit" className="text-sm text-muted hover:underline">
                Unlink
              </button>
            </form>
          </div>
        ) : (
          <p className="text-sm text-muted">
            Link your Sleeper username so the app opens on your matchups and can celebrate your
            wins.
          </p>
        )}
        <form action={linkSleeperAction} className="flex flex-col gap-2 sm:flex-row">
          <label htmlFor="username" className="sr-only">
            Sleeper username
          </label>
          <input
            id="username"
            name="username"
            defaultValue={linked?.username ?? ''}
            placeholder="Your Sleeper username"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            required
            minLength={2}
            maxLength={40}
            pattern="[A-Za-z0-9_]+"
            className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-accent"
          />
          <button
            type="submit"
            className="rounded-lg bg-accent px-4 py-2 font-medium text-white hover:opacity-90"
          >
            {linked ? 'Change' : 'Link'}
          </button>
        </form>
      </section>
      <p className="text-sm text-muted">
        Signed in as {user.email}. Yahoo linking is coming next.{' '}
        <Link href={routes.home()} className="hover:underline">
          Back home
        </Link>
      </p>
    </PageShell>
  );
}
