import { getLinkedAccount, type Database } from '@ffc/db';
import { createTestDatabase, insertUser } from '@ffc/db/testing';
import {
  ProviderNotFoundError,
  ProviderUnavailableError,
  type UsernameLookup,
} from '@ffc/providers';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { linkSleeper } from './sleeper-link';

let db: Database;
let close: () => Promise<void>;
let userId: string;

beforeEach(async () => {
  ({ db, close } = await createTestDatabase());
  userId = await insertUser(db, 'u1', 'u1@example.com');
});

afterEach(async () => {
  await close();
});

const found: UsernameLookup = {
  findUser: (username) =>
    Promise.resolve({
      provider: 'sleeper',
      userId: '100',
      username,
      displayName: 'Test Manager',
      avatarId: null,
    }),
};

describe('linkSleeper', () => {
  it('saves the account Sleeper confirms', async () => {
    expect(await linkSleeper(userId, ' test_manager ', found, db)).toBe('linked');
    expect(await getLinkedAccount(db, userId, 'sleeper')).toEqual({
      provider: 'sleeper',
      externalUserId: '100',
      username: 'test_manager',
      displayName: 'Test Manager',
    });
  });

  it('rejects malformed usernames without asking Sleeper', async () => {
    let asked = false;
    const spy: UsernameLookup = {
      findUser: (u) => {
        asked = true;
        return found.findUser(u);
      },
    };
    expect(await linkSleeper(userId, '../x', spy, db)).toBe('invalid');
    expect(await linkSleeper(userId, null, spy, db)).toBe('invalid');
    expect(asked).toBe(false);
  });

  it('saves nothing when Sleeper says no or is down', async () => {
    const missing: UsernameLookup = {
      findUser: () => Promise.reject(new ProviderNotFoundError('sleeper', 'user')),
    };
    const down: UsernameLookup = {
      findUser: () => Promise.reject(new ProviderUnavailableError('sleeper', 'HTTP 503')),
    };
    expect(await linkSleeper(userId, 'nobody_here', missing, db)).toBe('not_found');
    expect(await linkSleeper(userId, 'test_manager', down, db)).toBe('unavailable');
    expect(await getLinkedAccount(db, userId, 'sleeper')).toBeNull();
  });
});
