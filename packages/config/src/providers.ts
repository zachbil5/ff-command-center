// Fixed provider endpoints and outbound HTTP limits (DESIGN §5.3, §8 R4, R5). Outbound requests
// may only target these hosts; user input never chooses a host. Does not own request building.
import type { ProviderId } from '@ffc/domain';

export interface ProviderEndpoint {
  /** Base URL for API calls; adapters append encoded path segments only. */
  readonly apiBaseUrl: string;
  /** Base URL for avatar ids, or null when the provider returns full image URLs. */
  readonly avatarBaseUrl: string | null;
  /** Hosts that serve avatars/images we may render (feeds CSP img-src and next/image). */
  readonly imageHosts: readonly string[];
  /** Upper bound on concurrent outbound requests from one server instance. */
  readonly maxConcurrentRequests: number;
}

export const PROVIDER_ENDPOINTS: Readonly<Record<ProviderId, ProviderEndpoint>> = {
  sleeper: {
    apiBaseUrl: 'https://api.sleeper.app/v1',
    avatarBaseUrl: 'https://sleepercdn.com/avatars/thumbs',
    imageHosts: ['sleepercdn.com'],
    maxConcurrentRequests: 8,
  },
  yahoo: {
    apiBaseUrl: 'https://fantasysports.yahooapis.com/fantasy/v2',
    avatarBaseUrl: null,
    imageHosts: ['s.yimg.com'],
    maxConcurrentRequests: 4,
  },
};

export const PROVIDER_HTTP_LIMITS = {
  /** Abort a provider call that takes longer than this. */
  timeoutMs: 8_000,
  /** Refuse bodies larger than this; the biggest M1 response (a user's leagues) is far smaller. */
  maxResponseBytes: 5_000_000,
} as const;
