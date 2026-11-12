// Access-control boundary tests (DESIGN §6.1): every page needs a session unless it is on the
// public list, and every exported server action checks the session itself, because each
// export of a 'use server' file is a public HTTP endpoint.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT, listSourceFiles, repoRelative } from './workspace';

const APP_SRC = join(REPO_ROOT, 'apps', 'web', 'src');
const SESSION_CHECK = /\b(requireUser|requireOwner|getCurrentUser)\(/;

/** Pages anyone may load. Adding one here is a design change (DESIGN §6.1). */
const PUBLIC_PAGES = new Set(['apps/web/src/app/sign-in/page.tsx']);

/** Route handlers that must stay public (auth endpoints, health probe). */
const PUBLIC_ROUTES = new Set([
  'apps/web/src/app/api/auth/[...all]/route.ts',
  'apps/web/src/app/api/health/route.ts',
]);

const files = listSourceFiles(APP_SRC);

describe('pages and routes require a session', () => {
  const pages = files.filter((f) => /[\\/](page|route)\.tsx?$/.test(f));

  it('finds the app pages', () => {
    expect(pages.length).toBeGreaterThan(4);
  });

  it.each(pages.map((f) => [repoRelative(f), f] as const))('%s', (path, file) => {
    if (PUBLIC_PAGES.has(path) || PUBLIC_ROUTES.has(path)) return;
    expect(readFileSync(file, 'utf8')).toMatch(SESSION_CHECK);
  });
});

describe('server actions check the session', () => {
  const actionFiles = files.filter((f) => /^\s*['"]use server['"]/.test(readFileSync(f, 'utf8')));

  it('finds the action files', () => {
    expect(actionFiles.length).toBeGreaterThan(0);
  });

  it.each(actionFiles.map((f) => [repoRelative(f), f] as const))('%s', (_, file) => {
    const source = readFileSync(file, 'utf8');
    const exported = source.split(/\nexport\s+/).slice(1);
    for (const chunk of exported) {
      const name = /^(?:async\s+)?function\s+(\w+)/.exec(chunk)?.[1];
      // Only async functions may be exported from a 'use server' file.
      expect(name, `non-function export in ${repoRelative(file)}`).toBeDefined();
      const body = chunk.split(/\n}\n/)[0] ?? '';
      expect(body, `${String(name)} must call requireUser/requireOwner/signOut`).toMatch(
        /\b(requireUser|requireOwner|signOut)\(/,
      );
    }
  });
});
