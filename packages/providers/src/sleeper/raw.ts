// Zod schemas for the Sleeper API responses we read (DESIGN §5.3). Raw shapes only: unknown
// fields are dropped, sizes are capped, ids are numeric strings. Does not own mapping to domain.
import { z } from 'zod';

/** Sleeper ids (users, leagues) are numeric strings. */
export const SleeperIdSchema = z.string().regex(/^\d{1,32}$/);

/**
 * Sleeper usernames: letters, digits and underscores. Validated before any request so input
 * can't shape the outbound URL (DESIGN §8 R4).
 */
export const SleeperUsernameSchema = z
  .string()
  .trim()
  .min(2)
  .max(40)
  .regex(/^[A-Za-z0-9_]+$/);

const text = (max: number) => z.string().max(max);

/**
 * Cosmetic fields fall back to null instead of failing the whole response: a strange avatar
 * should never hide someone's league. Only plain ids are kept; avatar.ts builds the URL.
 */
const avatarId = z
  .string()
  .regex(/^[A-Za-z0-9]{1,64}$/)
  .nullable()
  .optional()
  .catch(null)
  .transform((value) => value ?? null);

const count = z.number().int().min(0).max(100_000);

export const SleeperStateSchema = z.object({
  season: z.string().regex(/^\d{4}$/),
  league_season: z
    .string()
    .regex(/^\d{4}$/)
    .optional(),
  week: z.number().int().min(0).max(30),
});

export const SleeperUserSchema = z.object({
  user_id: SleeperIdSchema,
  username: text(64).nullable().optional(),
  display_name: text(64),
  avatar: avatarId,
});

/** Sleeper also reports "postseason" in some seasons; it is still an active league. */
export const SLEEPER_LEAGUE_STATUSES = [
  'pre_draft',
  'drafting',
  'in_season',
  'postseason',
  'complete',
] as const;

export const SleeperLeagueSchema = z.object({
  league_id: SleeperIdSchema,
  name: text(120),
  season: z.string().regex(/^\d{4}$/),
  sport: z.literal('nfl'),
  status: z.enum(SLEEPER_LEAGUE_STATUSES),
  total_rosters: z.number().int().min(1).max(64),
  avatar: avatarId,
  /**
   * `leg` is the week the league is on; `last_scored_leg` the latest week Sleeper has
   * finished scoring. Missing before the season; out-of-range values fall back to unknown.
   */
  settings: z
    .object({
      leg: z.number().int().min(0).max(30).nullable().optional().catch(null),
      last_scored_leg: z.number().int().min(0).max(30).nullable().optional().catch(null),
    })
    .nullable()
    .optional(),
});

/** Points can be negative (defence, kickers) and are decimals; cap to a sane range. */
const weeklyPoints = z.number().min(-1000).max(1000);

export const SleeperMatchupSchema = z.object({
  roster_id: z.number().int().min(1).max(64),
  /** Shared by the two rosters that play each other; null on a bye. */
  matchup_id: z.number().int().min(1).max(64).nullable().optional(),
  points: weeklyPoints.nullable().optional(),
  /** A commissioner's override of `points`, when set. */
  custom_points: weeklyPoints.nullable().optional(),
});

export const SleeperRosterSchema = z.object({
  roster_id: z.number().int().min(1).max(64),
  owner_id: SleeperIdSchema.nullable().optional(),
  settings: z.object({
    wins: count,
    losses: count,
    ties: count,
    fpts: count.default(0),
    fpts_decimal: z.number().int().min(0).max(99).default(0),
    fpts_against: count.default(0),
    fpts_against_decimal: z.number().int().min(0).max(99).default(0),
  }),
});

export const SleeperLeagueUserSchema = z.object({
  user_id: SleeperIdSchema,
  display_name: text(64),
  avatar: avatarId,
  metadata: z
    .object({ team_name: text(120).optional() })
    .nullable()
    .optional(),
});

/** Upper bounds on list sizes we will accept from Sleeper. */
export const SLEEPER_LIST_LIMITS = {
  leagues: 300,
  rosters: 64,
  leagueUsers: 200,
  matchups: 64,
} as const;

export type SleeperUser = z.infer<typeof SleeperUserSchema>;
export type SleeperLeague = z.infer<typeof SleeperLeagueSchema>;
export type SleeperRoster = z.infer<typeof SleeperRosterSchema>;
export type SleeperLeagueUser = z.infer<typeof SleeperLeagueUserSchema>;
export type SleeperMatchup = z.infer<typeof SleeperMatchupSchema>;
