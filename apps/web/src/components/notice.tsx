// A boxed message for empty, not-found and provider-down states.
import Link from 'next/link';
import type { ReactNode } from 'react';

export function Notice({
  title,
  children,
  action,
}: {
  title: string;
  children?: ReactNode;
  action?: { href: string; label: string };
}) {
  return (
    <div role="status" className="rounded-xl border border-border bg-surface p-5">
      <p className="font-semibold">{title}</p>
      {children ? <div className="mt-1 text-sm text-muted">{children}</div> : null}
      {action ? (
        <Link
          href={action.href}
          className="mt-3 inline-block text-sm font-medium text-accent hover:underline"
        >
          {action.label}
        </Link>
      ) : null}
    </div>
  );
}
