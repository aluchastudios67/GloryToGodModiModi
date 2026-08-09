import { PrismaClient } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import {
  decryptOptional,
  encrypt,
  encryptOptional,
  decrypt,
  generateKey,
  parseKey,
} from '../src/common/crypto';

/**
 * These run against a real Postgres. Mocking Prisma would test the mock — and
 * every rule here lives in the database, not in application code, so a mock
 * could not observe any of it.
 */
const prisma = new PrismaClient();

/** Namespaced so a failed run cannot collide with the next one. */
const RUN = randomUUID().slice(0, 8);
const id = (name: string) => `t_${RUN}_${name}`;

const OWNER = id('owner');
const WALKER_A = id('walkerA');
const WALKER_B = id('walkerB');
const DOG = id('dog');
const ADDRESS = id('address');

const AT = (iso: string) => new Date(`${iso}Z`);

/** Deliberately wrong: the trigger must overwrite whatever we pass. */
const WRONG_END = AT('2099-01-01T00:00:00');

async function makeBooking(input: {
  bookingId: string;
  walkerId: string;
  scheduledFor: Date;
  durationMin: number;
  status: 'REQUESTED' | 'ACCEPTED' | 'IN_PROGRESS' | 'CANCELLED';
}) {
  return prisma.booking.create({
    data: {
      id: input.bookingId,
      ownerId: OWNER,
      walkerId: input.walkerId,
      dogId: DOG,
      addressId: ADDRESS,
      scheduledFor: input.scheduledFor,
      endsAt: WRONG_END,
      durationMin: input.durationMin,
      status: input.status,
      priceTetri: 1500,
      serviceFeeTetri: 300,
      payoutTetri: 1200,
    },
  });
}

beforeAll(async () => {
  for (const [userId, name] of [
    [OWNER, 'Test Owner'],
    [WALKER_A, 'Test Walker A'],
    [WALKER_B, 'Test Walker B'],
  ] as const) {
    await prisma.user.create({
      data: {
        id: userId,
        email: `${userId}@example.test`,
        name,
        passwordHash: 'x',
        isOwner: true,
        isWalker: true,
      },
    });
  }

  await prisma.dog.create({
    data: {
      id: DOG,
      ownerId: OWNER,
      name: 'Test Dog',
      breed: 'ლაბრადორი',
      birthDate: new Date('2023-01-01T00:00:00Z'),
    },
  });

  await prisma.address.create({
    data: {
      id: ADDRESS,
      userId: OWNER,
      label: 'სახლი',
      district: 'ვაკე',
      street: 'აბაშიძის 12',
    },
  });
});

afterAll(async () => {
  // Ordered by dependency; the test namespace makes this safe to run bluntly.
  await prisma.review.deleteMany({ where: { authorId: OWNER } });
  await prisma.bookingEvent.deleteMany({ where: { actorUserId: OWNER } });
  await prisma.booking.deleteMany({ where: { ownerId: OWNER } });
  await prisma.address.deleteMany({ where: { userId: OWNER } });
  await prisma.dog.deleteMany({ where: { ownerId: OWNER } });
  await prisma.user.deleteMany({
    where: { id: { in: [OWNER, WALKER_A, WALKER_B] } },
  });
  await prisma.$disconnect();
});

describe('endsAt trigger', () => {
  it('overwrites whatever the caller supplies', async () => {
    const booking = await makeBooking({
      bookingId: id('trigger'),
      walkerId: WALKER_A,
      scheduledFor: AT('2027-01-10T09:00:00'),
      durationMin: 45,
      status: 'REQUESTED',
    });

    // 09:00 + 45min, not the year 2099 we passed in.
    expect(booking.endsAt.toISOString()).toBe('2027-01-10T09:45:00.000Z');
  });

  it('recomputes on update, so endsAt cannot drift from durationMin', async () => {
    const updated = await prisma.booking.update({
      where: { id: id('trigger') },
      data: { durationMin: 60 },
    });

    expect(updated.endsAt.toISOString()).toBe('2027-01-10T10:00:00.000Z');
  });
});

