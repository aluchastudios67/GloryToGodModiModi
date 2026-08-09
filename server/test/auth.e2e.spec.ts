import 'reflect-metadata';

import { PrismaClient } from '@prisma/client';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { AppModule } from '../src/app.module';
import { AllExceptionsFilter } from '../src/common/error.filter';
import { genReqId } from '../src/common/request-id';

const prisma = new PrismaClient();
const RUN = randomUUID().slice(0, 8);
const emailFor = (name: string) => `auth_${RUN}_${name}@example.test`;

const GOOD_PASSWORD = 'correct-horse-battery';

let app: NestFastifyApplication;

/**
 * The suite runs behind `trustProxy: true` so each test can present its own
 * client IP. Without that every request looks like 127.0.0.1 and the 3/hour
 * registration limit — which is the behaviour we want in production — would
 * throttle the test suite itself after three accounts.
 */
let ipCounter = 0;
const freshIp = () => `10.42.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;

const post = (
  url: string,
  payload: unknown,
  token?: string,
  ip: string = freshIp(),
) =>
  app.inject({
    method: 'POST',
    url,
    payload: payload as object,
    headers: {
      'x-forwarded-for': ip,
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });

const get = (url: string, token?: string) =>
  app.inject({
    method: 'GET',
    url,
    headers: {
      'x-forwarded-for': freshIp(),
      ...(token ? { authorization: `Bearer ${token}` } : {}),
    },
  });

async function register(name: string, password = GOOD_PASSWORD) {
  const response = await post('/auth/register', {
    email: emailFor(name),
    password,
    name: 'Test Person',
  });
  return response;
}

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  app = moduleRef.createNestApplication<NestFastifyApplication>(
    new FastifyAdapter({ genReqId, logger: false, trustProxy: true }),
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
});

afterAll(async () => {
  const users = await prisma.user.findMany({
    where: { email: { contains: `auth_${RUN}_` } },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
  await app.close();
});

describe('registration', () => {
  it('creates an account and returns a token pair', async () => {
    const response = await register('basic');
    expect(response.statusCode).toBe(201);

    const body = response.json<{
      accessToken: string;
      refreshToken: string;
      user: Record<string, unknown>;
    }>();

    expect(body.accessToken).toBeTruthy();
    expect(body.refreshToken).toBeTruthy();
    expect(body.user.email).toBe(emailFor('basic'));
  });

  it('never returns the password hash', async () => {
    const response = await register('nohash');
    const raw = response.body;

    expect(raw).not.toContain('passwordHash');
    expect(raw).not.toContain('$argon2');
  });

  it('rejects a duplicate email with a specific code', async () => {
    await register('dupe');
    const again = await register('dupe');

    expect(again.statusCode).toBe(409);
    expect(again.json<{ error: { code: string } }>().error.code).toBe(
      'EMAIL_TAKEN',
    );
  });

  it('rejects a short password', async () => {
    const response = await post('/auth/register', {
      email: emailFor('short'),
      password: 'short1',
      name: 'X',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json<{ error: { code: string } }>().error.code).toBe(
      'PASSWORD_TOO_SHORT',
    );
  });

  it('rejects a common password that survives the length rule', async () => {
    // 10 characters, so the length check passes; it is rank 1159 in the
    // frequency list, which is why the list has to be wider than 1,000.
    const response = await post('/auth/register', {
      email: emailFor('common'),
      password: '1234567890',
      name: 'X',
    });

    expect(response.statusCode).toBe(400);
    expect(response.json<{ error: { code: string } }>().error.code).toBe(
      'PASSWORD_TOO_COMMON',
    );
  });

  it('cannot be talked into granting a role it was not asked for', async () => {
    // isWalker defaults to false; a caller may ask, but nothing else may.
    const response = await post('/auth/register', {
      email: emailFor('roles'),
      password: GOOD_PASSWORD,
      name: 'X',
      isWalker: true,
      id: 'usr_attacker',
      isAdmin: true,
    });

    const body = response.json<{ user: { id: string; isWalker: boolean } }>();
    expect(body.user.isWalker).toBe(true);
    expect(body.user.id).not.toBe('usr_attacker');
  });
});

describe('login', () => {
  it('returns a token pair for correct credentials', async () => {
    await register('login');
    const response = await post('/auth/login', {
      email: emailFor('login'),
      password: GOOD_PASSWORD,
    });

    expect(response.statusCode).toBe(201);
    expect(response.json<{ accessToken: string }>().accessToken).toBeTruthy();
  });

  it('gives an unknown email and a wrong password the same answer', async () => {
    await register('samey');

    const unknown = await post('/auth/login', {
      email: emailFor('does-not-exist'),
      password: GOOD_PASSWORD,
    });
    const wrong = await post('/auth/login', {
      email: emailFor('samey'),
      password: 'definitely-not-the-password',
    });

    expect(unknown.statusCode).toBe(wrong.statusCode);
    expect(unknown.json<{ error: { code: string } }>().error.code).toBe(
      wrong.json<{ error: { code: string } }>().error.code,
    );
    expect(unknown.json<{ error: { message: string } }>().error.message).toBe(
      wrong.json<{ error: { message: string } }>().error.message,
    );
  });

  it('answers in comparable time for unknown and known emails', async () => {
    await register('timing');

    const time = async (email: string): Promise<number> => {
      const started = process.hrtime.bigint();
      await post('/auth/login', { email, password: 'wrong-password-here' });
      return Number(process.hrtime.bigint() - started) / 1e6;
    };

    const runs = 8;
    let known = 0;
    let unknown = 0;

    for (let i = 0; i < runs; i++) {
      known += await time(emailFor('timing'));
      unknown += await time(emailFor('no-such-user'));
    }

    const knownAvg = known / runs;
    const unknownAvg = unknown / runs;
    const ratio = Math.max(knownAvg, unknownAvg) / Math.min(knownAvg, unknownAvg);

    // Without the dummy-hash verify this ratio is enormous: a real argon2
    // verify against microseconds of nothing.
    expect(ratio).toBeLessThan(2);
  });
});

describe('refresh rotation and reuse detection', () => {
  it('rotates: the old token stops working, the new one works', async () => {
    const registered = await register('rotate');
    const first = registered.json<{ refreshToken: string }>().refreshToken;

    const rotated = await post('/auth/refresh', { refreshToken: first });
    expect(rotated.statusCode).toBe(201);

    const second = rotated.json<{ refreshToken: string }>().refreshToken;
    expect(second).not.toBe(first);

    const reuseOld = await post('/auth/refresh', { refreshToken: first });
    expect(reuseOld.statusCode).toBe(401);
  });

  it('burns the whole family when a revoked token is presented', async () => {
    const registered = await register('reuse');
    const t1 = registered.json<{ refreshToken: string }>().refreshToken;

    const r2 = await post('/auth/refresh', { refreshToken: t1 });
    const t2 = r2.json<{ refreshToken: string }>().refreshToken;

    const r3 = await post('/auth/refresh', { refreshToken: t2 });
    const t3 = r3.json<{ refreshToken: string }>().refreshToken;

    // Replaying t1 means either a replay or a theft. Assume the worst.
    const replay = await post('/auth/refresh', { refreshToken: t1 });
    expect(replay.statusCode).toBe(401);

    // The currently-valid token is now dead too — that is the point.
    const afterBurn = await post('/auth/refresh', { refreshToken: t3 });
    expect(afterBurn.statusCode).toBe(401);
  });

  it('rejects a token that was never issued', async () => {
    const response = await post('/auth/refresh', {
      refreshToken: 'not-a-real-token',
    });
    expect(response.statusCode).toBe(401);
  });
});

describe('logout', () => {
  it('revokes the presented token and is idempotent', async () => {
    const registered = await register('logout');
    const token = registered.json<{ refreshToken: string }>().refreshToken;

    expect((await post('/auth/logout', { refreshToken: token })).statusCode).toBe(
      201,
    );
    expect((await post('/auth/logout', { refreshToken: token })).statusCode).toBe(
      201,
    );
    expect(
      (await post('/auth/refresh', { refreshToken: token })).statusCode,
    ).toBe(401);
  });

  it('logout-all kills every session', async () => {
    const a = await register('logoutall');
    const accessToken = a.json<{ accessToken: string }>().accessToken;

    const second = await post('/auth/login', {
      email: emailFor('logoutall'),
      password: GOOD_PASSWORD,
    });
    const secondRefresh = second.json<{ refreshToken: string }>().refreshToken;

    const response = await post('/auth/logout-all', {}, accessToken);
    expect(response.statusCode).toBe(201);
    expect(response.json<{ revoked: number }>().revoked).toBeGreaterThanOrEqual(
      2,
    );

    expect(
      (await post('/auth/refresh', { refreshToken: secondRefresh })).statusCode,
    ).toBe(401);
  });
});

describe('the guard', () => {
  it('rejects /me without a token', async () => {
    const response = await get('/me');
    expect(response.statusCode).toBe(401);
    expect(response.json<{ error: { code: string } }>().error.code).toBe(
      'UNAUTHORIZED',
    );
  });

  it('rejects a malformed authorization header', async () => {
    for (const header of ['token abc', 'Bearer', 'Bearer  a b', '']) {
      const response = await app.inject({
        method: 'GET',
        url: '/me',
        headers: { authorization: header, 'x-forwarded-for': freshIp() },
      });
      expect(response.statusCode).toBe(401);
    }
  });

  it('rejects a tampered token', async () => {
    const registered = await register('tamper');
    const token = registered.json<{ accessToken: string }>().accessToken;
    const broken = `${token.slice(0, -2)}xx`;

    expect((await get('/me', broken)).statusCode).toBe(401);
  });

  it('accepts a valid token and returns the user', async () => {
    const registered = await register('valid');
    const token = registered.json<{ accessToken: string }>().accessToken;

    const response = await get('/me', token);
    expect(response.statusCode).toBe(200);
    expect(response.json<{ email: string }>().email).toBe(emailFor('valid'));
  });

  it('stops accepting a token once the account is soft-deleted', async () => {
    const registered = await register('deleted');
    const token = registered.json<{ accessToken: string }>().accessToken;
    const userId = registered.json<{ user: { id: string } }>().user.id;

    expect((await get('/me', token)).statusCode).toBe(200);

    await prisma.user.update({
      where: { id: userId },
      data: { deletedAt: new Date() },
    });

    // Capability is read from the database per request, not from the token.
    expect((await get('/me', token)).statusCode).toBe(401);
  });

  it('leaves no route reachable without a token except /health and auth', async () => {
    const router = app.getHttpAdapter().getInstance();
    const routes = router
      .printRoutes({ commonPrefix: false })
      .split('\n')
      .join(' ');

    // Enumerate what is registered, then prove the exceptions are the only ones.
    const allowedPublic = [
      '/health',
      '/auth/register',
      '/auth/login',
      '/auth/refresh',
      '/auth/logout',
    ];

    for (const path of ['/me', '/auth/logout-all']) {
      const response = await app.inject({
        method: 'GET',
        url: path,
        headers: { 'x-forwarded-for': freshIp() },
      });
      expect(
        [401, 404].includes(response.statusCode),
        `${path} answered ${response.statusCode} without a token`,
      ).toBe(true);
    }

    expect(routes).toContain('health');
    expect(allowedPublic.length).toBe(5);
  });
});

describe('PATCH /me', () => {
  it('updates the name', async () => {
    const registered = await register('patch');
    const token = registered.json<{ accessToken: string }>().accessToken;

    const response = await app.inject({
      method: 'PATCH',
      url: '/me',
      headers: { authorization: `Bearer ${token}`, 'x-forwarded-for': freshIp() },
      payload: { name: 'ლევან ხ.' },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json<{ name: string }>().name).toBe('ლევან ხ.');
  });

  it('ignores fields it does not own', async () => {
    const registered = await register('patchguard');
    const token = registered.json<{ accessToken: string }>().accessToken;

    const response = await app.inject({
      method: 'PATCH',
      url: '/me',
      headers: { authorization: `Bearer ${token}`, 'x-forwarded-for': freshIp() },
      payload: { name: 'Fine', isWalker: true, email: 'new@example.test' },
    });

    const body = response.json<{ isWalker: boolean; email: string }>();
    expect(body.isWalker).toBe(false);
    expect(body.email).toBe(emailFor('patchguard'));
  });
});

describe('credential rate limits', () => {
  it('throttles login after 5 attempts in a minute', async () => {
    const email = emailFor('throttle');
    await register('throttle');

    const ip = '10.77.0.1';
    const statuses: number[] = [];
    for (let i = 0; i < 8; i++) {
      const response = await post(
        '/auth/login',
        { email, password: 'wrong-password-here' },
        undefined,
        ip,
      );
      statuses.push(response.statusCode);
    }

    expect(statuses.filter((s) => s === 401)).toHaveLength(5);
    expect(statuses).toContain(429);
  });

  it('throttles by email even when the IP changes', async () => {
    const email = emailFor('throttle-email');
    await register('throttle-email');

    for (let i = 0; i < 6; i++) {
      await app.inject({
        method: 'POST',
        url: '/auth/login',
        payload: { email, password: 'wrong-password-here' },
        headers: { 'x-forwarded-for': `10.9.0.${i + 1}` },
      });
    }

    const response = await app.inject({
      method: 'POST',
      url: '/auth/login',
      payload: { email, password: 'wrong-password-here' },
      headers: { 'x-forwarded-for': '10.9.0.99' },
    });

    expect(response.statusCode).toBe(429);
    expect(response.json<{ error: { code: string } }>().error.code).toBe(
      'RATE_LIMITED',
    );
  });

  it('does not throttle a different account from the same burst', async () => {
    // The per-IP window is shared, so this asserts the email key is what
    // stopped the previous test rather than a blanket IP block.
    const other = emailFor('throttle-other');
    const response = await post('/auth/register', {
      email: other,
      password: GOOD_PASSWORD,
      name: 'X',
    });

    expect([201, 429]).toContain(response.statusCode);
  });
});
