import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { isDevelopment, parseEnv, runtimeEnv } from './env';

describe('parseEnv', () => {
  const schema = z.object({ API_KEY: z.string().min(10), PORT: z.coerce.number().int() });

  it('returns typed values', () => {
    expect(parseEnv(schema, { API_KEY: 'abcdefghijk', PORT: '3000' })).toEqual({
      API_KEY: 'abcdefghijk',
      PORT: 3000,
    });
  });

  it('names every bad variable but never echoes a value', () => {
    const secret = 'short-secret';
    let message = '';
    try {
      parseEnv(schema, { API_KEY: 'tiny', PORT: secret });
    } catch (error) {
      message = (error as Error).message;
    }
    expect(message).toContain('API_KEY');
    expect(message).toContain('PORT');
    expect(message).not.toContain('tiny');
    expect(message).not.toContain(secret);
  });
});

describe('runtimeEnv', () => {
  it('defaults NODE_ENV to development', () => {
    expect(runtimeEnv({}).NODE_ENV).toBe('development');
    expect(isDevelopment({})).toBe(true);
  });

  it('rejects unknown NODE_ENV values', () => {
    expect(() => runtimeEnv({ NODE_ENV: 'staging' })).toThrow(/NODE_ENV/);
  });

  it('recognises production', () => {
    expect(isDevelopment({ NODE_ENV: 'production' })).toBe(false);
  });
});
