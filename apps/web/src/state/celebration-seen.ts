// Remembers which wins this browser has already celebrated (DESIGN F6). localStorage until
// accounts land in M3, then the `celebration_seen` table. Storage can be missing or throw
// (private mode, blocked site data), so every access is guarded and failure means "not seen".

const PREFIX = 'ffc:celebrated:';

export interface SeenStore {
  has(key: string): boolean;
  add(key: string): void;
}

export function browserSeenStore(storage: Pick<Storage, 'getItem' | 'setItem'> | null): SeenStore {
  return {
    has(key) {
      try {
        return storage?.getItem(PREFIX + key) === '1';
      } catch {
        return false;
      }
    },
    add(key) {
      try {
        storage?.setItem(PREFIX + key, '1');
      } catch {
        // Can't remember it; the worst case is celebrating again next visit.
      }
    },
  };
}

/** The wins this browser hasn't celebrated yet, in the given order. */
export function unseenWins<T extends { readonly key: string }>(
  wins: readonly T[],
  store: SeenStore,
): T[] {
  return wins.filter((win) => !store.has(win.key));
}

/** Window event a "Replay" button dispatches to show one win again. */
export const REPLAY_EVENT = 'ffc:replay-celebration';
