// Invites (owner only, DESIGN §6.1): who may create an account. Everyone else gets a 404.
import type { Metadata } from 'next';
import { Notice } from '@/components/notice';
import { PageShell } from '@/components/page-shell';
import { requireOwner } from '@/features/auth';
import { loadInvites } from '@/features/invites';
import { addInviteAction, removeInviteAction } from '@/features/invites/actions';

export const metadata: Metadata = { title: 'Invites · Fantasy Football Center' };

const STATUS: Record<string, string> = {
  added: 'Invite added. They can sign in with that Google account now.',
  already_invited: 'That email is already invited.',
  invalid_email: 'That doesn’t look like an email address.',
  removed: 'Invite removed. Anyone already signed up keeps their account.',
};

export default async function InvitesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const owner = await requireOwner();
  const { status } = await searchParams;
  const invites = await loadInvites();
  const message = typeof status === 'string' ? STATUS[status] : undefined;

  return (
    <PageShell user={owner}>
      <h1 className="text-2xl font-bold tracking-tight">Invites</h1>
      <p className="text-sm text-muted">
        Only these Google accounts (and yours) can create an account. Removing an invite doesn’t
        delete an account that already exists.
      </p>
      {message ? <Notice title={message} /> : null}
      <form action={addInviteAction} className="flex flex-col gap-2 sm:flex-row">
        <label htmlFor="email" className="sr-only">
          Email to invite
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          maxLength={254}
          autoComplete="off"
          placeholder="friend@gmail.com"
          className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 outline-none focus:border-accent"
        />
        <button
          type="submit"
          className="rounded-lg bg-accent px-4 py-2 font-medium text-white hover:opacity-90"
        >
          Invite
        </button>
      </form>
      {invites.length === 0 ? (
        <Notice title="No invites yet" />
      ) : (
        <ul className="flex flex-col divide-y divide-border rounded-xl border border-border bg-surface">
          {invites.map((invite) => (
            <li key={invite.email} className="flex items-center justify-between gap-3 px-4 py-2">
              <span className="truncate">{invite.email}</span>
              <form action={removeInviteAction}>
                <input type="hidden" name="email" value={invite.email} />
                <button type="submit" className="text-sm text-muted hover:underline">
                  Remove
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