describe('walker overlap exclusion', () => {
  it('accepts the first booking in a slot', async () => {
    const booking = await makeBooking({
      bookingId: id('overlap1'),
      walkerId: WALKER_A,
      scheduledFor: AT('2027-02-01T10:00:00'),
      durationMin: 60,
      status: 'ACCEPTED',
    });

    expect(booking.status).toBe('ACCEPTED');
  });

  it('rejects a second overlapping ACCEPTED booking for the same walker', async () => {
    await expect(
      makeBooking({
        bookingId: id('overlap2'),
        walkerId: WALKER_A,
        scheduledFor: AT('2027-02-01T10:30:00'),
        durationMin: 30,
        status: 'ACCEPTED',
      }),
    ).rejects.toThrow(/Booking_walker_no_overlap|exclusion/i);
  });

  it('permits the same slot for a different walker', async () => {
    const booking = await makeBooking({
      bookingId: id('overlap3'),
      walkerId: WALKER_B,
      scheduledFor: AT('2027-02-01T10:30:00'),
      durationMin: 30,
      status: 'ACCEPTED',
    });

    expect(booking.walkerId).toBe(WALKER_B);
  });

  it('permits an overlapping booking that is not live', async () => {
    // CANCELLED sits outside the partial predicate, so it must not block.
    const booking = await makeBooking({
      bookingId: id('overlap4'),
      walkerId: WALKER_A,
      scheduledFor: AT('2027-02-01T10:15:00'),
      durationMin: 30,
      status: 'CANCELLED',
    });

    expect(booking.status).toBe('CANCELLED');
  });

  it('permits an adjacent booking that only touches the previous one', async () => {
    // tstzrange is half-open, so 11:00–12:00 does not overlap 10:00–11:00.
    const booking = await makeBooking({
      bookingId: id('overlap5'),
      walkerId: WALKER_A,
      scheduledFor: AT('2027-02-01T11:00:00'),
      durationMin: 60,
      status: 'ACCEPTED',
    });

    expect(booking.id).toBe(id('overlap5'));
  });

  it('blocks a REQUESTED booking only once it is accepted', async () => {
    // Two people may request the same slot; only one may hold it.
    await makeBooking({
      bookingId: id('overlap6'),
      walkerId: WALKER_A,
      scheduledFor: AT('2027-02-01T10:30:00'),
      durationMin: 30,
      status: 'REQUESTED',
    });

    await expect(
      prisma.booking.update({
        where: { id: id('overlap6') },
        data: { status: 'ACCEPTED' },
      }),
    ).rejects.toThrow(/Booking_walker_no_overlap|exclusion/i);
  });
});

describe('money constraints', () => {
  it('rejects a payout that is not price minus fee', async () => {
    await expect(
      prisma.booking.create({
        data: {
          id: id('money1'),
          ownerId: OWNER,
          walkerId: WALKER_B,
          dogId: DOG,
          addressId: ADDRESS,
          scheduledFor: AT('2027-03-01T10:00:00'),
          endsAt: WRONG_END,
          durationMin: 30,
          priceTetri: 1500,
          serviceFeeTetri: 300,
          payoutTetri: 1500, // should be 1200
        },
      }),
    ).rejects.toThrow(/Booking_payout_identity/i);
  });

  it('rejects negative money', async () => {
    await expect(
      prisma.booking.create({
        data: {
          id: id('money2'),
          ownerId: OWNER,
          walkerId: WALKER_B,
          dogId: DOG,
          addressId: ADDRESS,
          scheduledFor: AT('2027-03-02T10:00:00'),
          endsAt: WRONG_END,
          durationMin: 30,
          priceTetri: -100,
          serviceFeeTetri: 0,
          payoutTetri: -100,
        },
      }),
    ).rejects.toThrow(/Booking_money_non_negative/i);
  });

  it('rejects a duration the product does not offer', async () => {
    await expect(
      prisma.booking.create({
        data: {
          id: id('money3'),
          ownerId: OWNER,
          walkerId: WALKER_B,
          dogId: DOG,
          addressId: ADDRESS,
          scheduledFor: AT('2027-03-03T10:00:00'),
          endsAt: WRONG_END,
          durationMin: 90,
          priceTetri: 1500,
          serviceFeeTetri: 300,
          payoutTetri: 1200,
        },
      }),
    ).rejects.toThrow(/Booking_duration_allowed/i);
  });
});

describe('review star constraint', () => {
  const reviewBooking = id('reviewBooking');

  beforeAll(async () => {
    await makeBooking({
      bookingId: reviewBooking,
      walkerId: WALKER_B,
      scheduledFor: AT('2027-04-01T10:00:00'),
      durationMin: 30,
      status: 'REQUESTED',
    });
  });

  const write = (stars: number) =>
    prisma.review.create({
      data: {
        id: id(`review${stars}`),
        bookingId: reviewBooking,
        authorId: OWNER,
        subjectId: WALKER_B,
        stars,
      },
    });

  it('rejects zero stars at the database, not in a service check', async () => {
    await expect(write(0)).rejects.toThrow(/Review_stars_range/i);
  });

  it('rejects six stars', async () => {
    await expect(write(6)).rejects.toThrow(/Review_stars_range/i);
  });

  it('accepts five stars', async () => {
    const review = await write(5);
    expect(review.stars).toBe(5);
  });

  it('rejects a second review for the same booking', async () => {
    // Uniqueness is the database's job; a read-then-write check is a race.
    await expect(write(4)).rejects.toThrow();
  });
});

