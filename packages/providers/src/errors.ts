// Typed failures every adapter raises, so features can map them to "not found" vs "provider
// down" without knowing the provider (DESIGN §8 R8). Does not own messages shown to users.
import type { ProviderId } from '@ffc/domain';

export abstract class ProviderError extends Error {
  readonly provider: ProviderId;

  protected constructor(provider: ProviderId, message: string) {
    super(message);
    this.provider = provider;
  }
}

/** The user, league or resource doesn't exist at the provider. */
export class ProviderNotFoundError extends ProviderError {
  constructor(provider: ProviderId, what: string) {
    super(provider, `${provider}: ${what} not found`);
    this.name = 'ProviderNotFoundError';
  }
}

/** Network failure, timeout, rate limit or 5xx: worth retrying later. */
export class ProviderUnavailableError extends ProviderError {
  constructor(provider: ProviderId, reason: string) {
    super(provider, `${provider} unavailable: ${reason}`);
    this.name = 'ProviderUnavailableError';
  }
}

/** The provider answered, but not in a shape we accept (API changed, or hostile data). */
export class ProviderDataError extends ProviderError {
  constructor(provider: ProviderId, what: string) {
    super(provider, `${provider}: unexpected ${what} data`);
    this.name = 'ProviderDataError';
  }
}
