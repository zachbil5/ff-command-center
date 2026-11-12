// Facade for @ffc/config: the only import path other packages may use (DESIGN §4).
export { parseEnv, runtimeEnv, isDevelopment, type RuntimeEnv } from './env';
export { PROVIDER_ENDPOINTS, PROVIDER_HTTP_LIMITS, type ProviderEndpoint } from './providers';
export { CACHE_TTL_SECONDS, type CacheDataKind } from './cache-policy';
