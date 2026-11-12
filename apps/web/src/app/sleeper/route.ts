// GET /sleeper?username=… → redirect to that user's leagues page. Thin edge: check the session,
// validate, redirect.
import { NextResponse, type NextRequest } from 'next/server';
import { getCurrentUser } from '@/features/auth';
import { parseSleeperUsername, routes } from '@/routes';

export async function GET(request: NextRequest): Promise<NextResponse> {
  if ((await getCurrentUser()) === null) {
    return NextResponse.redirect(new URL(routes.signIn(), request.nextUrl.origin), 303);
  }
  const username = parseSleeperUsername(request.nextUrl.searchParams.get('username'));
  const target = username === null ? routes.home('invalid_username') : routes.sleeperUser(username);
  // Same-origin, relative target only: never redirect to user-supplied hosts (DESIGN §8 R6).
  return NextResponse.redirect(new URL(target, request.nextUrl.origin), 303);
}
