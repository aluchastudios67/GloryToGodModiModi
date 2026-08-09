import { describe, expect, it } from 'vitest';
import { EnvError, parseEnv } from './env';

const valid = {
  NODE_ENV: 'development',
  PORT: '3000',
  DATABASE_URL: 'postgresql://localhost:5432/modimodi_dev',
  LOG_LEVEL: 'debug',
  CORS_ORIGINS: 'http://localhost:8081,http://localhost:19006',
  TRUST_PROXY: 'false',
  ENCRYPTION_KEY: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=',
};

describe('parseEnv', () => {
  it('parses a complete environment and coerces PORT to a number', () => {
    const env = parseEnv(valid);

    expect(env.PORT).toBe(3000);
    expect(env.NODE_ENV).toBe('development');
    expect(env.CORS_ORIGINS).toEqual([
      'http://localhost:8081',
      'http://localhost:19006',
    ]);
  });

  it('names the missing variable rather than describing a type error', () => {
    const withoutDb = { ...valid, DATABASE_URL: undefined };

    expect(() => parseEnv(withoutDb)).toThrow(EnvError);

    try {
      parseEnv(withoutDb);
      expect.unreachable('should have thrown');
    } catch (error) {
      expect(error).toBeInstanceOf(EnvError);
      expect((error as EnvError).message).toContain('DATABASE_URL');
      expect((error as EnvError).message).toContain('missing');
    }
  });

  it('rejects a non-postgres DATABASE_URL', () => {
    expect(() =>
      parseEnv({ ...valid, DATABASE_URL: 'mysql://localhost:3306/x' }),
    ).toThrow(/DATABASE_URL/);
  });

  it('rejects a wildcard CORS origin', () => {
    expect(() => parseEnv({ ...valid, CORS_ORIGINS: '*' })).toThrow(
      /CORS_ORIGINS/,
    );
  });

  it('rejects an origin that is not an absolute URL', () => {
    expect(() => parseEnv({ ...valid, CORS_ORIGINS: 'localhost:8081' })).toThrow(
      /CORS_ORIGINS/,
    );
  });

  it('rejects an unknown NODE_ENV instead of falling back', () => {
    expect(() => parseEnv({ ...valid, NODE_ENV: 'staging' })).toThrow(
      /NODE_ENV/,
    );
  });

  it('reports every problem at once, not just the first', () => {
    const broken = { ...valid, DATABASE_URL: undefined, PORT: undefined };

    try {
      parseEnv(broken);
      expect.unreachable('should have thrown');
    } catch (error) {
      const message = (error as EnvError).message;
      expect(message).toContain('DATABASE_URL');
      expect(message).toContain('PORT');
    }
  });
});
