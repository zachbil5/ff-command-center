// Words and numbers shown in the celebration, as pure functions so they can be tested
// without a browser. Does not own animation or layout.

export interface WinSummary {
  /** Stable id for this league-week, used as a React key and for "seen" tracking. */
  readonly key: string;
  readonly leagueName: string;
  readonly week: number;
  readonly myPoints: number;
  readonly opponentPoints: number;
  readonly opponentName: string;
}

export function celebrationTitle(wins: readonly WinSummary[]): string {
  if (wins.length <= 1) return 'You won!';
  return `You won ${wins.length} matchups!`;
}

const points = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function winLine(win: WinSummary): string {
  return `${points.format(win.myPoints)} – ${points.format(win.opponentPoints)} vs ${win.opponentName}`;
}

/** Confetti only when the viewer hasn't asked the system to reduce motion. */
export function shouldAnimate(prefersReducedMotion: boolean): boolean {
  return !prefersReducedMotion;
}
