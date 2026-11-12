// Local database location (DESIGN §6.1). Relative to the repository root so the migrate
// script and the dev server agree; the db package resolves it. Gitignored via `.data/`.
export const LOCAL_DATABASE_DIR = '.data/pglite';
