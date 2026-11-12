// Test double for HttpGetJson: serves canned JSON by URL path and records calls.
// Test-only; not exported from the package facade.
import { ProviderNotFoundError } from '../errors';
import type { HttpGetJson } from '../http';
import type { ProviderId } from '@ffc/domain';

export interface FixtureHttp {
  readonly get: HttpGetJson;
  readonly calls: { path: string; ttlSeconds: number }[];
}

/** `routes` maps a URL path suffix (e.g. "/user/test_manager") to the JSON to return. */
export function fixtureHttp(provider: ProviderId, routes: Record<string, unknown>): FixtureHttp {
  const calls: FixtureHttp['calls'] = [];
  const get: HttpGetJson = (url, { ttlSeconds }) => {
    calls.push({ path: url.pathname, ttlSeconds });
    const match = Object.keys(routes).find((suffix) => url.pathname.endsWith(suffix));
    if (match === undefined) return Promise.reject(new ProviderNotFoundError(provider, 'route'));
    return Promise.resolve(structuredClone(routes[match]));
  };
  return { get, calls };
}
