'use client';
// Error boundary for unexpected failures. Shows no error details to the user; Next.js logs
// them on the server.
import { Notice } from '@/components/notice';
import { PageShell } from '@/components/page-shell';

export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <PageShell>
      <Notice title="Something went wrong">
        <button type="button" onClick={reset} className="font-medium text-accent hover:underline">
          Try again
        </button>
      </Notice>
    </PageShell>
  );
}
