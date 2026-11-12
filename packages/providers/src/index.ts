// Facade for @ffc/providers: the only import path other packages may use (DESIGN §4).
export { avatarUrl } from './avatar';
export {
  ProviderError,
  ProviderDataError,
  ProviderNotFoundError,
  ProviderUnavailableError,
} from './errors';
export {
  createFetchHttpGetJson,
  type FetchHttpDeps,
  type HttpGetJson,
  type HttpRequestOptions,
} from './http';
export type { FantasyProvider, PartialList, UsernameLookup } from './provider';
export { providerUrl, UnsafePathSegmentError } from './provider-url';
export { createSleeperProvider } from './sleeper/adapter';
export { SleeperUsernameSchema } from './sleeper/raw';
