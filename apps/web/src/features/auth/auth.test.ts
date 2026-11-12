// Integration test: the real Better Auth instance on a real (in-memory) Postgres with our
// migrations. Proves the hand-written auth tables fit Better Auth, that the invite gate runs on
// every user creation, and that sessions round-trip.
import { addInvite, type Database } from '@ffc/db';
import { createTestDatabase, insertUser } from '@ffc/db/testing';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { buildAuth, NOT_INVITED } from './auth';

const env = {
  BETTER_AUTH_SECRET: 'test-secret-that-is-long-enough-1234567890',
  BETTER_AUTH_URL: 'http://localhost:3000',
  GOOGLE_CLIENT_ID: 'test-client-id',
  GOOGLE_CLIENT_SECRET: 'test-client-secret',
  OWNER_EMAIL: 'owner@example.com',
};

let db: Database;
let close: () => Promise<void>;

beforeEach(async () => {
  ({ db, close } = await createTestDatabase());
});

afterEach(async () => {
  await close();
});

async function createUser(email: string) {
  const ctx = await buildAuth(db, env).$context;
  // Same provisioning source a real Google sign-up uses.
  return ctx.internalAdapter.createUser(
    { email, name: email.split('@')[0] ?? 'x', emailVerified: true },
    { method: 'oauth', oauth: { providerId: 'google' } },
  );
}

describe('auth', () => {
  it('lets the owner sign up', async () => {
    const user = await createUser('Owner@Example.com');
    expect(user.email.toLowerCase()).toBe('owner@example.com');
  });

  it('refuses an email that is not invited', async () => {
    await expect(createUser('stranger@example.com')).rejects.toThrow(NOT_INVITED);
  });

  it('accepts an invited email, case-insensitively', async () => {
    const owner = await insertUser(db, 'owner-id', 'owner-row@example.com');
    await addInvite(db, 'friend@example.com', owner);
    await expect(createUser('FRIEND@example.com')).resolves.toMatchObject({ name: 'FRIEND' });
  });

  it('creates and finds sessions with our schema', async () => {
    const ctx = await buildAuth(db, env).$context;
    const user = await createUser('owner@example.com');
    const session = await ctx.internalAdapter.createSession(user.id);
    const found = await ctx.internalAdapter.findSession(session.token);
    expect(found?.user.id).toBe(user.id);
    await ctx.internalAdapter.deleteSession(session.token);
    expect(await ctx.internalAdapter.findSession(session.token)).toBeNull();
  });
});
