import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { PROVIDER_IDS } from './provider-id';
import { SPORT_IDS } from './sport';
import { leagueRefKey, parseLeagueRefKey, type LeagueRef } from './league-ref';

const ID_CHARS = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789._-'.split('');

const leagueRef: fc.Arbitrary<LeagueRef> = fc.record({
  provider: fc.constantFrom(...PROVIDER_IDS),
  sport: fc.constantFrom(...SPORT_IDS),
  season: fc.integer({ min: 2000, max: 2100 }),
  leagueId: fc
    .string({ unit: fc.constantFrom(...ID_CHARS), minLength: 1, maxLength: 64 })
    .filter((id) => id !== '.' && id !== '..'),
});

describe('league ref keys', () => {
  it('round-trips every valid ref', () => {
    fc.assert(
      fc.property(leagueRef, (ref) => {
        expect(parseLeagueRefKey(leagueRefKey(ref))).toEqual(ref);
      }),
    );
  });

  it('only ever yields ids inside the safe charset, whatever the input', () => {
    fc.assert(
      fc.property(fc.string(), (junk) => {
        let parsed: LeagueRef;
        try {
          parsed = parseLeagueRefKey(`sleeper:nfl:2026:${junk}`);
        } catch {
          return;
        }
        expect(parsed.leagueId).toMatch(/^[A-Za-z0-9._-]{1,64}$/);
      }),
    );
  });

  it.each([
    'sleeper:nfl:2026',
    'espn:nfl:2026:1',
    'sleeper:nba:2026:1',
    'sleeper:nfl:26:1',
    'sleeper:nfl:2026:..',
    'sleeper:nfl:2026:../x',
    'sleeper:nfl:2026:a b',
  ])('rejects %s', (key) => {
    expect(() => parseLeagueRefKey(key)).toThrow();
  });
});
