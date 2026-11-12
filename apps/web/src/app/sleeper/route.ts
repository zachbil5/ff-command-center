// GET /sleeper?username=… → redirect to that user's leagues page. Thin edge: validate, redirect.
import { NextResponse, type NextRequest } from 'next/server';
import { parseSleeperUsername, routes } from '@/routes';

export function GET(request: NextRequest): NextResponse {
  const username = parseSleeperUsername(request.nextUrl.searchParams.get('username'));
  const target = username === null ? routes.home('invalid_username') : routes.sleeperUser(username);
  // Same-origin, relative target only: never redirect to user-supplied hosts (DESIGN §8 R6).
  return NextResponse.redirect(new URL(target, request.nextUrl.origin), 303);
}
