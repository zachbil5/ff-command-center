// Next.js settings: workspace packages, image host allowlist and static security headers.
// The per-request CSP lives in src/proxy.ts because it needs a fresh nonce (DESIGN §8 R3).
import type { NextConfig } from 'next';
import { PROVIDER_ENDPOINTS } from '@ffc/config';

const imageHosts = Object.values(PROVIDER_ENDPOINTS).flatMap((endpoint) => endpoint.imageHosts);

const nextConfig: NextConfig = {
  // Workspace packages ship TypeScript source (DESIGN §4).
  transpilePackages: ['@ffc/analysis', '@ffc/config', '@ffc/domain', '@ffc/providers'],
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    // Only provider CDNs; league avatars are user-uploaded content on those hosts.
    remotePatterns: imageHosts.map((hostname) => ({ protocol: 'https', hostname })),
  },
  headers() {
    return Promise.resolve([
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
          { key: 'X-Frame-Options', value: 'DENY' },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=(), payment=(), usb=()',
          },
          { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains' },
        ],
      },
    ]);
  },
};

export default nextConfig;
