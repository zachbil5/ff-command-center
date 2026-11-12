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

const DatabaseEnvSchema = z.object({
  /** Neon connection string. Absent locally, where PGlite is used instead. */
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }).optional(),
  /** Set by Vercel on every build and function. */
  VERCEL: z.string().optional(),
  /** Set by GitHub Actions and most CI systems. */
  CI: z.string().optional(),
});

export type DatabaseEnv = z.infer<typeof DatabaseEnvSchema>;

export function databaseEnv(source: EnvSource = process.env): DatabaseEnv {
  return parseEnv(DatabaseEnvSchema, source);
}

const AuthEnvSchema = z.object({
  /** Signs session cookies; 32+ random bytes (DESIGN §9). */
  BETTER_AUTH_SECRET: z.string().min(32),
  /** Public origin of this deployment, e.g. https://….vercel.app or http://localhost:3000. */
  BETTER_AUTH_URL: z.url({ protocol: /^https?$/ }),
  GOOGLE_CLIENT_ID: z.string().min(10),
  GOOGLE_CLIENT_SECRET: z.string().min(10),
  /** The one account that may manage invites; always allowed to sign up. */
  OWNER_EMAIL: z.string().trim().toLowerCase().pipe(z.email()),
});

export type AuthEnv = z.infer<typeof AuthEnvSchema>;

/** Auth settings; throws naming the missing variables (never their values). */
export function authEnv(source: EnvSource = process.env): AuthEnv {
  return parseEnv(AuthEnvSchema, source);
}
