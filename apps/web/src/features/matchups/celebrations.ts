// Which wins to celebrate for the signed-in user (DESIGN F6). Only their own matchups count:
// viewing a friend's username shows no celebration. Does not own the banner or recording
// "seen" (actions.ts).
import { getDatabase, unseenWins } from '@ffc/db';
import { leagueRefKey } from '@ffc/domain';
import type { MyWin } from './my-matchups';

export interface CelebrationWin {
  readonly key: string;
  readonly leagueKey: string;
  readonly leagueName: string;
  readonly week: number;
  readonly myPoints: number;
  readonly opponentPoints: number;
  readonly opponentName: string;
}

export interface Celebrations {
  /** Show now: wins this user hasn't dismissed yet. */
  readonly unseen: readonly CelebrationWin[];
  /** Replay buttons may show these again. */
  readonly replayable: readonly CelebrationWin[];
}

const NONE: Celebrations = { unseen: [], replayable: [] };

export async function celebrationsFor(
  userId: string,
  wins: readonly MyWin[],
  viewingOwnAccount: boolean,
): Promise<Celebrations> {
  if (!viewingOwnAccount || wins.length === 0) return NONE;
  const all = wins.map((win) => ({
    key: win.key,
    leagueKey: leagueRefKey(win.league.ref),
    leagueName: win.league.name,
    week: win.week,
    myPoints: win.myPoints,
    opponentPoints: win.opponentPoints,
    opponentName: win.opponentName,
  }));
  const { db } = await getDatabase();
  return { unseen: await unseenWins(db, userId, all), replayable: all };
}
