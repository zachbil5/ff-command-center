'use server';
// Records celebrated wins for the signed-in user (DESIGN F6). Input comes from the browser, so
// it is parsed strictly: valid league keys and weeks only, a capped list.
import { getDatabase, markCelebrated } from '@ffc/db';
import { getSport, parseLeagueRefKey } from '@ffc/domain';
import { z } from 'zod';
import { requireUser } from '../auth';

const MAX_WINS_PER_CALL = 50;

const SeenSchema = z
  .array(z.object({ leagueKey: z.string().max(120), week: z.number().int() }).strict())
  .max(MAX_WINS_PER_CALL);

export async function markCelebratedAction(input: unknown): Promise<void> {
  const user = await requireUser();
  const parsed = SeenSchema.safeParse(input);
  if (!parsed.success) return;
  const valid = parsed.data.filter(({ leagueKey, week }) => {
    try {
      const ref = parseLeagueRefKey(leagueKey);
      return week >= 1 && week <= getSport(ref.sport).maxWeek;
    } catch {
      return false;
    }
  });
  const { db } = await getDatabase();
  await markCelebrated(db, user.id, valid);
}
