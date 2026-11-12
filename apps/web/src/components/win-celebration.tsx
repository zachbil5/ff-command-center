'use client';
// Shows the celebration for wins this browser hasn't seen, and again on "Replay" (DESIGN F6).
// Wiring only: the overlay is @ffc/ui's Celebration; "seen" lives in state/celebration-seen.
import { Celebration, type WinSummary } from '@ffc/ui';
import { useCallback, useEffect, useState } from 'react';
import { browserSeenStore, REPLAY_EVENT, unseenWins } from '@/state/celebration-seen';

function store() {
  return browserSeenStore(typeof window === 'undefined' ? null : window.localStorage);
}

export function WinCelebration({ wins }: { wins: readonly WinSummary[] }) {
  const [showing, setShowing] = useState<readonly WinSummary[]>([]);

  // Runs after hydration: the server can't know what this browser has seen, so it renders
  // nothing and the overlay appears on the client (also keeps server HTML free of it).
  useEffect(() => {
    const fresh = unseenWins(wins, store());
    // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from localStorage, an external store read once per page
    if (fresh.length > 0) setShowing(fresh);
  }, [wins]);

  useEffect(() => {
    const onReplay = (event: Event) => {
      const key = (event as CustomEvent<string>).detail;
      const win = wins.find((w) => w.key === key);
      if (win !== undefined) setShowing([win]);
    };
    window.addEventListener(REPLAY_EVENT, onReplay);
    return () => {
      window.removeEventListener(REPLAY_EVENT, onReplay);
    };
  }, [wins]);

  const done = useCallback(() => {
    const seen = store();
    for (const win of showing) seen.add(win.key);
    setShowing([]);
  }, [showing]);

  return showing.length > 0 ? <Celebration wins={showing} onDone={done} /> : null;
}

export function ReplayCelebrationButton({ winKey }: { winKey: string }) {
  return (
    <button
      type="button"
      onClick={() => window.dispatchEvent(new CustomEvent(REPLAY_EVENT, { detail: winKey }))}
      className="text-xs font-medium text-accent hover:underline"
    >
      Replay 🎉
    </button>
  );
}
