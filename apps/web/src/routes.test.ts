import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import {
  parseLeagueParams,
  parseMe,
  parseSeason,
  parseSleeperUsername,
  parseWeek,
  routes,
} from './routes';

describe('routes', () => {
  it('builds league URLs that parse back to the same ref', () => {
    const ref = { provider: 'sleeper', sport: 'nfl', season: 2026, leagueId: '9001' } as const;
    const url = new URL(routes.league(ref, { me: '42' }), 'https://x.test');
    const [, , provider, sport, season, leagueId] = url.pathname.split('/');
    expect(
      parseLeagueParams({
        provider: provider!,
        sport: sport!,
        season: season!,
        leagueId: leagueId!,
      }),
    ).toEqual(ref);
    expect(url.searchParams.get('me')).toBe('42');
  });

  it('encodes usernames in paths', () => {
    expect(routes.sleeperUser('a_b', 2025)).toBe('/sleeper/a_b?season=2025');
  });
});

describe('URL input parsing', () => {
  it('accepts valid usernames and trims them', () => {
    expect(parseSleeperUsername('  test_manager ')).toBe('test_manager');
  });

  it.each([undefined, null, 42, '', 'a', '../x', 'a b', 'a/b', '<script>'])(
    'rejects username %j',
    (value) => {
      expect(parseSleeperUsername(value)).toBeNull();
    },
  );

  it('only accepts 4-digit seasons in range', () => {
    expect(parseSeason('2025')).toBe(2025);
    for (const bad of [undefined, '25', '1999', '2025a', ['2025'], '0x7E9']) {
      expect(parseSeason(bad)).toBeNull();
    }
  });

  it('rejects league params with unknown providers, sports or unsafe ids', () => {
    const ok = { provider: 'sleeper', sport: 'nfl', season: '2026', leagueId: '1' };
    expect(parseLeagueParams(ok)).not.toBeNull();
    expect(parseLeagueParams({ ...ok, provider: 'espn' })).toBeNull();
    expect(parseLeagueParams({ ...ok, sport: 'nba' })).toBeNull();
    expect(parseLeagueParams({ ...ok, leagueId: '..' })).toBeNull();
    expect(parseLeagueParams({ ...ok, season: '26' })).toBeNull();
  });

  it('never returns a username outside the safe charset', () => {
    fc.assert(
      fc.property(fc.string(), (value) => {
        const parsed = parseSleeperUsername(value);
        if (parsed !== null) expect(parsed).toMatch(/^[A-Za-z0-9_]{2,40}$/);
      }),
    );
  });

  it('parseMe keeps only safe ids', () => {
    expect(parseMe('100')).toBe('100');
    expect(parseMe('a b')).toBeNull();
    expect(parseMe(undefined)).toBeNull();
  });
});

describe('week routes', () => {
  it('adds the week only when given', () => {
    expect(routes.myMatchups('a_b')).toBe('/sleeper/a_b/matchups');
    expect(routes.myMatchups('a_b', 9)).toBe('/sleeper/a_b/matchups?week=9');
    const ref = { provider: 'sleeper', sport: 'nfl', season: 2026, leagueId: '1' } as const;
    expect(routes.league(ref, { me: '7', week: 3 })).toBe(
      '/leagues/sleeper/nfl/2026/1?me=7&week=3',
    );
  });

  it('parses only weeks valid for the sport', () => {
    expect(parseWeek('9', 'nfl')).toBe(9);
    for (const bad of [undefined, '0', '19', '9a', '-1', '1.5', ['9'], '009']) {
      expect(parseWeek(bad, 'nfl')).toBeNull();
    }
  });
});
