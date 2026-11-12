// Builds outbound provider URLs from fixed base URLs plus encoded path segments (DESIGN §8 R4).
// Every adapter request goes through here. Does not own fetching, retries or caching.
import { PROVIDER_ENDPOINTS } from '@ffc/config';
import type { ProviderId } from '@ffc/domain';

const MAX_SEGMENT_LENGTH = 64;
const SAFE_SEGMENT = /^[A-Za-z0-9._-]+$/;

/** A path segment came from somewhere it shouldn't have; callers map this to a 400. */
export class UnsafePathSegmentError extends Error {
  constructor() {
    super('unsafe provider path segment');
    this.name = 'UnsafePathSegmentError';
  }
}

function checkSegment(segment: string | number): string {
  const text = String(segment);
  if (
    text.length === 0 ||
    text.length > MAX_SEGMENT_LENGTH ||
    !SAFE_SEGMENT.test(text) ||
    text === '.' ||
    text === '..'
  ) {
    throw new UnsafePathSegmentError();
  }
  return encodeURIComponent(text);
}

/**
 * `providerUrl('sleeper', ['user', username])` → `https://api.sleeper.app/v1/user/<username>`.
 * Rejects (never "fixes") any segment outside the safe charset, so input can't add path
 * segments, a query string or a different host.
 */
export function providerUrl(
  provider: ProviderId,
  segments: readonly (string | number)[],
  query: Readonly<Record<string, string>> = {},
): URL {
  const base = PROVIDER_ENDPOINTS[provider].apiBaseUrl;
  const url = new URL(`${base}/${segments.map(checkSegment).join('/')}`);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }
  return url;
}
