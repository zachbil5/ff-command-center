'use server';
// Auth server actions. Next.js checks the Origin header on every server action, and Better
// Auth's session cookie is SameSite=Lax, so these can't be triggered cross-site.
import { redirect } from 'next/navigation';
import { routes } from '@/routes';
import { signOut } from './session';

export async function signOutAction(): Promise<void> {
  await signOut();
  redirect(routes.signIn());
}
