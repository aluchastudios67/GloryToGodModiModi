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

let app: NestFastifyApplication;
let alice = '';
let bob = '';

let ipCounter = 0;
const freshIp = () => `10.55.${Math.floor(ipCounter / 250)}.${(ipCounter++ % 250) + 1}`;

const call = (
  method: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
  url: string,
  token: string,
  payload?: unknown,
) =>
  app.inject({
    method,
    url,
    headers: { authorization: `Bearer ${token}`, 'x-forwarded-for': freshIp() },
    ...(payload === undefined ? {} : { payload: payload as object }),
  });

async function signUp(label: string): Promise<string> {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: {
      email: `me_${RUN}_${label}@example.test`,
      password: 'correct-horse-battery',
      name: `me_${RUN}_${label}`,
    },
    headers: { 'x-forwarded-for': freshIp() },
  });
  return response.json<{ accessToken: string }>().accessToken;
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

  alice = await signUp('alice');
  bob = await signUp('bob');
});

afterAll(async () => {
  const users = await prisma.user.findMany({
    where: { email: { contains: `me_${RUN}_` } },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
  await prisma.dog.deleteMany({ where: { ownerId: { in: ids } } });
  await prisma.address.deleteMany({ where: { userId: { in: ids } } });
  await prisma.walkerProfile.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
  await app.close();
});

describe('dogs', () => {
  let dogId = '';

  it('starts empty', async () => {
    const response = await call('GET', '/me/dogs', alice);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual([]);
  });

  it('adds a dog and renders the birth date as a plain date', async () => {
    const response = await call('POST', '/me/dogs', alice, {
      name: 'ბობი',
      breed: 'ლაბრადორი',
      birthDate: '2023-03-14',
    });

    expect(response.statusCode).toBe(201);
    const body = response.json<{ id: string; birthDate: string; name: string }>();
    dogId = body.id;

    expect(body.name).toBe('ბობი');
    expect(body.birthDate).toBe('2023-03-14');
  });

  it('ignores an ownerId in the body — ownership comes from the session', async () => {
    const response = await call('POST', '/me/dogs', alice, {
      name: 'თოფი',
      breed: 'ჯეკ რასელი',
      birthDate: '2025-04-30',
      ownerId: 'someone-else',
      id: 'chosen-by-client',
    });

    const body = response.json<{ id: string }>();
    expect(body.id).not.toBe('chosen-by-client');

    const stored = await prisma.dog.findUniqueOrThrow({ where: { id: body.id } });
    expect(stored.ownerId).not.toBe('someone-else');
  });

  it('rejects a birth date in the future', async () => {
    const response = await call('POST', '/me/dogs', alice, {
      name: 'X',
      breed: 'Y',
      birthDate: '2099-01-01',
    });
    expect(response.statusCode).toBe(400);
  });

  it('updates a dog', async () => {
    const response = await call('PATCH', `/me/dogs/${dogId}`, alice, {
      name: 'ბობიკო',
    });
    expect(response.statusCode).toBe(200);
    expect(response.json<{ name: string }>().name).toBe('ბობიკო');
  });

  it("404s when Bob edits Alice's dog, rather than confirming it exists", async () => {
    const response = await call('PATCH', `/me/dogs/${dogId}`, bob, {
      name: 'stolen',
    });
    // 404, not 403: telling a stranger the id is real is itself a leak.
    expect(response.statusCode).toBe(404);

    const unchanged = await prisma.dog.findUniqueOrThrow({ where: { id: dogId } });
    expect(unchanged.name).toBe('ბობიკო');
  });

  it("404s when Bob deletes Alice's dog", async () => {
    const response = await call('DELETE', `/me/dogs/${dogId}`, bob);
    expect(response.statusCode).toBe(404);
  });

  it('soft-deletes: the row survives, the list does not show it', async () => {
    expect((await call('DELETE', `/me/dogs/${dogId}`, alice)).statusCode).toBe(
      200,
    );

    const list = await call('GET', '/me/dogs', alice);
    expect(list.json<{ id: string }[]>().some((d) => d.id === dogId)).toBe(false);

    const row = await prisma.dog.findUnique({ where: { id: dogId } });
    expect(row).not.toBeNull();
    expect(row?.deletedAt).not.toBeNull();
  });

  it('is idempotent-safe: deleting twice 404s rather than resurrecting', async () => {
    expect((await call('DELETE', `/me/dogs/${dogId}`, alice)).statusCode).toBe(
      404,
    );
  });
});

describe('addresses', () => {
  it('stores the door code encrypted and returns it to its owner', async () => {
    const response = await call('POST', '/me/addresses', alice, {
      label: 'სახლი',
      district: 'ვაკე',
      street: 'აბაშიძის 12',
      entranceCode: '12-45',
    });

    expect(response.statusCode).toBe(201);
    const created = response.json<{ id: string; entranceCode: string }>();
    expect(created.entranceCode).toBe('12-45');

    // The column itself must not be readable.
    const [raw] = await prisma.$queryRaw<{ code: string | null }[]>`
      SELECT "entranceCodeCiphertext" AS code FROM "Address" WHERE id = ${created.id}
    `;
    expect(raw?.code).toBeTruthy();
    expect(raw?.code).not.toContain('12-45');
  });

  it("never shows Alice's address to Bob", async () => {
    const response = await call('GET', '/me/addresses', bob);
    expect(response.statusCode).toBe(200);
    expect(response.body).not.toContain('აბაშიძის');
    expect(response.body).not.toContain('12-45');
  });

  it('accepts an address with no door code', async () => {
    const response = await call('POST', '/me/addresses', bob, {
      label: 'სახლი',
      district: 'ვერა',
      street: 'კიაჩელის 7',
    });
    expect(response.statusCode).toBe(201);
    expect(response.json<{ entranceCode: string | null }>().entranceCode).toBeNull();
  });
});

describe('walker profile', () => {
  it('is null before one exists', async () => {
    const response = await call('GET', '/me/walker-profile', alice);
    expect(response.statusCode).toBe(200);
    expect(response.json()).toBeNull();
  });

  it('refuses to go available without a profile', async () => {
    const response = await call(
      'PATCH',
      '/me/walker-profile/availability',
      alice,
      { isAvailableNow: true },
    );

    expect(response.statusCode).toBe(409);
    expect(response.json<{ error: { code: string } }>().error.code).toBe(
      'NO_WALKER_PROFILE',
    );
  });

  it('creating a profile is what makes someone a walker', async () => {
    const before = await call('GET', '/me', alice);
    expect(before.json<{ isWalker: boolean }>().isWalker).toBe(false);

    const response = await call('PUT', '/me/walker-profile', alice, {
      bio: 'სამი წელია ვასეირნებ ძაღლებს ვაკეში.',
      price30Tetri: 1500,
      districts: ['ვაკე'],
    });
    expect(response.statusCode).toBe(200);

    // The server sets isWalker — it is never accepted from a request body.
    const after = await call('GET', '/me', alice);
    expect(after.json<{ isWalker: boolean }>().isWalker).toBe(true);
  });

  it('replaces rather than duplicates on a second PUT', async () => {
    await call('PUT', '/me/walker-profile', alice, {
      bio: 'განახლებული ბიო',
      price30Tetri: 1800,
      districts: ['ვაკე', 'ვერა'],
    });

    const response = await call('GET', '/me/walker-profile', alice);
    const body = response.json<{ price30Tetri: number; districts: string[] }>();

    expect(body.price30Tetri).toBe(1800);
    expect(body.districts).toEqual(['ვაკე', 'ვერა']);

    const count = await prisma.walkerProfile.count({
      where: { user: { email: `me_${RUN}_alice@example.test` } },
    });
    expect(count).toBe(1);
  });

  it('toggles availability once a profile exists', async () => {
    const on = await call('PATCH', '/me/walker-profile/availability', alice, {
      isAvailableNow: true,
    });
    expect(on.json<{ isAvailableNow: boolean }>().isAvailableNow).toBe(true);

    const off = await call('PATCH', '/me/walker-profile/availability', alice, {
      isAvailableNow: false,
    });
    expect(off.json<{ isAvailableNow: boolean }>().isAvailableNow).toBe(false);
  });

  it('cannot set a rating — it is derived from reviews', async () => {
    await call('PUT', '/me/walker-profile', alice, {
      bio: 'ბიო',
      price30Tetri: 1500,
      districts: ['ვაკე'],
      ratingAvg: '5.00',
      ratingCount: 9999,
      verifiedAt: new Date().toISOString(),
    });

    const response = await call('GET', '/me/walker-profile', alice);
    const body = response.json<{
      rating: number;
      reviewCount: number;
      verified: boolean;
    }>();

    expect(body.reviewCount).toBe(0);
    expect(body.rating).toBe(0);
    expect(body.verified).toBe(false);
  });
});
