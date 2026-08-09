import 'reflect-metadata';

import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/common/prisma.service';
import { AllExceptionsFilter } from '../src/common/error.filter';
import { ERROR_CODES, toEnvelope } from '../src/common/http-error';
import { genReqId, requestIdOf } from '../src/common/request-id';
import { isHealthPath, registerRateLimitHook } from '../src/main';

/**
 * The plugins live in `bootstrap()`, which no test could reach — so helmet,
 * CORS and the rate limiter were entirely uncovered. This mirrors that wiring
 * and asserts the behaviour the phase promises.
 *
 * A lower limit than production's 100 keeps the test fast.
 */
const TEST_LIMIT = 5;

async function buildApp(options: {
  trustProxy: boolean;
  failDb?: boolean;
}): Promise<NestFastifyApplication> {
  const builder = Test.createTestingModule({ imports: [AppModule] });

  if (options.failDb) {
    builder.overrideProvider(PrismaService).useValue({
      $queryRaw: () => Promise.reject(new Error('database is gone')),
      $connect: () => Promise.resolve(),
      $disconnect: () => Promise.resolve(),
      onModuleInit: () => Promise.resolve(),
      onModuleDestroy: () => Promise.resolve(),
    });
  }

  const moduleRef = await builder.compile();

  const app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter({
      genReqId,
      logger: false,
      trustProxy: options.trustProxy,
    }),
  );

  await app.register(fastifyHelmet);
  await app.register(fastifyCors, {
    origin: ['http://localhost:8081'],
    credentials: true,
  });
  await app.register(fastifyRateLimit, {
    global: false,
    max: TEST_LIMIT,
    timeWindow: '1 minute',
    errorResponseBuilder: (request, context) =>
      toEnvelope(
        ERROR_CODES.RATE_LIMITED,
        `Too many requests. Retry in ${context.after}.`,
        requestIdOf(request),
      ),
  });

  // Exactly the production wiring, so the test covers the real thing.
  registerRateLimitHook(app);

  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  return app;
}

describe('rate limiting', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await buildApp({ trustProxy: false });
  });

  afterAll(async () => {
    await app.close();
  });

  it('limits unmatched routes — 404s were previously unlimited', async () => {
    const statuses: number[] = [];

    for (let i = 0; i < TEST_LIMIT + 3; i++) {
      const response = await app.inject({ method: 'GET', url: '/nope' });
      statuses.push(response.statusCode);
    }

    expect(statuses.filter((s) => s === 404)).toHaveLength(TEST_LIMIT);
    expect(statuses).toContain(429);
  });

  it('returns the error envelope when it throttles', async () => {
    for (let i = 0; i < TEST_LIMIT + 1; i++) {
      await app.inject({ method: 'GET', url: '/also-nope' });
    }

    const response = await app.inject({ method: 'GET', url: '/also-nope' });

    expect(response.statusCode).toBe(429);
    expect(response.json()).toEqual({
      error: {
        code: 'RATE_LIMITED',
        message: expect.stringContaining('Too many requests'),
        requestId: expect.any(String),
      },
    });
  });

  it('never throttles /health, however many probes arrive', async () => {
    const statuses: number[] = [];

    for (let i = 0; i < TEST_LIMIT * 3; i++) {
      const response = await app.inject({ method: 'GET', url: '/health' });
      statuses.push(response.statusCode);
    }

    expect(new Set(statuses)).toEqual(new Set([200]));
  });

  it('does not extend the /health exemption to /healthXYZ', () => {
    expect(isHealthPath('/health')).toBe(true);
    expect(isHealthPath('/health?verbose=1')).toBe(true);
    expect(isHealthPath('/healthXYZ')).toBe(false);
    expect(isHealthPath('/health/secret')).toBe(false);
  });

  it('ignores a spoofed X-Forwarded-For when trustProxy is off', async () => {
    const statuses: number[] = [];

    // A different "client IP" every time. With trustProxy on, each of these
    // would get its own fresh quota and none would ever be throttled.
    for (let i = 0; i < TEST_LIMIT + 3; i++) {
      const response = await app.inject({
        method: 'GET',
        url: '/spoof-check',
        headers: { 'x-forwarded-for': `10.0.0.${i + 1}` },
      });
      statuses.push(response.statusCode);
    }

    expect(statuses).toContain(429);
  });
});

describe('security headers and CORS', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await buildApp({ trustProxy: false });
  });

  afterAll(async () => {
    await app.close();
  });

  it('sets helmet headers on responses', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.headers['x-content-type-options']).toBe('nosniff');
    expect(response.headers['x-frame-options']).toBeDefined();
  });

  it('reflects an allowed origin', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'http://localhost:8081' },
    });

    expect(response.headers['access-control-allow-origin']).toBe(
      'http://localhost:8081',
    );
  });

  it('does not reflect an unlisted origin', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/health',
      headers: { origin: 'https://evil.example.com' },
    });

    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});

describe('GET /health when the database is unreachable', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    app = await buildApp({ trustProxy: false, failDb: true });
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 503 with db down, promptly, without crashing', async () => {
    const startedAt = Date.now();
    const response = await app.inject({ method: 'GET', url: '/health' });
    const elapsed = Date.now() - startedAt;

    expect(response.statusCode).toBe(503);
    expect(response.json()).toMatchObject({ status: 'degraded', db: 'down' });
    expect(elapsed).toBeLessThan(3_000);
  });

  it('still answers on a second request — the failure is not fatal', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });
    expect(response.statusCode).toBe(503);
  });
});
