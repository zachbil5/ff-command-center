// Wires provider adapters to Next.js fetch caching (DESIGN §3.2). The only place adapters are
// constructed for the app. Does not own cache lifetimes (config) or adapter logic (providers).
import { createFetchHttpGetJson, createSleeperProvider } from '@ffc/providers';

/** Next.js caches fetch responses for `revalidate` seconds, shared by every user (R5). */
function nextCache(ttlSeconds: number): RequestInit {
  return { next: { revalidate: ttlSeconds } };
}

let sleeper: ReturnType<typeof createSleeperProvider> | undefined;

export function sleeperProvider(): ReturnType<typeof createSleeperProvider> {
  sleeper ??= createSleeperProvider(
    createFetchHttpGetJson({ provider: 'sleeper', fetch, cacheInit: nextCache }),
  );
  return sleeper;
}
