// Applies the committed SQL migrations to a database (DESIGN §7). Used by scripts/migrate.ts
// and by tests; never by the running app. Does not own schema or connection choice.
import { fileURLToPath } from 'node:url';
import type { DatabaseKind } from './client';

export const MIGRATIONS_DIR = fileURLToPath(new URL('../migrations', import.meta.url));

/** `db` must be the raw Drizzle handle for `kind` (the migrators are driver-specific). */
export async function migrateDatabase(db: unknown, kind: DatabaseKind): Promise<void> {
  if (kind === 'neon') {
    const { migrate } = await import('drizzle-orm/neon-http/migrator');
    await migrate(db as Parameters<typeof migrate>[0], { migrationsFolder: MIGRATIONS_DIR });
  } else {
    const { migrate } = await import('drizzle-orm/pglite/migrator');
    await migrate(db as Parameters<typeof migrate>[0], { migrationsFolder: MIGRATIONS_DIR });
  }
}
