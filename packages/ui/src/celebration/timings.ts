// Celebration durations and confetti settings: the one home for these numbers (DESIGN D11).

export const CELEBRATION_TIMINGS = {
  /** How long confetti keeps launching after the banner opens. */
  burstMs: 2_200,
  /** Gap between confetti launches during the burst. */
  launchEveryMs: 220,
} as const;

/** Brand-adjacent confetti colours; the banner itself uses the app's CSS tokens. */
export const CONFETTI_COLORS = ['#1f7a4d', '#3fbf7f', '#f5c542', '#ffffff', '#e8ebf0'] as const;
