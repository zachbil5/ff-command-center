// drizzle-kit settings for generating SQL migrations from the schema (DESIGN §7).
// Generation needs no database; applying migrations is scripts/migrate.ts.
import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/schema/index.ts',
  out: './migrations',
  strict: true,
  verbose: true,
});
