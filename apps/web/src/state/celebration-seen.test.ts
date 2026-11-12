import { describe, expect, it } from 'vitest';
import { browserSeenStore, unseenWins } from './celebration-seen';

function memoryStorage() {
  const data = new Map<string, string>();
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => {
      data.set(k, v);
    },
  };
}

const wins = [{ key: 'a' }, { key: 'b' }];

describe('celebration seen store', () => {
  it('celebrates each win once', () => {
    const store = browserSeenStore(memoryStorage());
    expect(unseenWins(wins, store)).toEqual(wins);
    store.add('a');
    expect(unseenWins(wins, store)).toEqual([{ key: 'b' }]);
  });

  it('treats missing or throwing storage as "not seen" without crashing', () => {
    const throwing = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('blocked');
      },
    };
    for (const storage of [null, throwing]) {
      const store = browserSeenStore(storage);
      expect(() => {
        store.add('a');
      }).not.toThrow();
      expect(unseenWins(wins, store)).toEqual(wins);
    }
  });
});
