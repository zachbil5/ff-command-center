// Per-request proxy (Next.js 16's name for middleware): sets a nonce-based CSP on every page and
// sends visitors without a session cookie to sign-in (DESIGN §6.1). The cookie check is only a
// fast path: pages and actions still verify the session (features/auth requireUser).
// Does not own the policy itself (src/security/csp.ts) or static headers (next.config.ts).
import { NextResponse, type NextRequest } from 'next/server';
import { PROVIDER_ENDPOINTS, isDevelopment } from '@ffc/config';
import { getSessionCookie } from 'better-auth/cookies';
import { isPublicPath, routes } from '@/routes';
import { buildCsp } from '@/security/csp';

const IMAGE_HOSTS = Object.values(PROVIDER_ENDPOINTS).flatMap((endpoint) => endpoint.imageHosts);

export function proxy(request: NextRequest): NextResponse {
  if (!isPublicPath(request.nextUrl.pathname) && getSessionCookie(request) === null) {
    return NextResponse.redirect(new URL(routes.signIn(), request.nextUrl.origin), 303);
  }

  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const csp = buildCsp({ nonce, development: isDevelopment(), imageHosts: IMAGE_HOSTS });

  // Next.js reads the nonce from the request's CSP header and applies it to its own scripts.
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('Content-Security-Policy', csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set('Content-Security-Policy', csp);
  return response;
}

export const config = {
  // Skip static assets and prefetches; they don't render HTML.
  matcher: [
    {
      source: '/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest).*)',
      missing: [
        { type: 'header', key: 'next-router-prefetch' },
        { type: 'header', key: 'purpose', value: 'prefetch' },
      ],
    },
  ],
};
