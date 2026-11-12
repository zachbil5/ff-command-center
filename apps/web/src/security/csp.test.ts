import { describe, expect, it } from 'vitest';
import { buildCsp } from './csp';

const nonce = 'dGVzdC1ub25jZS0xMjM0NTY=';

function directive(csp: string, name: string): string[] {
  const found = csp.split('; ').find((part) => part.startsWith(`${name} `));
  return found ? found.split(' ').slice(1) : [];
}

describe('buildCsp', () => {
  it('production: nonce scripts, no eval, no inline', () => {
    const csp = buildCsp({ nonce, development: false });
    expect(directive(csp, 'script-src')).toEqual([
      `'self'`,
      `'nonce-${nonce}'`,
      `'strict-dynamic'`,
    ]);
    expect(csp).not.toContain('unsafe-eval');
    expect(csp).not.toContain('unsafe-inline');
    expect(directive(csp, 'object-src')).toEqual([`'none'`]);
    expect(directive(csp, 'frame-ancestors')).toEqual([`'none'`]);
    expect(csp).toContain('upgrade-insecure-requests');
  });

  it('development: allows eval and inline styles for hot reload only', () => {
    const csp = buildCsp({ nonce, development: true });
    expect(directive(csp, 'script-src')).toContain(`'unsafe-eval'`);
    expect(directive(csp, 'style-src')).toContain(`'unsafe-inline'`);
  });

  it('adds provider image hosts over https only', () => {
    const csp = buildCsp({ nonce, development: false, imageHosts: ['sleepercdn.com'] });
    expect(directive(csp, 'img-src')).toContain('https://sleepercdn.com');
  });

  it.each(['', 'short', `abc'; script-src *`])('rejects bad nonce %j', (bad) => {
    expect(() => buildCsp({ nonce: bad, development: false })).toThrow();
  });

  it('rejects image hosts that could inject directives', () => {
    expect(() =>
      buildCsp({ nonce, development: false, imageHosts: ['evil.com; script-src *'] }),
    ).toThrow();
  });
});
