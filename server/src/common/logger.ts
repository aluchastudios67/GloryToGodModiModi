import type { LoggerOptions } from 'pino';
import type { Env } from '../config/env';

/**
 * Paths pino blanks before anything reaches a log sink. Add to this list
 * whenever a new secret-bearing field appears — it is cheaper than auditing
 * logs after the fact, and log aggregators are a common breach surface.
 */
export const REDACT_PATHS = [
  'req.headers.authorization',
  'req.headers.cookie',
  'headers.authorization',
  'headers.cookie',
  'password',
  'token',
  'refreshToken',
  'accessToken',
  'entranceCode',
  '*.password',
  '*.token',
  '*.refreshToken',
  '*.accessToken',
  '*.entranceCode',
];

/**
 * Fastify embeds pino, so configuring it here gives every request log line a
 * `reqId` for free — no per-controller plumbing.
 */
export function buildLoggerOptions(env: Env): LoggerOptions {
  const base: LoggerOptions = {
    level: env.LOG_LEVEL,
    redact: { paths: REDACT_PATHS, censor: '[REDACTED]' },
  };

  if (env.NODE_ENV !== 'development') return base;

  return {
    ...base,
    transport: {
      target: 'pino-pretty',
      options: { colorize: true, singleLine: true, translateTime: 'HH:MM:ss.l' },
    },
  };
}
