'use server';
// Invite form actions, owner only (DESIGN §6.1). Every export of a 'use server' file is a
// public endpoint, so each one calls requireOwner itself; reads live in invites.ts instead.
import { addInvite, getDatabase, removeInvite } from '@ffc/db';
import { redirect } from 'next/navigation';
import { routes } from '@/routes';
import { requireOwner } from '../auth';

export async function addInviteAction(form: FormData): Promise<void> {
  const owner = await requireOwner();
  const { db } = await getDatabase();
  redirect(routes.invites(await addInvite(db, form.get('email'), owner.id)));
}

export async function removeInviteAction(form: FormData): Promise<void> {
  await requireOwner();
  const { db } = await getDatabase();
  await removeInvite(db, form.get('email'));
  redirect(routes.invites('removed'));
}
