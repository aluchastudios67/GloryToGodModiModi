import { z } from 'zod';

/**
 * Environment parsing.
 *
 * Every variable is required. Nothing here has a default: a server that starts
 * with silently-wrong config is worse than one that refuses to start, because
 * the failure surfaces later and somewhere else.
 */

const NODE_ENVS = ['development', 'test', 'production'] as const;
const LOG_LEVELS = [
  'fatal',
  'error',
  'warn',
  'info',
  'debug',
  'trace',
  'silent',
] as const;

const postgresUrl = z
  .string()
  .min(1)
  .refine(
    (value) =>
      value.startsWith('postgres://') || value.startsWith('postgresql://'),
    { message: 'must be a postgres:// or postgresql:// connection string' },
  );

/**
 * Comma-separated origins. `*` is rejected outright — a wildcard CORS origin
 * plus credentials is the classic way to hand your API to any website.
 */
const corsOrigins = z
  .string()
  .min(1)
  .transform((value) =>
    value
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin.length > 0),
  )
  .refine((origins) => origins.length > 0, {
    message: 'must list at least one origin',
  })
  .refine((origins) => !origins.includes('*'), {
    message: 'must not be "*" — list explicit origins',
  })
  .refine((origins) => origins.every(isHttpOrigin), {
    message: 'every origin must be an absolute URL, e.g. http://localhost:8081',
  });

/**
 * `new URL()` alone is not enough: it parses "localhost:8081" happily, reading
 * "localhost:" as the scheme. An origin must have an http(s) scheme and a host.
 */
function isHttpOrigin(origin: string): boolean {
  try {
    const url = new URL(origin);
    return (
      (url.protocol === 'http:' || url.protocol === 'https:') &&
      url.host.length > 0
    );
  } catch {
    return false;
  }
}

/**
 * Whether to believe `X-Forwarded-For`.
 *
 * Only true when something you control terminates TLS in front of this process.
 * Trusting it unconditionally hands the rate limiter's identity key to the
 * caller: rotate the header, get a fresh quota, forever.
 */
const trustProxy = z
  .enum(['true', 'false'])
  .transform((value) => value === 'true');

/**
 * 32 bytes, base64. Validated at boot rather than at first use — discovering a
 * malformed encryption key when someone saves a door code is far worse than
 * discovering it on deploy.
 */
const encryptionKey = z
  .string()
  .min(1)
  .refine((value) => Buffer.from(value, 'base64').length === 32, {
    message: 'must be 32 bytes, base64 encoded (generate: npm run keygen)',
  });

export const envSchema = z.object({
  NODE_ENV: z.enum(NODE_ENVS),
  PORT: z.coerce.number().int().min(1).max(65_535),
  DATABASE_URL: postgresUrl,
  LOG_LEVEL: z.enum(LOG_LEVELS),
  CORS_ORIGINS: corsOrigins,
  TRUST_PROXY: trustProxy,
  ENCRYPTION_KEY: encryptionKey,
});

export type Env = z.infer<typeof envSchema>;

/** Thrown by {@link parseEnv}; carries the variable names that failed. */
export class EnvError extends Error {
  constructor(readonly problems: readonly string[]) {
    super(`Invalid environment:\n${problems.map((p) => `  - ${p}`).join('\n')}`);
    this.name = 'EnvError';
  }
}

/** Pure and testable: parses a plain object, throws EnvError, never exits. */
export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (result.success) return result.data;

  const problems = result.error.issues.map((issue) => {
    const name = issue.path.join('.') || '(root)';
    // A missing variable reads as "invalid type, expected string, got undefined",
    // which is technically true and useless at 3am.
    const missing =
      issue.code === 'invalid_type' && source[name] === undefined;
    return missing ? `${name} is missing` : `${name}: ${issue.message}`;
  });

  return ((): never => {
    throw new EnvError(problems);
  })();
}

/**
 * Boot-time entry point. Loads `.env` when present, parses, and on failure
 * prints the offending variable names and exits non-zero.
 */
export function loadEnvOrExit(
  source: Record<string, string | undefined> = process.env,
): Env {
  try {
    return parseEnv(source);
  } catch (error) {
    const message =
      error instanceof EnvError ? error.message : String(error);
    // Deliberately console, not pino: the logger is configured from the very
    // env we just failed to parse.
    console.error(`\n[config] ${message}\n`);
    console.error('[config] See server/.env.example for the full list.\n');
    process.exit(1);
  }
}

/** Reads `.env` into process.env if the file exists. No-op in production. */
export function loadDotEnvFile(path = '.env'): void {
  try {
    process.loadEnvFile(path);
  } catch {
    // Absent .env is normal — hosted environments inject real variables.
  }
}

/** DI token for the parsed, frozen environment. */
export const ENV = Symbol('ENV');
