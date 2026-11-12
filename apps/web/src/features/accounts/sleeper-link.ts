// Linking a user's Sleeper account (DESIGN §6.1): the username is checked against Sleeper
// before anything is saved. Does not own the form (pages) or storage (db).
import {
  getDatabase,
  getLinkedAccount,
  removeLinkedAccount,
  saveLinkedAccount,
  type Database,
  type LinkedAccount,
} from '@ffc/db';
import { ProviderNotFoundError, type UsernameLookup } from '@ffc/providers';
import { parseSleeperUsername, type SettingsStatus } from '@/routes';
import { sleeperProvider } from '../provider-access';

export async function linkSleeper(
  userId: string,
  rawUsername: unknown,
  lookup: UsernameLookup = sleeperProvider(),
  database?: Database,
): Promise<SettingsStatus> {
  const username = parseSleeperUsername(rawUsername);
  if (username === null) return 'invalid';
  let found;
  try {
    found = await lookup.findUser(username);
  } catch (error) {
    return error instanceof ProviderNotFoundError ? 'not_found' : 'unavailable';
  }
  const db = database ?? (await getDatabase()).db;
  await saveLinkedAccount(db, userId, {
    provider: 'sleeper',
    externalUserId: found.userId,
    username: found.username,
    displayName: found.displayName,
  });
  return 'linked';
}

export async function unlinkSleeper(userId: string): Promise<SettingsStatus> {
  const { db } = await getDatabase();
  await removeLinkedAccount(db, userId, 'sleeper');
  return 'unlinked';
}

export async function linkedSleeper(userId: string): Promise<LinkedAccount | null> {
  const { db } = await getDatabase();
  return getLinkedAccount(db, userId, 'sleeper');
}
