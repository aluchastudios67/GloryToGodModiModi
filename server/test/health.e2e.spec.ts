import 'reflect-metadata';

import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/error.filter';
import { genReqId } from '../src/common/request-id';

/**
 * Boots the real application against the real test database. Mocking Prisma
 * here would prove only that the mock works.
 */
describe('GET /health', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(
      new FastifyAdapter({ genReqId, logger: false }),
    );
    app.useGlobalFilters(new AllExceptionsFilter());

    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('returns 200 with db up when Postgres is reachable', async () => {
    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);

    const body = response.json<{
      status: string;
      uptimeSec: number;
      db: string;
      version: string;
    }>();

    expect(body.db).toBe('up');
    expect(body.status).toBe('ok');
    expect(body.uptimeSec).toBeGreaterThanOrEqual(0);
    expect(body.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('answers well inside the 3 second budget', async () => {
    const startedAt = Date.now();
    await app.inject({ method: 'GET', url: '/health' });

    expect(Date.now() - startedAt).toBeLessThan(3_000);
  });

  it('echoes an inbound x-request-id so a trace survives a proxy hop', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/unknown-route',
      headers: { 'x-request-id': 'trace-me-123' },
    });

    expect(response.json()).toEqual({
      error: {
        code: 'NOT_FOUND',
        message: expect.any(String),
        requestId: 'trace-me-123',
      },
    });
  });

  it('wraps every failure in the one error envelope', async () => {
    const response = await app.inject({ method: 'GET', url: '/nope' });

    expect(response.statusCode).toBe(404);

    const body = response.json<{ error: Record<string, unknown> }>();

    expect(Object.keys(body)).toEqual(['error']);
    expect(Object.keys(body.error).sort()).toEqual([
      'code',
      'message',
      'requestId',
    ]);
    // A generated id, not the literal string.
    expect(body.error.requestId).toMatch(/^[0-9a-f-]{36}$/);
  });
});
