// Invite list: who may create an account (DESIGN §6.1). Emails are stored lower-cased.
// Does not own the sign-up hook (web auth feature) or deciding who the owner is (config).
import { asc, eq } from 'drizzle-orm';
import { z } from 'zod';
import type { Database } from '../client';
import { invite } from '../schema';

const EmailSchema = z.string().trim().toLowerCase().max(254).pipe(z.email());

/** Lower-cased, trimmed email, or null when it isn't a valid address. */
export function normalizeEmail(raw: unknown): string | null {
  const result = EmailSchema.safeParse(raw);
  return result.success ? result.data : null;
}

/** True when `email` is the owner's or on the invite list. */
export async function canSignUp(db: Database, email: string, ownerEmail: string): Promise<boolean> {
  const normalized = normalizeEmail(email);
  if (normalized === null) return false;
  if (normalized === normalizeEmail(ownerEmail)) return true;
  const rows = await db
    .select({ email: invite.email })
    .from(invite)
    .where(eq(invite.email, normalized));
  return rows.length > 0;
}

export async function listInvites(db: Database) {
  return db
    .select({ email: invite.email, createdAt: invite.createdAt })
    .from(invite)
    .orderBy(asc(invite.email));
}

export type AddInviteResult = 'added' | 'already_invited' | 'invalid_email';

export async function addInvite(
  db: Database,
  rawEmail: unknown,
  invitedBy: string,
): Promise<AddInviteResult> {
  const email = normalizeEmail(rawEmail);
  if (email === null) return 'invalid_email';
  const inserted = await db
    .insert(invite)
    .values({ email, invitedBy })
    .onConflictDoNothing()
    .returning({ email: invite.email });
  return inserted.length > 0 ? 'added' : 'already_invited';
}

export async function removeInvite(db: Database, rawEmail: unknown): Promise<void> {
  const email = normalizeEmail(rawEmail);
  if (email === null) return;
  await db.delete(invite).where(eq(invite.email, email));
}
