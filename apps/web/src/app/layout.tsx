// Root layout: document shell, metadata and global styles. Wiring only, no data fetching.
import type { Metadata, Viewport } from 'next';
import { connection } from 'next/server';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'Fantasy Football Center',
  description: 'Every fantasy league you play in, in one place.',
  applicationName: 'Fantasy Football Center',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f7f8fa' },
    { media: '(prefers-color-scheme: dark)', color: '#0e1116' },
  ],
};

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  // Render per request so Next.js can stamp the CSP nonce from src/proxy.ts onto its scripts.
  // Statically prerendered pages would ship without a nonce and be blocked (DESIGN §8 R3).
  await connection();
  return (
    <html lang="en">
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  );
}
