// Who is signed in, for pages and server actions (DESIGN §6.1). The proxy's cookie check is
// only a fast redirect; this is the real check, against the session table.
// Does not own sign-in itself (auth.ts) or what a user may see (callers decide).
import { authEnv } from '@ffc/config';
import { normalizeEmail } from '@ffc/db';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { routes } from '@/routes';
import { getAuth } from './auth';

export interface CurrentUser {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly isOwner: boolean;
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const auth = await getAuth();
  const session = await auth.api.getSession({ headers: await headers() });
  if (session === null) return null;
  const { id, email, name } = session.user;
  return { id, email, name, isOwner: normalizeEmail(email) === authEnv().OWNER_EMAIL };
}

/** The signed-in user, or a redirect to the sign-in page. */
export async function requireUser(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (user === null) redirect(routes.signIn());
  return user;
}

/** The signed-in owner; anyone else gets the same 404 as a missing page. */
export async function requireOwner(): Promise<CurrentUser> {
  const user = await requireUser();
  if (!user.isOwner) notFound();
  return user;
}

export async function signOut(): Promise<void> {
  const auth = await getAuth();
  await auth.api.signOut({ headers: await headers() });
}
