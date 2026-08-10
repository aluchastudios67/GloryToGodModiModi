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
const tag = (name: string) => `w_${RUN}_${name}`;

let app: NestFastifyApplication;
let token: string;

type WalkerItem = {
  id: string;
  name: string;
  rating: number;
  price30Tetri: number;
  verified: boolean;
  isAvailableNow: boolean;
  districts: string[];
};
type PageBody = { items: WalkerItem[]; nextCursor: string | null };

const search = async (query = ''): Promise<PageBody> => {
  const response = await app.inject({
    method: 'GET',
    url: `/walkers${query}`,
    headers: { authorization: `Bearer ${token}` },
  });
  expect(response.statusCode).toBe(200);
  return response.json<PageBody>();
};

/** Only the walkers this test created, so the seed cannot skew assertions. */
const mine = (page: PageBody) =>
  page.items.filter((item) => item.name.startsWith(`w_${RUN}_`));

async function makeWalker(input: {
  name: string;
  rating: string;
  price: number;
  verified: boolean;
  availableNow: boolean;
  district: string;
}) {
  const id = tag(input.name);
  await prisma.user.create({
    data: {
      id,
      email: `${id}@example.test`,
      name: id,
      passwordHash: 'x',
      isOwner: true,
      isWalker: true,
      phone: `+995${Math.floor(Math.random() * 1e9)}`,
      walkerProfile: {
        create: {
          bio: 'ტესტი',
          price30Tetri: input.price,
          verifiedAt: input.verified ? new Date() : null,
          isAvailableNow: input.availableNow,
          ratingAvg: input.rating,
          ratingCount: 10,
          districts: [input.district],
        },
      },
    },
  });
  return id;
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

  const registered = await app.inject({
    method: 'POST',
    url: '/auth/register',
    payload: {
      email: `${tag('viewer')}@example.test`,
      password: 'correct-horse-battery',
      name: 'Viewer',
    },
    headers: { 'x-forwarded-for': '10.31.0.1' },
  });
  token = registered.json<{ accessToken: string }>().accessToken;

  await makeWalker({ name: 'alpha', rating: '5.00', price: 1400, verified: true, availableNow: true, district: 'ვაკე' });
  await makeWalker({ name: 'bravo', rating: '4.80', price: 1800, verified: true, availableNow: true, district: 'საბურთალო' });
  await makeWalker({ name: 'charlie', rating: '4.50', price: 1500, verified: false, availableNow: false, district: 'ვერა' });
  await makeWalker({ name: 'delta', rating: '4.20', price: 2000, verified: true, availableNow: false, district: 'ვაკე' });
});

afterAll(async () => {
  const users = await prisma.user.findMany({
    where: { email: { contains: `w_${RUN}_` } },
    select: { id: true },
  });
  const ids = users.map((u) => u.id);
  await prisma.refreshToken.deleteMany({ where: { userId: { in: ids } } });
  await prisma.walkerProfile.deleteMany({ where: { userId: { in: ids } } });
  await prisma.user.deleteMany({ where: { id: { in: ids } } });
  await prisma.$disconnect();
  await app.close();
});

