// Facade for @ffc/providers: the only import path other packages may use (DESIGN §4).
// The FantasyProvider interface and the Sleeper/Yahoo adapters land in M1 and M3.
export { providerUrl, UnsafePathSegmentError } from './provider-url';
