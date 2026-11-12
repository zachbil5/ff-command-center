// Page frame: app header and a centred content column. Layout only: the signed-in user comes
// in as a prop (pages already loaded it), and sign-out is a plain form posting a server action.
import Link from 'next/link';
import type { ReactNode } from 'react';
import { signOutAction } from '@/features/auth/actions';
import { routes } from '@/routes';

export interface ShellUser {
  readonly name: string;
  readonly isOwner: boolean;
}

export function PageShell({ children, user }: { children: ReactNode; user?: ShellUser }) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3">
          <Link href={routes.home()} className="font-bold tracking-tight">
            Fantasy Football Center
          </Link>
          {user ? (
            <nav aria-label="Account" className="ml-auto flex items-center gap-3 text-sm">
              <span className="hidden truncate text-muted sm:inline">{user.name}</span>
              {user.isOwner ? (
                <Link href={routes.invites()} className="hover:underline">
                  Invites
                </Link>
              ) : null}
              <Link href={routes.settings()} className="hover:underline">
                Settings
              </Link>
              <form action={signOutAction}>
                <button type="submit" className="text-muted hover:underline">
                  Sign out
                </button>
              </form>
            </nav>
          ) : null}
        </div>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">{children}</main>
    </div>
  );
}
