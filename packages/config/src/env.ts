// Typed environment parsing (DESIGN §9). The only module in the repo that reads process.env;
// a repo check enforces that. Does not own secret values or defaults for secrets.
import { z } from 'zod';

type EnvSource = Readonly<Record<string, string | undefined>>;

/**
 * Parse `source` with `schema`, throwing one readable error listing every bad variable.
 * Error messages name variables only, never their values, so secrets can't leak into logs.
 */
export function parseEnv<T extends z.ZodType>(schema: T, source: EnvSource): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const names = [...new Set(result.error.issues.map((issue) => issue.path.join('.')))];
    throw new Error(`Invalid or missing environment variables: ${names.join(', ')}`);
  }
  return result.data;
}

const RuntimeEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
});

export type RuntimeEnv = z.infer<typeof RuntimeEnvSchema>;

/** Non-secret runtime settings, safe to read anywhere on the server. */
export function runtimeEnv(source: EnvSource = process.env): RuntimeEnv {
  return parseEnv(RuntimeEnvSchema, source);
}

export function isDevelopment(source: EnvSource = process.env): boolean {
  return runtimeEnv(source).NODE_ENV === 'development';
}
