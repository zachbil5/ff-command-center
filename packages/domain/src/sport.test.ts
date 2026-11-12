import { describe, expect, it } from 'vitest';
import { SPORT_IDS, SPORT_REGISTRY, getSport, weekSchema } from './sport';

describe('sport registry', () => {
  it('has an entry for every sport id, keyed by its own id', () => {
    for (const id of SPORT_IDS) {
      expect(SPORT_REGISTRY[id].id).toBe(id);
    }
  });

  it.each(SPORT_IDS)('%s: every lineup slot only accepts known positions', (id) => {
    const sport = getSport(id);
    for (const slot of sport.lineupSlots) {
      expect(slot.eligible.length).toBeGreaterThan(0);
      for (const position of slot.eligible) {
        expect(sport.positions).toContain(position);
      }
    }
  });

  it.each(SPORT_IDS)('%s: slot ids are unique', (id) => {
    const ids = getSport(id).lineupSlots.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('nfl FLEX accepts RB, WR and TE but not QB', () => {
    const flex = getSport('nfl').lineupSlots.find((s) => s.id === 'FLEX');
    expect(flex?.eligible).toEqual(['RB', 'WR', 'TE']);
  });

  it('week schema enforces the sport range', () => {
    const schema = weekSchema('nfl');
    expect(schema.safeParse(1).success).toBe(true);
    expect(schema.safeParse(18).success).toBe(true);
    expect(schema.safeParse(0).success).toBe(false);
    expect(schema.safeParse(19).success).toBe(false);
    expect(schema.safeParse(1.5).success).toBe(false);
  });
});
