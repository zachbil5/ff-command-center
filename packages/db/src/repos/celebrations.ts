// Which wins a user has celebrated (DESIGN F6): the banner shows once per league-week.
// Does not own deciding what counts as a win (analysis) or the banner (ui).
import { and, eq, inArray } from 'drizzle-orm';
import type { Database } from '../client';
import { celebrationSeen } from '../schema';

export interface LeagueWeekKey {
  /** leagueRefKey() of the league. */
  readonly leagueKey: string;
  readonly week: number;
}

function id(key: LeagueWeekKey): string {
  return `${key.leagueKey}#${String(key.week)}`;
}

/** The subset of `wins` this user hasn't celebrated yet, in the same order. */
export async function unseenWins<T extends LeagueWeekKey>(
  db: Database,
  userId: string,
  wins: readonly T[],
): Promise<T[]> {
  if (wins.length === 0) return [];
  const rows = await db
    .select({ leagueKey: celebrationSeen.leagueKey, week: celebrationSeen.week })
    .from(celebrationSeen)
    .where(
      and(
        eq(celebrationSeen.userId, userId),
        inArray(
          celebrationSeen.leagueKey,
          wins.map((w) => w.leagueKey),
        ),
      ),
    );
  const seen = new Set(rows.map(id));
  return wins.filter((win) => !seen.has(id(win)));
}

/** Records the wins as celebrated; repeats are ignored. */
export async function markCelebrated(
  db: Database,
  userId: string,
  wins: readonly LeagueWeekKey[],
): Promise<void> {
  if (wins.length === 0) return;
  await db
    .insert(celebrationSeen)
    .values(wins.map((w) => ({ userId, leagueKey: w.leagueKey, week: w.week })))
    .onConflictDoNothing();
}
