// Turns provider errors into a small result type pages can switch on (DESIGN §8 R8).
// Does not own user-facing wording (components) or retries.
import { ProviderNotFoundError } from '@ffc/providers';

export type LoadResult<T> =
  ({ readonly kind: 'ok' } & T) | { readonly kind: 'not_found' } | { readonly kind: 'unavailable' };

/**
 * Not found → `not_found`. Everything else (provider down, changed API, bad data) →
 * `unavailable`, so a provider problem never shows as a crash page. Programming errors are
 * still surfaced in server logs by the caller's error boundary in development.
 */
export async function loadSafely<T>(load: () => Promise<T>): Promise<LoadResult<T>> {
  try {
    return { kind: 'ok', ...(await load()) };
  } catch (error) {
    if (error instanceof ProviderNotFoundError) return { kind: 'not_found' };
    console.error('provider load failed', error instanceof Error ? error.name : 'unknown');
    return { kind: 'unavailable' };
  }
}
