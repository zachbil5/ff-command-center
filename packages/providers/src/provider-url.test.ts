import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PROVIDER_ENDPOINTS } from '@ffc/config';
import { PROVIDER_IDS } from '@ffc/domain';
import { providerUrl, UnsafePathSegmentError } from './provider-url';

describe('providerUrl', () => {
  it('joins encoded segments onto the fixed base', () => {
    expect(providerUrl('sleeper', ['user', 'some_user']).href).toBe(
      'https://api.sleeper.app/v1/user/some_user',
    );
    expect(providerUrl('sleeper', ['league', 123, 'matchups', 9]).href).toBe(
      'https://api.sleeper.app/v1/league/123/matchups/9',
    );
  });

  it('adds query parameters through URLSearchParams', () => {
    expect(providerUrl('yahoo', ['league', 'nfl.l.12345'], { format: 'json' }).href).toBe(
      'https://fantasysports.yahooapis.com/fantasy/v2/league/nfl.l.12345?format=json',
    );
  });

  it.each([
    '',
    '.',
    '..',
    '../admin',
    'a/b',
    'a?b=1',
    'a#b',
    '@evil.com',
    'a b',
    '%2e%2e',
    'x'.repeat(65),
  ])('rejects unsafe segment %j', (segment) => {
    expect(() => providerUrl('sleeper', ['user', segment])).toThrow(UnsafePathSegmentError);
  });

  it('never leaves the provider host or base path, whatever the segment', () => {
    fc.assert(
      fc.property(fc.constantFrom(...PROVIDER_IDS), fc.string(), (provider, segment) => {
        const base = new URL(PROVIDER_ENDPOINTS[provider].apiBaseUrl);
        let url: URL;
        try {
          url = providerUrl(provider, ['x', segment]);
        } catch (error) {
          expect(error).toBeInstanceOf(UnsafePathSegmentError);
          return;
        }
        expect(url.origin).toBe(base.origin);
        expect(url.pathname).toBe(`${base.pathname}/x/${segment}`);
        expect(url.search).toBe('');
        expect(url.hash).toBe('');
      }),
    );
  });
});