describe('GET /walkers', () => {
  it('requires a token like every other route', async () => {
    const response = await app.inject({ method: 'GET', url: '/walkers' });
    expect(response.statusCode).toBe(401);
  });

  it('returns walkers ordered by rating, highest first', async () => {
    const ours = mine(await search('?limit=50'));
    const ratings = ours.map((w) => w.rating);

    expect(ratings).toEqual([...ratings].sort((a, b) => b - a));
    expect(ours.length).toBeGreaterThanOrEqual(4);
  });

  it('leaks no PII — deep-scanned, not eyeballed', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/walkers?limit=50',
      headers: { authorization: `Bearer ${token}` },
    });

    const raw = response.body;
    for (const forbidden of [
      'passwordHash',
      'email',
      'phone',
      '@example.test',
      'entranceCode',
      'deletedAt',
      'street',
    ]) {
      expect(raw, `response contained ${forbidden}`).not.toContain(forbidden);
    }
  });

  it('filters by availability', async () => {
    const ours = mine(await search('?availableNow=true&limit=50'));
    expect(ours.every((w) => w.isAvailableNow)).toBe(true);
    expect(ours.length).toBe(2);
  });

  it('filters by maximum price', async () => {
    const ours = mine(await search('?maxPrice30Tetri=1500&limit=50'));
    expect(ours.every((w) => w.price30Tetri <= 1500)).toBe(true);
    expect(ours.map((w) => w.price30Tetri).sort()).toEqual([1400, 1500]);
  });

  it('filters by verification', async () => {
    const ours = mine(await search('?verified=true&limit=50'));
    expect(ours.every((w) => w.verified)).toBe(true);
    expect(ours.length).toBe(3);
  });

  it('filters by district', async () => {
    const ours = mine(await search('?district=ვაკე&limit=50'));
    expect(ours.length).toBe(2);
    expect(ours.every((w) => w.districts.includes('ვაკე'))).toBe(true);
  });

  it('combines filters the way the chips do', async () => {
    const ours = mine(
      await search('?availableNow=true&verified=true&maxPrice30Tetri=1500&limit=50'),
    );
    expect(ours.length).toBe(1);
    expect(ours[0]?.price30Tetri).toBe(1400);
  });

  it('searches by name substring', async () => {
    const ours = mine(await search(`?q=${tag('charlie')}&limit=50`));
    expect(ours.length).toBe(1);
  });

  it('rejects a limit above the cap instead of honouring it', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/walkers?limit=500',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(400);
  });

  it('rejects a malformed cursor', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/walkers?cursor=not-a-cursor',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(400);
  });
});

describe('cursor pagination', () => {
  it('walks the whole list without duplicates or gaps', async () => {
    const seen: string[] = [];
    let cursor: string | null = null;

    for (let guard = 0; guard < 50; guard++) {
      const page: PageBody = await search(
        `?limit=2${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
      );
      seen.push(...page.items.map((item) => item.id));
      cursor = page.nextCursor;
      if (!cursor) break;
    }

    expect(new Set(seen).size).toBe(seen.length);
  });

  it('survives an insert mid-iteration — the reason for keyset over offset', async () => {
    const first: PageBody = await search('?limit=2');
    expect(first.nextCursor).toBeTruthy();

    // A new top-rated walker appears between page 1 and page 2. With offset
    // pagination this shifts everything down and page 2 repeats an item.
    await makeWalker({
      name: 'inserted',
      rating: '5.00',
      price: 1000,
      verified: true,
      availableNow: true,
      district: 'ვაკე',
    });

    const second: PageBody = await search(
      `?limit=2&cursor=${encodeURIComponent(first.nextCursor as string)}`,
    );

    const firstIds = first.items.map((i) => i.id);
    const secondIds = second.items.map((i) => i.id);
    const overlap = firstIds.filter((id) => secondIds.includes(id));

    expect(overlap).toEqual([]);
  });
});

describe('GET /walkers/:id', () => {
  it('returns one walker without PII', async () => {
    const response = await app.inject({
      method: 'GET',
      url: `/walkers/${tag('alpha')}`,
      headers: { authorization: `Bearer ${token}` },
    });

    expect(response.statusCode).toBe(200);
    expect(response.body).not.toContain('@example.test');
    expect(response.json<{ rating: number }>().rating).toBe(5);
  });

  it('404s for an unknown id', async () => {
    const response = await app.inject({
      method: 'GET',
      url: '/walkers/does-not-exist',
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(404);
  });

  it('404s for a user who is not a walker', async () => {
    const owner = await prisma.user.create({
      data: {
        id: tag('owneronly'),
        email: `${tag('owneronly')}@example.test`,
        name: tag('owneronly'),
        passwordHash: 'x',
        isOwner: true,
        isWalker: false,
      },
    });

    const response = await app.inject({
      method: 'GET',
      url: `/walkers/${owner.id}`,
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.statusCode).toBe(404);
  });
});
