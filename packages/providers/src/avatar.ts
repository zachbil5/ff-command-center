// Turns provider avatar ids into image URLs on allowlisted hosts (DESIGN §8 R3).
// Does not own which hosts are allowed (config) or rendering.
import { PROVIDER_ENDPOINTS } from '@ffc/config';
import type { ProviderId } from '@ffc/domain';

const AVATAR_ID = /^[A-Za-z0-9]{1,64}$/;

/** URL for an avatar id, or null when there is none or it isn't a plain id. */
export function avatarUrl(provider: ProviderId, avatarId: string | null): string | null {
  const base = PROVIDER_ENDPOINTS[provider].avatarBaseUrl;
  if (base === null || avatarId === null || !AVATAR_ID.test(avatarId)) return null;
  return `${base}/${avatarId}`;
}
