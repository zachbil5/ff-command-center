// Stable cross-provider key for a league (DESIGN §5.1). Does not own fetching or league contents.
import { z } from 'zod';
import { ProviderIdSchema } from './provider-id';
import { SportSchema } from './sport';

/**
 * Provider ids are opaque, but kept to a safe charset so they can sit in URLs and cache keys
 * without escaping, and can never carry path segments (DESIGN §8 R4).
 */
export const ExternalIdSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[A-Za-z0-9._-]+$/, 'unexpected characters in provider id')
  .refine((id) => id !== '.' && id !== '..', 'id may not be a path segment');

export const SeasonSchema = z.number().int().min(2000).max(2100);

export const LeagueRefSchema = z
  .object({
    provider: ProviderIdSchema,
    sport: SportSchema,
    season: SeasonSchema,
    leagueId: ExternalIdSchema,
  })
  .strict();

export type LeagueRef = z.infer<typeof LeagueRefSchema>;

const SEPARATOR = ':';

/** Serialise a ref to a cache/URL key. Inverse of {@link parseLeagueRefKey}. */
export function leagueRefKey(ref: LeagueRef): string {
  return [ref.provider, ref.sport, String(ref.season), ref.leagueId].join(SEPARATOR);
}

/** Parse a key produced by {@link leagueRefKey}; throws on anything else. */
export function parseLeagueRefKey(key: string): LeagueRef {
  const parts = key.split(SEPARATOR);
  if (parts.length !== 4) {
    throw new Error('league key must have 4 parts');
  }
  const [provider, sport, season = '', leagueId] = parts;
  if (!/^\d{4}$/.test(season)) {
    throw new Error('league key season must be 4 digits');
  }
  return LeagueRefSchema.parse({ provider, sport, season: Number(season), leagueId });
}
