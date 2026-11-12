import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { authEnv, databaseEnv, isDevelopment, parseEnv, runtimeEnv } from './env';

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

describe('databaseEnv', () => {
  it('accepts a Postgres URL or none', () => {
    expect(databaseEnv({}).DATABASE_URL).toBeUndefined();
    expect(
      databaseEnv({ DATABASE_URL: 'postgresql://u:p@h/db?sslmode=require' }).DATABASE_URL,
    ).toBe('postgresql://u:p@h/db?sslmode=require');
  });

  it('rejects other schemes without echoing the value', () => {
    expect(() => databaseEnv({ DATABASE_URL: 'https://u:secret@h/db' })).toThrow(/DATABASE_URL/);
    expect(() => databaseEnv({ DATABASE_URL: 'https://u:secret@h/db' })).not.toThrow(/secret/);
  });
});

describe('authEnv', () => {
  const valid = {
    BETTER_AUTH_SECRET: 'x'.repeat(32),
    BETTER_AUTH_URL: 'http://localhost:3000',
    GOOGLE_CLIENT_ID: 'client-id-123',
    GOOGLE_CLIENT_SECRET: 'client-secret-123',
    OWNER_EMAIL: '  Owner@Example.COM ',
  };

  it('parses and normalises the owner email', () => {
    expect(authEnv(valid).OWNER_EMAIL).toBe('owner@example.com');
  });

  it('requires a long secret and a web origin', () => {
    expect(() => authEnv({ ...valid, BETTER_AUTH_SECRET: 'short' })).toThrow(/BETTER_AUTH_SECRET/);
    expect(() => authEnv({ ...valid, BETTER_AUTH_URL: 'javascript:alert(1)' })).toThrow(
      /BETTER_AUTH_URL/,
    );
  });
});
