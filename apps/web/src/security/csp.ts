// Builds the Content-Security-Policy header (DESIGN §8 R3, R7). Pure: nonce and mode are passed
// in by src/proxy.ts. Does not own other security headers (next.config.ts) or nonce generation.

export interface CspOptions {
  /** Fresh per request, base64. */
  readonly nonce: string;
  /** Dev mode needs eval for React Refresh and fast refresh; production never gets it. */
  readonly development: boolean;
  /** Extra image hosts, e.g. provider avatar CDNs. */
  readonly imageHosts?: readonly string[];
}

const NONCE_PATTERN = /^[A-Za-z0-9+/=_-]{16,}$/;
const HOST_PATTERN = /^[a-z0-9.-]+$/;

export function buildCsp({ nonce, development, imageHosts = [] }: CspOptions): string {
  if (!NONCE_PATTERN.test(nonce)) {
    throw new Error('CSP nonce must be base64 and at least 16 characters');
  }
  for (const host of imageHosts) {
    if (!HOST_PATTERN.test(host)) {
      throw new Error('CSP image host must be a bare hostname');
    }
  }
  const scriptSrc = [`'self'`, `'nonce-${nonce}'`, `'strict-dynamic'`];
  if (development) scriptSrc.push(`'unsafe-eval'`);

  const directives: Record<string, string[]> = {
    'default-src': [`'self'`],
    'script-src': scriptSrc,
    'style-src': development ? [`'self'`, `'unsafe-inline'`] : [`'self'`, `'nonce-${nonce}'`],
    'img-src': [`'self'`, 'blob:', 'data:', ...imageHosts.map((host) => `https://${host}`)],
    'font-src': [`'self'`],
    'connect-src': [`'self'`],
    'object-src': [`'none'`],
    'base-uri': [`'self'`],
    'form-action': [`'self'`],
    'frame-ancestors': [`'none'`],
  };

  const parts = Object.entries(directives).map(([name, values]) => `${name} ${values.join(' ')}`);
  if (!development) parts.push('upgrade-insecure-requests');
  return parts.join('; ');
}
