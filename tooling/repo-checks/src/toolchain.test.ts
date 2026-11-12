// Keeps every Node.js version pin in step with .nvmrc (DESIGN D16). Vercel reads `engines`
// from the deployed app's package.json, not the repo root, so a missing or different pin there
// picks another Node and engine-strict installs fail.
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { REPO_ROOT, listPackages } from './workspace';

/** Packages that are deployed on their own and so need their own engines pin. */
const DEPLOYED_PACKAGES = ['@ffc/web'];

const nodeMajor = readFileSync(join(REPO_ROOT, '.nvmrc'), 'utf8').trim();
const expected = `${nodeMajor}.x`;

function enginesNode(dir: string): string | undefined {
  const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')) as {
    engines?: { node?: string };
  };
  return manifest.engines?.node;
}

describe('Node.js version pins', () => {
  it('.nvmrc holds a bare major version', () => {
    expect(nodeMajor).toMatch(/^\d+$/);
  });

  it(`root package.json pins node ${expected}`, () => {
    expect(enginesNode(REPO_ROOT)).toBe(expected);
  });

  it.each(DEPLOYED_PACKAGES)(`%s pins node ${expected} for its host`, (name) => {
    const pkg = listPackages().find((p) => p.name === name);
    expect(pkg, name).toBeDefined();
    expect(enginesNode(pkg?.dir ?? '')).toBe(expected);
  });

  it('every other engines.node pin agrees with .nvmrc', () => {
    for (const pkg of listPackages()) {
      const pin = enginesNode(pkg.dir);
      if (pin !== undefined) expect(pin, pkg.name).toBe(expected);
    }
  });

  it('CI reads the Node version from .nvmrc', () => {
    const ci = readFileSync(join(REPO_ROOT, '.github/workflows/ci.yml'), 'utf8');
    expect(ci).not.toMatch(/node-version:/);
    expect(ci).toMatch(/node-version-file: \.nvmrc/);
  });
});
