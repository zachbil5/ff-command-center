'use server';
// Settings form actions. Thin edges: check the session, call the feature, redirect with a
// status code the page renders. Next.js verifies the Origin of every server action.
import { redirect } from 'next/navigation';
import { routes } from '@/routes';
import { requireUser } from '../auth';
import { linkSleeper, unlinkSleeper } from './sleeper-link';

export async function linkSleeperAction(form: FormData): Promise<void> {
  const user = await requireUser();
  const status = await linkSleeper(user.id, form.get('username'));
  redirect(routes.settings(status));
}

export async function unlinkSleeperAction(): Promise<void> {
  const user = await requireUser();
  redirect(routes.settings(await unlinkSleeper(user.id)));
}
