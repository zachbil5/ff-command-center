// Test-only entry point (`@ffc/db/testing`): in-memory Postgres with migrations applied.
// Kept out of the main facade so app bundles never include migration files or PGlite.
export { createTestDatabase, insertUser } from './test-database';
