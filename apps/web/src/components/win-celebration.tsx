'use client';
// Shows the celebration for wins the server says this user hasn't seen, records them as seen
// when dismissed, and shows one again on "Replay" (DESIGN F6). Wiring only: the overlay is
// @ffc/ui's Celebration; "seen" lives in the database via a server action.
import { Celebration, type WinSummary } from '@ffc/ui';
import { useCallback, useEffect, useState } from 'react';
import { REPLAY_EVENT } from '@/state/celebration-events';

export interface CelebratedWin extends WinSummary {
  readonly leagueKey: string;
}

export function WinCelebration({
  unseen,
  replayable,
  markSeen,
}: {
  /** Wins to celebrate on arrival (already filtered by the server). */
  unseen: readonly CelebratedWin[];
  /** Wins a Replay button may show again. */
  replayable: readonly CelebratedWin[];
  markSeen: (wins: { leagueKey: string; week: number }[]) => Promise<void>;
}) {
  const [showing, setShowing] = useState<readonly CelebratedWin[]>(unseen);

  useEffect(() => {
    const onReplay = (event: Event) => {
      const key = (event as CustomEvent<string>).detail;
      const win = replayable.find((w) => w.key === key);
      if (win !== undefined) setShowing([win]);
    };
    window.addEventListener(REPLAY_EVENT, onReplay);
    return () => {
      window.removeEventListener(REPLAY_EVENT, onReplay);
    };
  }, [replayable]);

  const done = useCallback(() => {
    void markSeen(showing.map(({ leagueKey, week }) => ({ leagueKey, week })));
    setShowing([]);
  }, [showing, markSeen]);

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
