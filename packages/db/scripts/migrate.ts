// `pnpm --filter @ffc/db migrate`: applies migrations (DESIGN §6.1).
// - Vercel build: DATABASE_URL is required (the Neon integration provides it per environment).
// - CI: no database exists, so it skips.
// - Local: migrates the PGlite directory under .data/.
import { databaseEnv } from '@ffc/config';
import { getDatabase } from '../src/client';
import { migrateDatabase } from '../src/migrate';

const env = databaseEnv();
if (env.DATABASE_URL === undefined && env.VERCEL === undefined && env.CI !== undefined) {
  console.log('migrate: no DATABASE_URL in CI, skipping');
  process.exit(0);
}

const { db, kind } = await getDatabase();
await migrateDatabase(db, kind);
console.log(`migrate: ${kind} database is up to date`);
process.exit(0);
