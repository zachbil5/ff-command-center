'use client';
// Re-renders the page's server data on an interval while a week is live (DESIGN F2).
// Pauses while the tab is hidden so background tabs don't hit providers. The interval comes
// from the server (the matchupsLive cache lifetime), so client and cache agree.
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export function LiveRefresh({ intervalMs }: { intervalMs: number }) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      timer ??= setInterval(() => {
        router.refresh();
      }, intervalMs);
    };
    const stop = () => {
      clearInterval(timer);
      timer = undefined;
    };
    const onVisibility = () => {
      if (document.hidden) {
        stop();
      } else {
        router.refresh();
        start();
      }
    };
    if (!document.hidden) start();
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [router, intervalMs]);

  return (
    <p className="flex items-center gap-2 text-xs text-muted" role="status">
      <span aria-hidden className="size-2 rounded-full bg-accent motion-safe:animate-pulse" />
      Scores update every {Math.round(intervalMs / 1000)} seconds
    </p>
  );
}
