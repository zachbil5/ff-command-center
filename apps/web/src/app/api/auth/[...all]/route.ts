// Better Auth's endpoints (sign-in, OAuth callback, session, sign-out). Thin edge: hands the
// request to the auth instance, which validates state, PKCE and origins itself.
import { getAuth } from '@/features/auth';

async function handle(request: Request): Promise<Response> {
  const auth = await getAuth();
  return auth.handler(request);
}

export { handle as GET, handle as POST };
