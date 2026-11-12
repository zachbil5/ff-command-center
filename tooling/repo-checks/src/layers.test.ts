// Enforces DESIGN §4 (layers, facades) and §9 (only config reads env) across the whole repo.
import { readFileSync } from 'node:fs';
import { dirname, resolve, sep } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ALLOWED_INTERNAL_DEPS, ENV_READER, PURE_PACKAGES } from './layers';
import { importSpecifiers, listPackages, listSourceFiles, repoRelative } from './workspace';

const packages = listPackages();
const internal = (name: string) => name.startsWith('@ffc/');
const isTestFile = (file: string) => /\.test\.tsx?$/.test(file);

describe('workspace layers', () => {
  it('every workspace package has a row in the layer table', () => {
    for (const pkg of packages) {
      expect(ALLOWED_INTERNAL_DEPS, pkg.name).toHaveProperty([pkg.name]);
    }
  });

  it.each(packages.map((p) => [p.name, p] as const))(
    '%s declares only allowed internal dependencies',
    (_, pkg) => {
      const allowed = new Set([...(ALLOWED_INTERNAL_DEPS[pkg.name] ?? []), '@ffc/tsconfig']);
      const declared = pkg.dependencies.filter(internal);
      expect(declared.filter((dep) => !allowed.has(dep))).toEqual([]);
    },
  );

  it.each(packages.map((p) => [p.name, p] as const))(
    '%s imports internal packages only through declared facades and stays inside its folder',
    (_, pkg) => {
      const declared = new Set(pkg.dependencies);
      const problems: string[] = [];
      for (const file of listSourceFiles(pkg.dir)) {
        for (const spec of importSpecifiers(readFileSync(file, 'utf8'))) {
          const where = `${repoRelative(file)} → ${spec}`;
          if (internal(spec)) {
            const [scope, name, ...deep] = spec.split('/');
            const target = `${scope ?? ''}/${name ?? ''}`;
            const testOnlyEntry = spec === '@ffc/db/testing' && isTestFile(file);
            if (deep.length > 0 && target !== '@ffc/tsconfig' && !testOnlyEntry)
              problems.push(`deep import ${where}`);
            if (!declared.has(target)) problems.push(`undeclared ${where}`);
          } else if (spec.startsWith('.')) {
            const resolved = resolve(dirname(file), spec);
            if (!(resolved + sep).startsWith(pkg.dir + sep))
              problems.push(`escapes package ${where}`);
          }
        }
      }
      expect(problems).toEqual([]);
    },
  );

  it.each(PURE_PACKAGES)('%s stays pure (no Node built-ins, network or framework)', (name) => {
    const pkg = packages.find((p) => p.name === name);
    expect(pkg).toBeDefined();
    const banned = /^(node:|fs$|path$|http|https$|net$|child_process$|next|react)/;
    const sideEffects = /\b(fetch|process\.|Date\.now|new Date\(\)|Math\.random)\b/;
    const problems: string[] = [];
    for (const file of listSourceFiles(pkg?.dir ?? '')) {
      if (isTestFile(file)) continue;
      const source = readFileSync(file, 'utf8');
      for (const spec of importSpecifiers(source)) {
        if (banned.test(spec)) problems.push(`${repoRelative(file)} imports ${spec}`);
      }
      if (sideEffects.test(source))
        problems.push(`${repoRelative(file)} uses I/O, clock or randomness`);
    }
    expect(problems).toEqual([]);
  });

  it(`only ${ENV_READER} reads process.env`, () => {
    const problems: string[] = [];
    for (const pkg of packages) {
      if (pkg.name === ENV_READER || pkg.name === '@ffc/repo-checks') continue;
      for (const file of listSourceFiles(pkg.dir)) {
        if (readFileSync(file, 'utf8').includes('process.env')) problems.push(repoRelative(file));
      }
    }
    expect(problems).toEqual([]);
  });
});

describe('importSpecifiers', () => {
  it('finds static, type, side-effect, re-export and dynamic imports', () => {
    const source = [
      `import a from 'a';`,
      `import type { B } from "b";`,
      `import './c.css';`,
      `export { d } from './d';`,
      `const e = await import('e');`,
      `import {\n  f,\n  g,\n} from '@scope/f';`,
    ].join('\n');
    expect(importSpecifiers(source)).toEqual(['a', 'b', './c.css', './d', 'e', '@scope/f']);
  });
});
