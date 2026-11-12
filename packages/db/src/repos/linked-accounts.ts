// A user's linked provider accounts (DESIGN §6.1). One per provider for now.
// Does not own verifying the account exists at the provider (the web feature does that first).
import type { ProviderId } from '@ffc/domain';
import { and, eq } from 'drizzle-orm';
import type { Database } from '../client';
import { linkedAccount } from '../schema';

export interface LinkedAccount {
  readonly provider: ProviderId;
  readonly externalUserId: string;
  readonly username: string;
  readonly displayName: string;
}

export async function getLinkedAccount(
  db: Database,
  userId: string,
  provider: ProviderId,
): Promise<LinkedAccount | null> {
  const [row] = await db
    .select({
      externalUserId: linkedAccount.externalUserId,
      username: linkedAccount.username,
      displayName: linkedAccount.displayName,
    })
    .from(linkedAccount)
    .where(and(eq(linkedAccount.userId, userId), eq(linkedAccount.provider, provider)));
  return row === undefined ? null : { provider, ...row };
}

/** Links (or re-links) the user's account at `account.provider`. */
export async function saveLinkedAccount(
  db: Database,
  userId: string,
  account: LinkedAccount,
): Promise<void> {
  const values = {
    externalUserId: account.externalUserId,
    username: account.username,
    displayName: account.displayName,
  };
  await db
    .insert(linkedAccount)
    .values({ userId, provider: account.provider, ...values })
    .onConflictDoUpdate({ target: [linkedAccount.userId, linkedAccount.provider], set: values });
}

export async function removeLinkedAccount(
  db: Database,
  userId: string,
  provider: ProviderId,
): Promise<void> {
  await db
    .delete(linkedAccount)
    .where(and(eq(linkedAccount.userId, userId), eq(linkedAccount.provider, provider)));
}