describe('soft-delete-aware email uniqueness', () => {
  it('rejects a duplicate email while the first account is live', async () => {
    const email = `${id('dupe')}@example.test`;

    await prisma.user.create({
      data: { id: id('dupe1'), email, name: 'A', passwordHash: 'x' },
    });

    await expect(
      prisma.user.create({
        data: { id: id('dupe2'), email, name: 'B', passwordHash: 'x' },
      }),
      // Prisma reports P2002 without naming the underlying partial index,
      // since it was created in raw SQL and is not in the schema.
    ).rejects.toThrow(/Unique constraint failed.*email/is);

    // Once soft-deleted, the address is free again.
    await prisma.user.update({
      where: { id: id('dupe1') },
      data: { deletedAt: new Date() },
    });

    const reused = await prisma.user.create({
      data: { id: id('dupe2'), email, name: 'B', passwordHash: 'x' },
    });
    expect(reused.email).toBe(email);

    await prisma.user.deleteMany({
      where: { id: { in: [id('dupe1'), id('dupe2')] } },
    });
  });

  it('treats email case-insensitively', async () => {
    const lower = `${id('case')}@example.test`;

    await prisma.user.create({
      data: { id: id('case1'), email: lower, name: 'A', passwordHash: 'x' },
    });

    await expect(
      prisma.user.create({
        data: {
          id: id('case2'),
          email: lower.toUpperCase(),
          name: 'B',
          passwordHash: 'x',
        },
      }),
    ).rejects.toThrow(/Unique constraint failed.*email/is);

    await prisma.user.deleteMany({ where: { id: id('case1') } });
  });
});

describe('entranceCode encryption', () => {
  const key = parseKey(generateKey());

  it('round-trips a door code', () => {
    const encrypted = encrypt('12-45', key);
    expect(decrypt(encrypted, key)).toBe('12-45');
  });

  it('produces a different ciphertext each time', () => {
    // A fresh IV per write, so identical codes are not obviously identical.
    const a = encrypt('12-45', key);
    const b = encrypt('12-45', key);
    expect(a.ciphertext).not.toBe(b.ciphertext);
    expect(a.iv).not.toBe(b.iv);
  });

  it('refuses to decrypt tampered ciphertext instead of returning garbage', () => {
    const encrypted = encrypt('12-45', key);
    const flipped = Buffer.from(encrypted.ciphertext, 'base64');
    flipped[0] = (flipped[0] ?? 0) ^ 0xff;

    expect(() =>
      decrypt({ ...encrypted, ciphertext: flipped.toString('base64') }, key),
    ).toThrow();
  });

  it('refuses a wrong key', () => {
    const encrypted = encrypt('12-45', key);
    expect(() => decrypt(encrypted, parseKey(generateKey()))).toThrow();
  });

  it('stores a door code unreadable, and reads it back', async () => {
    const encrypted = encryptOptional('99-77', key);

    await prisma.address.update({
      where: { id: ADDRESS },
      data: {
        entranceCodeCiphertext: encrypted.ciphertext,
        entranceCodeIv: encrypted.iv,
        entranceCodeTag: encrypted.tag,
      },
    });

    const [raw] = await prisma.$queryRaw<{ code: string | null }[]>`
      SELECT "entranceCodeCiphertext" AS code FROM "Address" WHERE id = ${ADDRESS}
    `;

    expect(raw?.code).toBeTruthy();
    expect(raw?.code).not.toContain('99-77');

    const stored = await prisma.address.findUniqueOrThrow({
      where: { id: ADDRESS },
    });
    expect(
      decryptOptional(
        {
          ciphertext: stored.entranceCodeCiphertext ?? undefined,
          iv: stored.entranceCodeIv ?? undefined,
          tag: stored.entranceCodeTag ?? undefined,
        },
        key,
      ),
    ).toBe('99-77');
  });

  it('treats a missing code as null rather than throwing', () => {
    expect(decryptOptional(null, key)).toBeNull();
    expect(decryptOptional({ ciphertext: 'x' }, key)).toBeNull();
  });

  it('rejects a key that is not 32 bytes', () => {
    expect(() => parseKey('c2hvcnQ=')).toThrow(/32 bytes/);
  });
});
