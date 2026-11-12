// Sport registry: positions, lineup slots and scoring kinds as data (DESIGN D17).
// Features read this instead of branching on sport. Does not own provider-specific position codes.
import { z } from 'zod';

export const SPORT_IDS = ['nfl'] as const;

export const SportSchema = z.enum(SPORT_IDS);

export type Sport = z.infer<typeof SportSchema>;

/** How a league decides matchups. NBA leagues often use categories, so both exist from day one. */
export const SCORING_KINDS = ['points', 'categories'] as const;

export type ScoringKind = (typeof SCORING_KINDS)[number];

export interface LineupSlotDefinition {
  /** Canonical slot id, e.g. "FLEX". */
  readonly id: string;
  /** Positions that may start in this slot. */
  readonly eligible: readonly string[];
}

export interface SportDefinition {
  readonly id: Sport;
  readonly label: string;
  readonly positions: readonly string[];
  readonly lineupSlots: readonly LineupSlotDefinition[];
  readonly scoringKinds: readonly ScoringKind[];
  /** Highest scoring period a provider may report for a season. */
  readonly maxWeek: number;
}

const NFL: SportDefinition = {
  id: 'nfl',
  label: 'Football',
  positions: ['QB', 'RB', 'WR', 'TE', 'K', 'DEF'],
  lineupSlots: [
    { id: 'QB', eligible: ['QB'] },
    { id: 'RB', eligible: ['RB'] },
    { id: 'WR', eligible: ['WR'] },
    { id: 'TE', eligible: ['TE'] },
    { id: 'FLEX', eligible: ['RB', 'WR', 'TE'] },
    { id: 'SUPER_FLEX', eligible: ['QB', 'RB', 'WR', 'TE'] },
    { id: 'K', eligible: ['K'] },
    { id: 'DEF', eligible: ['DEF'] },
  ],
  scoringKinds: ['points'],
  maxWeek: 18,
};

export const SPORT_REGISTRY: Readonly<Record<Sport, SportDefinition>> = { nfl: NFL };

export function getSport(id: Sport): SportDefinition {
  return SPORT_REGISTRY[id];
}

/** Schema for a week number that is valid for the given sport. */
export function weekSchema(sport: Sport) {
  return z.number().int().min(1).max(getSport(sport).maxWeek);
}
