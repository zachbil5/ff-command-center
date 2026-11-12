// Sign-in page (DESIGN §6.1). Public. Already signed-in visitors go home.
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { GoogleSignInButton } from '@/components/google-sign-in-button';
import { Notice } from '@/components/notice';
import { PageShell } from '@/components/page-shell';
import { getCurrentUser, NOT_INVITED } from '@/features/auth';
import { routes } from '@/routes';

export const metadata: Metadata = { title: 'Sign in · Fantasy Football Center' };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if ((await getCurrentUser()) !== null) redirect(routes.home());
  const { error } = await searchParams;
  const notInvited =
    typeof error === 'string' &&
    (error.toLowerCase().includes(NOT_INVITED) || error === 'unable_to_create_user');

  return (
    <PageShell>
      <section className="mx-auto flex w-full max-w-sm flex-col gap-4 rounded-xl border border-border bg-surface p-6">
        <h1 className="text-2xl font-bold tracking-tight">Sign in</h1>
        <p className="text-sm text-muted">
          Fantasy Football Center is invite-only. Sign in with the Google account your invite was
          sent to.
        </p>
        <GoogleSignInButton callbackPath={routes.home()} />
      </section>
      {notInvited ? (
        <Notice title="That Google account isn’t invited">
          Ask the person who runs this site to add your email, then try again.
        </Notice>
      ) : typeof error === 'string' ? (
        <Notice title="Sign-in didn’t work">Please try again.</Notice>
      ) : null}
    </PageShell>
  );
}
