// Reads workspace packages and their source files for repo checks. Does not own the rules.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

export const REPO_ROOT = resolve(import.meta.dirname, '../../..');

const WORKSPACE_DIRS = ['apps', 'packages', 'tooling'];
const SOURCE_EXTENSIONS = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs)$/;
const SKIP_DIRS = new Set(['node_modules', '.next', '.turbo', 'dist', 'coverage']);

export interface WorkspacePackage {
  readonly name: string;
  readonly dir: string;
  readonly dependencies: readonly string[];
}

export function listPackages(): WorkspacePackage[] {
  const packages: WorkspacePackage[] = [];
  for (const group of WORKSPACE_DIRS) {
    for (const entry of readdirSync(join(REPO_ROOT, group))) {
      const dir = join(REPO_ROOT, group, entry);
      const manifestPath = join(dir, 'package.json');
      let manifest: { name: string; dependencies?: object; devDependencies?: object };
      try {
        manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as typeof manifest;
      } catch {
        continue;
      }
      packages.push({
        name: manifest.name,
        dir,
        dependencies: [
          ...Object.keys(manifest.dependencies ?? {}),
          ...Object.keys(manifest.devDependencies ?? {}),
        ],
      });
    }
  }
  return packages;
}

export function listSourceFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (SKIP_DIRS.has(entry)) continue;
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      files.push(...listSourceFiles(path));
    } else if (SOURCE_EXTENSIONS.test(entry) && !entry.endsWith('.d.ts')) {
      files.push(path);
    }
  }
  return files;
}

export function repoRelative(path: string): string {
  return relative(REPO_ROOT, path).replaceAll('\\', '/');
}

const IMPORT_PATTERN =
  /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\s*\(\s*['"]([^'"]+)['"]\s*\)|import\s+['"]([^'"]+)['"]/g;

/** Module specifiers imported by a source file (static, side-effect and dynamic imports). */
export function importSpecifiers(source: string): string[] {
  return [...source.matchAll(IMPORT_PATTERN)].map((m) => m[1] ?? m[2] ?? m[3] ?? '');
}
