// Opens the database (DESIGN §6.1): Neon over HTTP when DATABASE_URL is set, otherwise a local
// PGlite directory under the repo's .data/. On Vercel a missing URL is an error, never a silent
// fallback. Does not own queries (repos/) or migrations (migrate.ts).
import { existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { LOCAL_DATABASE_DIR, databaseEnv } from '@ffc/config';
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core';
import * as schema from './schema';

export type Schema = typeof schema;

/**
 * Driver-neutral database handle. Neon's HTTP driver and PGlite both implement Drizzle's
 * Postgres API; repository code only uses that shared surface.
 */
export type Database = PgDatabase<PgQueryResultHKT, Schema>;

/** Walks up from `start` to the folder holding pnpm-workspace.yaml. */
export function findRepoRoot(start: string = process.cwd()): string {
  let dir = start;
  for (;;) {
    if (existsSync(join(dir, 'pnpm-workspace.yaml'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) throw new Error('could not find the repository root');
    dir = parent;
  }
}

export function localDatabasePath(start?: string): string {
  return join(findRepoRoot(start), LOCAL_DATABASE_DIR);
}

export type DatabaseKind = 'neon' | 'pglite';

async function open(): Promise<{ db: Database; kind: DatabaseKind }> {
  const env = databaseEnv();
  if (env.DATABASE_URL !== undefined) {
    const { neon } = await import('@neondatabase/serverless');
    const { drizzle } = await import('drizzle-orm/neon-http');
    const db = drizzle({ client: neon(env.DATABASE_URL), schema });
    return { db: db as unknown as Database, kind: 'neon' };
  }
  if (env.VERCEL !== undefined) {
    throw new Error('DATABASE_URL is required on Vercel (add Neon from the Storage tab)');
  }
  const path = localDatabasePath();
  mkdirSync(path, { recursive: true });
  const { PGlite } = await import('@electric-sql/pglite');
  const { drizzle } = await import('drizzle-orm/pglite');
  const db = drizzle({ client: new PGlite(path), schema });
  return { db: db as unknown as Database, kind: 'pglite' };
}

let opened: Promise<{ db: Database; kind: DatabaseKind }> | undefined;

/** The app's shared database handle, opened on first use. */
export function getDatabase(): Promise<{ db: Database; kind: DatabaseKind }> {
  opened ??= open();
  return opened;
}
