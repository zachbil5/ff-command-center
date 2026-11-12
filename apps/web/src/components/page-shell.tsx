// Page frame: app header and a centred content column. Layout only.
import Link from 'next/link';
import type { ReactNode } from 'react';

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-border bg-surface">
        <div className="mx-auto flex max-w-3xl items-center px-4 py-3">
          <Link href="/" className="font-bold tracking-tight">
            Fantasy Football Center
          </Link>
        </div>
      </header>
      <main className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8">{children}</main>
    </div>
  );
}
