// Outbound JSON GET with a timeout, size cap and typed errors (DESIGN §8 R5, R8). Adapters take
// an HttpGetJson, so tests inject fixtures and the app injects Next.js caching. Does not own
// URLs (provider-url.ts) or response shapes (each adapter's raw schemas).
import { PROVIDER_HTTP_LIMITS } from '@ffc/config';
import type { ProviderId } from '@ffc/domain';
import { ProviderDataError, ProviderNotFoundError, ProviderUnavailableError } from './errors';

export interface HttpRequestOptions {
  /** How long the response may be served from cache (DESIGN §3.2). */
  readonly ttlSeconds: number;
}

/** Fetch `url` and return its parsed JSON body, or throw a ProviderError. */
export type HttpGetJson = (url: URL, options: HttpRequestOptions) => Promise<unknown>;

export interface FetchHttpDeps {
  readonly provider: ProviderId;
  readonly fetch: typeof fetch;
  /** Extra fetch options per TTL, e.g. Next.js `{ next: { revalidate } }`. */
  readonly cacheInit?: (ttlSeconds: number) => RequestInit;
  readonly timeoutMs?: number;
  readonly maxResponseBytes?: number;
}

export function createFetchHttpGetJson(deps: FetchHttpDeps): HttpGetJson {
  const {
    provider,
    timeoutMs = PROVIDER_HTTP_LIMITS.timeoutMs,
    maxResponseBytes = PROVIDER_HTTP_LIMITS.maxResponseBytes,
  } = deps;

  return async (url, { ttlSeconds }) => {
    let response: Response;
    try {
      response = await deps.fetch(url, {
        ...deps.cacheInit?.(ttlSeconds),
        method: 'GET',
        headers: { accept: 'application/json' },
        redirect: 'error',
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      // Network errors and timeouts carry no detail worth showing; never echo the URL.
      throw new ProviderUnavailableError(provider, 'request failed');
    }

    if (response.status === 404) throw new ProviderNotFoundError(provider, 'resource');
    if (!response.ok) throw new ProviderUnavailableError(provider, `HTTP ${response.status}`);

    const declared = Number(response.headers.get('content-length') ?? '0');
    if (declared > maxResponseBytes) throw new ProviderDataError(provider, 'oversized');
    const text = await response.text();
    if (text.length > maxResponseBytes) throw new ProviderDataError(provider, 'oversized');

    try {
      return JSON.parse(text) as unknown;
    } catch {
      throw new ProviderDataError(provider, 'non-JSON');
    }
  };
}

/**
 * Wraps an HttpGetJson so at most `max` requests are in flight at once; the rest wait in
 * order (DESIGN §8 R5). Pages that load many leagues can't burst past a provider's limits.
 */
export function withConcurrencyLimit(get: HttpGetJson, max: number): HttpGetJson {
  if (!Number.isInteger(max) || max < 1) throw new RangeError('max must be a positive integer');
  let active = 0;
  const waiting: (() => void)[] = [];

  const acquire = (): Promise<void> => {
    if (active < max) {
      active += 1;
      return Promise.resolve();
    }
    return new Promise((resolve) => {
      waiting.push(() => {
        active += 1;
        resolve();
      });
    });
  };
  const release = () => {
    active -= 1;
    waiting.shift()?.();
  };

  return async (url, options) => {
    await acquire();
    try {
      return await get(url, options);
    } finally {
      release();
    }
  };
}
