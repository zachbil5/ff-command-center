// Adapter contract suite (DESIGN §5.2): the same assertions run against every provider's
// fixtures. Adding a provider means making this suite pass. Test-only; not in the facade.
import { LeagueRefSchema, SPORT_IDS, type ProviderUser } from '@ffc/domain';
import { describe, expect, it } from 'vitest';
import type { FantasyProvider } from '../provider';

export interface ContractCase {
  readonly name: string;
  readonly provider: () => FantasyProvider;
  readonly user: ProviderUser;
  readonly season: number;
  /** Weeks the fixtures cover; the first league is checked for each. */
  readonly matchupWeeks: readonly number[];
}

export function describeProviderContract({
  name,
  provider,
  user,
  season,
  matchupWeeks,
}: ContractCase): void {
  describe(`${name} satisfies the provider contract`, () => {
    it('declares only known sports', () => {
      for (const sport of provider().sports) expect(SPORT_IDS).toContain(sport);
    });

    it('reports a plausible current season', async () => {
      const current = await provider().currentSeason('nfl');
      expect(Number.isInteger(current)).toBe(true);
      expect(current).toBeGreaterThanOrEqual(2000);
    });

    it('lists leagues with valid refs for this provider and season', async () => {
      const p = provider();
      const { items, skipped } = await p.listLeagues(user, 'nfl', season);
      expect(skipped).toBeGreaterThanOrEqual(0);
      expect(items.length).toBeGreaterThan(0);
      for (const league of items) {
        expect(LeagueRefSchema.parse(league.ref)).toEqual(league.ref);
        expect(league.ref.provider).toBe(p.id);
        expect(league.ref.season).toBe(season);
        expect(league.teamCount).toBeGreaterThan(0);
      }
    });

    async function firstLeague(p: FantasyProvider) {
      const [first] = (await p.listLeagues(user, 'nfl', season)).items;
      if (first === undefined) throw new Error(`${name} fixtures must include a league`);
      return first;
    }

    it('returns each listed league by its ref', async () => {
      const p = provider();
      const first = await firstLeague(p);
      expect((await p.getLeague(first.ref)).ref).toEqual(first.ref);
    });

    it('pairs each team at most once per week, only with teams in the league', async () => {
      const p = provider();
      const { ref } = await firstLeague(p);
      const teamIds = new Set((await p.getTeams(ref)).map((t) => t.teamId));
      for (const week of matchupWeeks) {
        const { items } = await p.getMatchups(ref, week, 'idle');
        const playing = items.flatMap((m) => [m.home.teamId, ...(m.away ? [m.away.teamId] : [])]);
        expect(new Set(playing).size).toBe(playing.length);
        for (const id of playing) expect(teamIds.has(id)).toBe(true);
        for (const m of items) {
          expect(m.week).toBe(week);
          expect(m.away?.teamId).not.toBe(m.home.teamId);
          expect(Number.isFinite(m.home.points)).toBe(true);
        }
      }
    });

    it('returns teams with unique ids and sane records', async () => {
      const p = provider();
      const teams = await p.getTeams((await firstLeague(p)).ref);
      expect(teams.length).toBeGreaterThan(0);
      expect(new Set(teams.map((t) => t.teamId)).size).toBe(teams.length);
      for (const team of teams) {
        expect(team.teamName.trim().length).toBeGreaterThan(0);
        for (const value of Object.values(team.record)) {
          expect(Number.isFinite(value)).toBe(true);
          expect(value).toBeGreaterThanOrEqual(0);
        }
      }
    });
  });
}
