'use client';
// Win celebration overlay (DESIGN F6): a banner listing this week's wins plus a confetti burst.
// Presentational: wins come in, "done" goes out; it never fetches or decides what is new.
//
// CSP notes (DESIGN §8 R3): no inline `style` attributes are rendered; canvas-confetti sets
// its canvas styles from script (allowed) and runs without a blob: worker (useWorker: false).
// With prefers-reduced-motion the banner shows without confetti or animation.
import confetti from 'canvas-confetti';
import { useEffect, useId, useRef } from 'react';
import { celebrationTitle, shouldAnimate, winLine, type WinSummary } from './copy';
import { CELEBRATION_TIMINGS, CONFETTI_COLORS } from './timings';

export interface CelebrationProps {
  readonly wins: readonly WinSummary[];
  readonly onDone: () => void;
}

function launchConfetti(): () => void {
  const fire = confetti.create(undefined, { resize: true, useWorker: false });
  const launch = () => {
    for (const x of [0.2, 0.8]) {
      void fire({
        particleCount: 40,
        spread: 70,
        startVelocity: 45,
        origin: { x, y: 0.7 },
        colors: [...CONFETTI_COLORS],
        disableForReducedMotion: true,
      });
    }
  };
  launch();
  const timer = setInterval(launch, CELEBRATION_TIMINGS.launchEveryMs);
  const stop = setTimeout(() => {
    clearInterval(timer);
  }, CELEBRATION_TIMINGS.burstMs);
  return () => {
    clearInterval(timer);
    clearTimeout(stop);
    fire.reset();
  };
}

export function Celebration({ wins, onDone }: CelebrationProps) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const stop = shouldAnimate(reduce) ? launchConfetti() : undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onDone();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      stop?.();
    };
  }, [onDone]);

  if (wins.length === 0) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-sm rounded-2xl border border-border bg-surface p-6 text-center shadow-xl motion-safe:animate-pop-in"
      >
        <p aria-hidden className="text-5xl">
          🏆
        </p>
        <h2 id={titleId} className="mt-2 text-2xl font-bold tracking-tight">
          {celebrationTitle(wins)}
        </h2>
        <ul className="mt-4 flex flex-col gap-2 text-left">
          {wins.map((win) => (
            <li key={win.key} className="rounded-lg bg-accent/10 px-3 py-2">
              <p className="font-semibold">
                {win.leagueName} · Week {win.week}
              </p>
              <p className="text-sm text-muted tabular-nums">{winLine(win)}</p>
            </li>
          ))}
        </ul>
        <button
          ref={closeRef}
          type="button"
          onClick={onDone}
          className="mt-5 w-full rounded-lg bg-accent px-4 py-2 font-medium text-white hover:opacity-90"
        >
          Nice
        </button>
      </div>
    </div>
  );
}
