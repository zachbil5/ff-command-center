// Fixed provider endpoints (DESIGN §5.3, §8 R4). Outbound requests may only target these hosts;
// user input is never used to choose a host. Does not own request building or auth.
import type { ProviderId } from '@ffc/domain';

export interface ProviderEndpoint {
  /** Base URL for API calls; adapters append encoded path segments only. */
  readonly apiBaseUrl: string;
  /** Hosts that serve avatars/images we may render (feeds next.config remotePatterns). */
  readonly imageHosts: readonly string[];
  /** Upper bound on concurrent outbound requests from one server instance. */
  readonly maxConcurrentRequests: number;
}

export const PROVIDER_ENDPOINTS: Readonly<Record<ProviderId, ProviderEndpoint>> = {
  sleeper: {
    apiBaseUrl: 'https://api.sleeper.app/v1',
    imageHosts: ['sleepercdn.com'],
    maxConcurrentRequests: 8,
  },
  yahoo: {
    apiBaseUrl: 'https://fantasysports.yahooapis.com/fantasy/v2',
    imageHosts: ['s.yimg.com'],
    maxConcurrentRequests: 4,
  },
};
