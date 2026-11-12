import fc from 'fast-check';
import { eq } from 'drizzle-orm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { Database } from '../client';
import { celebrationSeen, linkedAccount, user } from '../schema';
import { createTestDatabase, insertUser } from '../testing/test-database';
import { markCelebrated, unseenWins } from './celebrations';
import { addInvite, canSignUp, listInvites, normalizeEmail, removeInvite } from './invites';
import { getLinkedAccount, removeLinkedAccount, saveLinkedAccount } from './linked-accounts';

let db: Database;
let close: () => Promise<void>;

beforeEach(async () => {
  ({ db, close } = await createTestDatabase());
});

afterEach(async () => {
  await close();
});

describe('normalizeEmail', () => {
  it('trims and lower-cases valid addresses', () => {
    expect(normalizeEmail('  Friend@Example.COM ')).toBe('friend@example.com');
  });

  it.each([undefined, '', 'not-an-email', 'a@', '@b.com', 42, 'x'.repeat(250) + '@e.com'])(
    'rejects %j',
    (value) => {
      expect(normalizeEmail(value)).toBeNull();
    },
  );

  it('never returns an address with upper-case letters or outer spaces', () => {
    fc.assert(
      fc.property(fc.emailAddress(), fc.boolean(), (email, shout) => {
        const result = normalizeEmail(`  ${shout ? email.toUpperCase() : email} `);
        if (result !== null) expect(result).toBe(result.trim().toLowerCase());
      }),
    );
  });
});

describe('invites', () => {
  it('lets the owner and invited emails sign up, case-insensitively, and nobody else', async () => {
    const owner = await insertUser(db, 'u-owner', 'owner@example.com');
    expect(await addInvite(db, 'Friend@Example.com', owner)).toBe('added');
    expect(await addInvite(db, 'friend@example.com', owner)).toBe('already_invited');
    expect(await addInvite(db, 'nope', owner)).toBe('invalid_email');

    expect(await canSignUp(db, 'OWNER@example.com', 'owner@example.com')).toBe(true);
    expect(await canSignUp(db, 'FRIEND@example.com', 'owner@example.com')).toBe(true);
    expect(await canSignUp(db, 'stranger@example.com', 'owner@example.com')).toBe(false);
    expect(await canSignUp(db, 'not an email', 'owner@example.com')).toBe(false);

    expect((await listInvites(db)).map((i) => i.email)).toEqual(['friend@example.com']);
    await removeInvite(db, 'FRIEND@EXAMPLE.COM');
    expect(await canSignUp(db, 'friend@example.com', 'owner@example.com')).toBe(false);
  });

  it('keeps an invite when the inviter is deleted', async () => {
    const owner = await insertUser(db, 'u-owner', 'owner@example.com');
    await addInvite(db, 'friend@example.com', owner);
    await db.delete(user).where(eq(user.id, owner));
    expect(await canSignUp(db, 'friend@example.com', 'owner@example.com')).toBe(true);
  });
});

describe('linked accounts', () => {
  const sleeper = {
    provider: 'sleeper',
    externalUserId: '100',
    username: 'test_manager',
    displayName: 'Test',
  } as const;

  it('saves, re-links and removes one account per provider', async () => {
    const id = await insertUser(db, 'u1', 'u1@example.com');
    expect(await getLinkedAccount(db, id, 'sleeper')).toBeNull();
    await saveLinkedAccount(db, id, sleeper);
    expect(await getLinkedAccount(db, id, 'sleeper')).toEqual(sleeper);
    await saveLinkedAccount(db, id, { ...sleeper, externalUserId: '200', username: 'other_name' });
    expect(await getLinkedAccount(db, id, 'sleeper')).toMatchObject({ externalUserId: '200' });
    expect(await db.select().from(linkedAccount)).toHaveLength(1);
    await removeLinkedAccount(db, id, 'sleeper');
    expect(await getLinkedAccount(db, id, 'sleeper')).toBeNull();
  });

  it('keeps users apart', async () => {
    const a = await insertUser(db, 'a', 'a@example.com');
    const b = await insertUser(db, 'b', 'b@example.com');
    await saveLinkedAccount(db, a, sleeper);
    expect(await getLinkedAccount(db, b, 'sleeper')).toBeNull();
  });
});

describe('celebrations', () => {
  const w9 = { leagueKey: 'sleeper:nfl:2026:1', week: 9 };
  const w9b = { leagueKey: 'sleeper:nfl:2026:2', week: 9 };
  const w8 = { leagueKey: 'sleeper:nfl:2026:1', week: 8 };

  it('celebrates each league-week once per user', async () => {
    const a = await insertUser(db, 'a', 'a@example.com');
    const b = await insertUser(db, 'b', 'b@example.com');
    expect(await unseenWins(db, a, [w9, w9b, w8])).toEqual([w9, w9b, w8]);
    await markCelebrated(db, a, [w9]);
    await markCelebrated(db, a, [w9]);
    expect(await unseenWins(db, a, [w9, w9b, w8])).toEqual([w9b, w8]);
    expect(await unseenWins(db, b, [w9])).toEqual([w9]);
    expect(await unseenWins(db, a, [])).toEqual([]);
  });

  it('removes a user’s data when the user is deleted', async () => {
    const a = await insertUser(db, 'a', 'a@example.com');
    await markCelebrated(db, a, [w9]);
    await saveLinkedAccount(db, a, {
      provider: 'sleeper',
      externalUserId: '1',
      username: 'x_y',
      displayName: 'X',
    });
    await db.delete(user).where(eq(user.id, a));
    expect(await db.select().from(celebrationSeen)).toEqual([]);
    expect(await db.select().from(linkedAccount)).toEqual([]);
  });
});
