// Which state a league week is in, and which week to show by default (DESIGN F2, F6).
// Pure: uses only what the provider reported about the league. Does not own fetching.
import type { League, MatchupStatus } from '@ffc/domain';
import { getSport } from '@ffc/domain';

/**
 * A week is `final` once the provider has scored it, once the league has moved past it, or
 * when the league is complete; `live` when it is the league's current week of an active
 * season; otherwise `upcoming`. Using the provider's own week markers beats guessing from the
 * NFL calendar (Monday night games, byes, custom schedules).
 *
 * Weeks before the current week count as final even if the provider hasn't marked them
 * scored yet (it can lag a day for stat corrections), so status never goes backwards from
 * one week to the next. The win celebration is stricter: it waits for `lastScoredWeek`.
 */
export function weekStatus(league: League, week: number): MatchupStatus {
  if (league.status === 'complete') return 'final';
  if (league.lastScoredWeek !== null && week <= league.lastScoredWeek) return 'final';
  if (league.status !== 'in_season' || league.currentWeek === null) return 'upcoming';
  if (week < league.currentWeek) return 'final';
  return week === league.currentWeek ? 'live' : 'upcoming';
}

/** The week a league page opens on: this week in season, the last scored week once done. */
export function defaultWeek(league: League): number {
  const max = getSport(league.ref.sport).maxWeek;
  const clamp = (week: number) => Math.min(Math.max(week, 1), max);
  if (league.status === 'in_season' && league.currentWeek !== null) {
    return clamp(league.currentWeek);
  }
  if (league.status === 'complete' && league.lastScoredWeek !== null) {
    return clamp(league.lastScoredWeek);
  }
  return 1;
}

/**
 * The most recent finished week worth celebrating, or null. Only active or just-finished
 * leagues qualify, so opening an old season never replays old wins.
 */
export function celebrationWeek(league: League): number | null {
  if (league.status !== 'in_season' && league.status !== 'complete') return null;
  return league.lastScoredWeek !== null && league.lastScoredWeek >= 1
    ? league.lastScoredWeek
    : null;
}

/**
 * The week to open a page spanning several leagues on: the default week most of them agree
 * on (ties go to the later week), or 1 with no leagues. Leagues in one season share NFL weeks,
 * so this is normally just "this week".
 */
export function commonDefaultWeek(leagues: readonly League[]): number {
  const votes = new Map<number, number>();
  for (const league of leagues) {
    const week = defaultWeek(league);
    votes.set(week, (votes.get(week) ?? 0) + 1);
  }
  let best = 1;
  let bestVotes = 0;
  for (const [week, count] of votes) {
    if (count > bestVotes || (count === bestVotes && week > best)) {
      best = week;
      bestVotes = count;
    }
  }
  return best;
}
