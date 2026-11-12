// Wires provider adapters to Next.js fetch caching and the per-provider request cap
// (DESIGN §3.2, §8 R5). The only place adapters are constructed for the app.
// Does not own cache lifetimes or limits (config) or adapter logic (providers).
import { PROVIDER_ENDPOINTS } from '@ffc/config';
import type { LeagueRef } from '@ffc/domain';
import {
  createFetchHttpGetJson,
  createSleeperProvider,
  withConcurrencyLimit,
  type FantasyProvider,
} from '@ffc/providers';

/** Next.js caches fetch responses for `revalidate` seconds, shared by every user (R5). */
function nextCache(ttlSeconds: number): RequestInit {
  return { next: { revalidate: ttlSeconds } };
}

let sleeper: ReturnType<typeof createSleeperProvider> | undefined;

export function sleeperProvider(): ReturnType<typeof createSleeperProvider> {
  sleeper ??= createSleeperProvider(
    withConcurrencyLimit(
      createFetchHttpGetJson({ provider: 'sleeper', fetch, cacheInit: nextCache }),
      PROVIDER_ENDPOINTS.sleeper.maxConcurrentRequests,
    ),
  );
  return sleeper;
}

/** The adapter for a league's provider, or null while that provider isn't supported (Yahoo: M3). */
export function providerFor(ref: LeagueRef): FantasyProvider | null {
  return ref.provider === 'sleeper' ? sleeperProvider() : null;
}
