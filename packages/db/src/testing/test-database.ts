// A fresh in-memory Postgres (PGlite) with every migration applied, for tests.
// Test-only; not exported from the package facade.
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import type { Database } from '../client';
import { migrateDatabase } from '../migrate';
import * as schema from '../schema';
import { user } from '../schema';

export async function createTestDatabase(): Promise<{ db: Database; close: () => Promise<void> }> {
  const client = new PGlite();
  const raw = drizzle({ client, schema });
  await migrateDatabase(raw, 'pglite');
  return { db: raw as unknown as Database, close: () => client.close() };
}

/** Inserts a minimal Better Auth user row and returns its id. */
export async function insertUser(db: Database, id: string, email: string): Promise<string> {
  await db.insert(user).values({ id, name: id, email });
  return id;
}
