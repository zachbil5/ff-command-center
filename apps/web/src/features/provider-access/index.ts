// Facade for provider access shared by features: adapter wiring and error → result mapping.
export { loadSafely, type LoadResult } from './load-result';
export { providerFor, sleeperProvider } from './provider-registry';
