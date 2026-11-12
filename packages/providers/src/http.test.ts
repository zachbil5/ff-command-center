import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { ProviderDataError, ProviderNotFoundError, ProviderUnavailableError } from './errors';
import { createFetchHttpGetJson, withConcurrencyLimit, type HttpGetJson } from './http';

const url = new URL('https://api.sleeper.app/v1/state/nfl');

function http(respond: () => Response | Promise<Response>, maxResponseBytes = 1000) {
  const seen: RequestInit[] = [];
  const get = createFetchHttpGetJson({
    provider: 'sleeper',
    fetch: (_input, init) => {
      seen.push(init ?? {});
      return Promise.resolve(respond());
    },
    cacheInit: (ttl) => ({ cache: ttl > 0 ? 'force-cache' : 'no-store' }),
    maxResponseBytes,
  });
  return { get, seen };
}

describe('createFetchHttpGetJson', () => {
  it('returns parsed JSON, including a null body', async () => {
    expect(await http(() => Response.json({ week: 1 })).get(url, { ttlSeconds: 60 })).toEqual({
      week: 1,
    });
    expect(await http(() => new Response('null')).get(url, { ttlSeconds: 60 })).toBeNull();
  });

  it('passes cache options, refuses redirects and sets a timeout', async () => {
    const { get, seen } = http(() => Response.json({}));
    await get(url, { ttlSeconds: 60 });
    expect(seen[0]).toMatchObject({ cache: 'force-cache', method: 'GET', redirect: 'error' });
    expect(seen[0]?.signal).toBeInstanceOf(AbortSignal);
  });

  it('maps 404 to not found and other failures to unavailable', async () => {
    await expect(
      http(() => new Response('', { status: 404 })).get(url, { ttlSeconds: 0 }),
    ).rejects.toBeInstanceOf(ProviderNotFoundError);
    for (const status of [429, 500, 503]) {
      await expect(
        http(() => new Response('', { status })).get(url, { ttlSeconds: 0 }),
      ).rejects.toBeInstanceOf(ProviderUnavailableError);
    }
    await expect(
      http(() => Promise.reject(new TypeError('network'))).get(url, { ttlSeconds: 0 }),
    ).rejects.toBeInstanceOf(ProviderUnavailableError);
  });

  it('rejects oversized and non-JSON bodies', async () => {
    await expect(
      http(() => new Response('x'.repeat(2000))).get(url, { ttlSeconds: 0 }),
    ).rejects.toBeInstanceOf(ProviderDataError);
    await expect(
      http(() => new Response('{}', { headers: { 'content-length': '999999' } })).get(url, {
        ttlSeconds: 0,
      }),
    ).rejects.toBeInstanceOf(ProviderDataError);
    await expect(
      http(() => new Response('<html>')).get(url, { ttlSeconds: 0 }),
    ).rejects.toBeInstanceOf(ProviderDataError);
  });

  it('never puts the URL in error messages', async () => {
    const secretish = new URL('https://api.sleeper.app/v1/user/someone_private');
    try {
      await http(() => Promise.reject(new Error('boom'))).get(secretish, { ttlSeconds: 0 });
    } catch (error) {
      expect((error as Error).message).not.toContain('someone_private');
    }
  });
});

describe('withConcurrencyLimit', () => {
  it('never runs more than `max` requests at once, and runs them all', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.integer({ min: 1, max: 5 }),
        fc.array(fc.integer({ min: 0, max: 3 }), { minLength: 1, maxLength: 25 }),
        async (max, delays) => {
          let inFlight = 0;
          let peak = 0;
          const slow: HttpGetJson = async (u) => {
            inFlight += 1;
            peak = Math.max(peak, inFlight);
            await new Promise((r) => setTimeout(r, Number(u.searchParams.get('d'))));
            inFlight -= 1;
            return u.searchParams.get('i');
          };
          const limited = withConcurrencyLimit(slow, max);
          const results = await Promise.all(
            delays.map((d, i) =>
              limited(new URL(`https://x.test/?d=${d}&i=${i}`), { ttlSeconds: 0 }),
            ),
          );
          expect(peak).toBeLessThanOrEqual(max);
          expect(results).toEqual(delays.map((_, i) => String(i)));
        },
      ),
      { numRuns: 30 },
    );
  });

  it('releases its slot when a request fails', async () => {
    const failing: HttpGetJson = () => Promise.reject(new ProviderUnavailableError('sleeper', 'x'));
    const limited = withConcurrencyLimit(failing, 1);
    await expect(limited(url, { ttlSeconds: 0 })).rejects.toBeInstanceOf(ProviderUnavailableError);
    await expect(limited(url, { ttlSeconds: 0 })).rejects.toBeInstanceOf(ProviderUnavailableError);
  });

  it('rejects a non-positive limit', () => {
    expect(() => withConcurrencyLimit(() => Promise.resolve(null), 0)).toThrow(RangeError);
  });
});
