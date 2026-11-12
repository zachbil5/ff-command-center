// The Better Auth instance (DESIGN §6.1): Google sign-in, invite-only, sessions in Postgres.
// The invite check lives in the user-create hook so no sign-in path can skip it.
// Does not own session lookups for pages (session.ts) or the invite list (db).
import { authEnv, type AuthEnv } from '@ffc/config';
import { canSignUp, getDatabase, schema, type Database } from '@ffc/db';
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { APIError } from 'better-auth/api';
import { routes } from '@/routes';

/** Error code put on the sign-in page URL when an email isn't invited. */
export const NOT_INVITED = 'not_invited';

/** Builds the auth instance for a database and settings; tests pass a throwaway database. */
export function buildAuth(db: Database, env: AuthEnv) {
  return betterAuth({
    baseURL: env.BETTER_AUTH_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: [env.BETTER_AUTH_URL],
    database: drizzleAdapter(db, {
      provider: 'pg',
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
      },
    }),
    emailAndPassword: { enabled: false },
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        prompt: 'select_account',
      },
    },
    // Google tokens aren't used after sign-in; never keep them in plaintext (R2).
    account: { encryptOAuthTokens: true },
    telemetry: { enabled: false },
    onAPIError: { errorURL: routes.signIn() },
    databaseHooks: {
      user: {
        create: {
          before: async (user) => {
            if (!(await canSignUp(db, user.email, env.OWNER_EMAIL))) {
              throw new APIError('FORBIDDEN', { message: NOT_INVITED });
            }
            return { data: user };
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof buildAuth>;

async function createAuth(): Promise<Auth> {
  const { db } = await getDatabase();
  return buildAuth(db, authEnv());
}

let auth: Promise<Auth> | undefined;

/** The shared auth instance, created on first use (it needs the database handle). */
export function getAuth(): Promise<Auth> {
  auth ??= createAuth();
  return auth;
}
