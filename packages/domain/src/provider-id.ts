// The one list of fantasy providers the app knows about (DESIGN D9). Does not own adapter code.
import { z } from 'zod';

export const PROVIDER_IDS = ['sleeper', 'yahoo'] as const;

export const ProviderIdSchema = z.enum(PROVIDER_IDS);

export type ProviderId = z.infer<typeof ProviderIdSchema>;
