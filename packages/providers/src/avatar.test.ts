import { describe, expect, it } from 'vitest';
import { avatarUrl } from './avatar';

describe('avatarUrl', () => {
  it('builds Sleeper avatar URLs from plain ids', () => {
    expect(avatarUrl('sleeper', 'abc123')).toBe('https://sleepercdn.com/avatars/thumbs/abc123');
  });

  it.each([null, '', '../x', 'https://evil.example/a.png', 'a b'])('returns null for %j', (id) => {
    expect(avatarUrl('sleeper', id)).toBeNull();
  });

  it('returns null for providers without an avatar base', () => {
    expect(avatarUrl('yahoo', 'abc123')).toBeNull();
  });
});
