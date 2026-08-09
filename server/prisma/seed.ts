/**
 * Reproduces `data/mock.ts` in the database, verbatim.
 *
 * The demo's screens are the specification for the API, so the seed has to
 * produce exactly what those screens already show — same five walkers, same
 * six dogs, same three bookings, same three conversations, same Georgian text.
 *
 * Idempotent: every row has a stable id and is upserted, so running it twice
 * changes nothing. That matters because it runs in CI and against branches.
 *
 * Two decisions worth naming, because `data/mock.ts` is not self-consistent:
 *
 *  - The mock's `total` is treated as `priceTetri` — what the owner pays. The
 *    service fee is ₾3 (300 tetri) and `payoutTetri = price - fee`, which the
 *    database enforces. The mock's totals were hand-written and do not all
 *    match `priceFor()`; the displayed number wins, because that is what the
 *    demo showed.
 *  - The mock's `"ხვალ, 09:30"` is display text. Seeded bookings use fixed
 *    absolute instants near 2026-08-09 so the data is deterministic. Tbilisi is
 *    UTC+4, so 09:30 local is 05:30Z.
 */

import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { encryptOptional, parseKey } from '../src/common/crypto';

const prisma = new PrismaClient();

/** Every seeded account shares this password. Development only. */
const SEED_PASSWORD = 'Password123!';

/** ₾3, in tetri. Mirrors SERVICE_FEE in data/mock.ts. */
const SERVICE_FEE_TETRI = 300;

/**
 * Remote URLs, stored where an R2 object key will eventually live.
 * Flagged in DEFERRED.md — migrating these to real keys is its own task.
 */
const SEED_PHOTOS = {
  nino: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=240&q=80&auto=format&fit=crop&crop=faces',
  giorgi:
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=240&q=80&auto=format&fit=crop&crop=faces',
  ana: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=240&q=80&auto=format&fit=crop&crop=faces',
  davit:
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=240&q=80&auto=format&fit=crop&crop=faces',
  mariam:
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=240&q=80&auto=format&fit=crop&crop=faces',
  me: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?w=240&q=80&auto=format&fit=crop&crop=faces',
  bobi: 'https://images.unsplash.com/photo-1518717758536-85ae29035b6d?w=400&q=80&auto=format&fit=crop&crop=faces',
  rei: 'https://images.unsplash.com/photo-1615751072497-5f5169febe17?w=400&q=80&auto=format&fit=crop&crop=faces',
  luna: 'https://images.unsplash.com/photo-1596492784531-6e6eb5ea9993?w=400&q=80&auto=format&fit=crop&crop=faces',
  charli:
    'https://images.unsplash.com/photo-1591160690555-5debfba289f0?w=400&q=80&auto=format&fit=crop&crop=faces',
  topi: 'https://images.unsplash.com/photo-1593134257782-e89567b7718a?w=400&q=80&auto=format&fit=crop&crop=faces',
  haski:
    'https://images.unsplash.com/photo-1605568427561-40dd23c2acea?w=400&q=80&auto=format&fit=crop&crop=faces',
  report1:
    'https://images.unsplash.com/photo-1576201836106-db1758fd1c97?w=500&q=80&auto=format&fit=crop&crop=faces',
  report2:
    'https://images.unsplash.com/photo-1530281700549-e82e7bf110d6?w=500&q=80&auto=format&fit=crop&crop=faces',
  report3:
    'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?w=500&q=80&auto=format&fit=crop&crop=faces',
} as const;

/** Tbilisi is UTC+4 year round. */
const tbilisi = (iso: string): Date => new Date(`${iso}+04:00`);

type WalkerSeed = {
  id: string;
  name: string;
  email: string;
  photo: string;
  bio: string;
  price30Tetri: number;
  ratingAvg: string;
  ratingCount: number;
  district: string;
  verified: boolean;
  availableNow: boolean;
};

const WALKERS: WalkerSeed[] = [
  {
    id: 'usr_nino',
    name: 'ნინო ბ.',
    email: 'nino@modimodi.ge',
    photo: SEED_PHOTOS.nino,
    bio: 'სამი წელია ვასეირნებ ძაღლებს ვაკეში. მიყვარს გრძელი გასეირნებები ვაკის პარკში.',
    price30Tetri: 1500,
    ratingAvg: '4.90',
    ratingCount: 127,
    district: 'ვაკე',
    verified: true,
    availableNow: true,
  },
  {
    id: 'usr_giorgi',
    name: 'გიორგი მ.',
    email: 'giorgi@modimodi.ge',
    photo: SEED_PHOTOS.giorgi,
    bio: 'ვეტერინარიის სტუდენტი. დიდ ჯიშებთან მუშაობის გამოცდილება მაქვს.',
    price30Tetri: 1800,
    ratingAvg: '4.80',
    ratingCount: 94,
    district: 'საბურთალო',
    verified: true,
    availableNow: true,
  },
  {
    id: 'usr_ana',
    name: 'ანა კ.',
    email: 'ana@modimodi.ge',
    photo: SEED_PHOTOS.ana,
    bio: 'საღამოობით თავისუფალი ვარ. ყოველი სეირნობის შემდეგ ფოტოებს გიგზავნით.',
    price30Tetri: 1400,
    ratingAvg: '5.00',
    ratingCount: 41,
    district: 'ვერა',
    verified: true,
    availableNow: false,
  },
  {
    id: 'usr_davit',
    name: 'დავით ს.',
    email: 'davit@modimodi.ge',
    photo: SEED_PHOTOS.davit,
    bio: 'ვცხოვრობ მთაწმინდაზე, ყოველდღე დილით და საღამოს ვასეირნებ.',
    price30Tetri: 1600,
    ratingAvg: '4.70',
    ratingCount: 63,
    district: 'მთაწმინდა',
    verified: false,
    availableNow: true,
  },
  {
    id: 'usr_mariam',
    name: 'მარიამ თ.',
    email: 'mariam@modimodi.ge',
    photo: SEED_PHOTOS.mariam,
    bio: 'კინოლოგი ვარ. ვმუშაობ მორცხვ და შფოთიან ძაღლებთან.',
    price30Tetri: 2000,
    ratingAvg: '5.00',
    ratingCount: 38,
    district: 'საბურთალო',
    verified: true,
    availableNow: true,
  },
];

/** The person using the app: owner in one tab, walker in the other. */
const OWNER = {
  id: 'usr_levan',
  name: 'ლევან ხ.',
  email: 'levan@modimodi.ge',
  photo: SEED_PHOTOS.me,
};

/** Owners of the dogs in the walker's inbox. */
const REQUEST_OWNERS = [
  { id: 'usr_nata', name: 'ნატა ჯ.', email: 'nata@modimodi.ge' },
  { id: 'usr_levan_k', name: 'ლევან კ.', email: 'levan.k@modimodi.ge' },
  { id: 'usr_sofo', name: 'სოფო რ.', email: 'sofo@modimodi.ge' },
  { id: 'usr_irakli', name: 'ირაკლი ბ.', email: 'irakli@modimodi.ge' },
];

type DogSeed = {
  id: string;
  ownerId: string;
  name: string;
  breed: string;
  birthDate: string;
  photo: string;
};

/** Birth dates chosen so the ages render as the mock's strings on 2026-08-09. */
const DOGS: DogSeed[] = [
  { id: 'dog_bobi', ownerId: OWNER.id, name: 'ბობი', breed: 'ლაბრადორი', birthDate: '2023-03-14', photo: SEED_PHOTOS.bobi },
  { id: 'dog_rei', ownerId: 'usr_nata', name: 'რეი', breed: 'შიბა ინუ', birthDate: '2024-05-02', photo: SEED_PHOTOS.rei },
  { id: 'dog_luna', ownerId: 'usr_levan_k', name: 'ლუნა', breed: 'პუდელის მიქსი', birthDate: '2022-01-20', photo: SEED_PHOTOS.luna },
  { id: 'dog_charli', ownerId: 'usr_sofo', name: 'ჩარლი', breed: 'გოლდენ რეტრივერი', birthDate: '2021-06-11', photo: SEED_PHOTOS.charli },
  { id: 'dog_topi', ownerId: 'usr_irakli', name: 'თოფი', breed: 'ჯეკ რასელი', birthDate: '2025-04-30', photo: SEED_PHOTOS.topi },
  { id: 'dog_jeki', ownerId: OWNER.id, name: 'ჯეკი', breed: 'ჰასკი', birthDate: '2023-08-08', photo: SEED_PHOTOS.haski },
];

async function main(): Promise<void> {
  const key = parseKey(requireEnv('ENCRYPTION_KEY'));
  const passwordHash = await argon2.hash(SEED_PASSWORD, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });

  // ------------------------------------------------------------------ users
  await prisma.user.upsert({
    where: { id: OWNER.id },
    update: { name: OWNER.name, avatarKey: OWNER.photo },
    create: {
      id: OWNER.id,
      email: OWNER.email,
      name: OWNER.name,
      avatarKey: OWNER.photo,
      passwordHash,
      isOwner: true,
      isWalker: true,
    },
  });

  for (const owner of REQUEST_OWNERS) {
    await prisma.user.upsert({
      where: { id: owner.id },
      update: { name: owner.name },
      create: {
        id: owner.id,
        email: owner.email,
        name: owner.name,
        passwordHash,
        isOwner: true,
      },
    });
  }

  for (const walker of WALKERS) {
    await prisma.user.upsert({
      where: { id: walker.id },
      update: { name: walker.name, avatarKey: walker.photo },
      create: {
        id: walker.id,
        email: walker.email,
        name: walker.name,
        avatarKey: walker.photo,
        passwordHash,
        isOwner: true,
        isWalker: true,
      },
    });

    const profile = {
      bio: walker.bio,
      price30Tetri: walker.price30Tetri,
      verifiedAt: walker.verified ? tbilisi('2026-06-01T10:00:00') : null,
      isAvailableNow: walker.availableNow,
      ratingAvg: walker.ratingAvg,
      ratingCount: walker.ratingCount,
      districts: [walker.district],
    };

    await prisma.walkerProfile.upsert({
      where: { userId: walker.id },
      update: profile,
      create: { id: `wp_${walker.id}`, userId: walker.id, ...profile },
    });
  }

  // ------------------------------------------------------------------- dogs
  for (const dog of DOGS) {
    const fields = {
      name: dog.name,
      breed: dog.breed,
      birthDate: new Date(`${dog.birthDate}T00:00:00Z`),
      photoKey: dog.photo,
    };
    await prisma.dog.upsert({
      where: { id: dog.id },
      update: fields,
      create: { id: dog.id, ownerId: dog.ownerId, ...fields },
    });
  }

  // -------------------------------------------------------------- addresses
  const addresses = [
    { id: 'adr_levan', userId: OWNER.id, label: 'სახლი', district: 'ვაკე', street: 'აბაშიძის 12', code: '12-45' },
    { id: 'adr_nata', userId: 'usr_nata', label: 'სახლი', district: 'ვაკე', street: 'ჭავჭავაძის 37', code: '3390' },
    { id: 'adr_levan_k', userId: 'usr_levan_k', label: 'სახლი', district: 'ვერა', street: 'კიაჩელის 7', code: null },
    { id: 'adr_sofo', userId: 'usr_sofo', label: 'სახლი', district: 'საბურთალო', street: 'ყაზბეგის 24', code: '77B' },
    { id: 'adr_irakli', userId: 'usr_irakli', label: 'სახლი', district: 'მთაწმინდა', street: 'ბესიკის 5', code: null },
  ];

  for (const address of addresses) {
    const encrypted = encryptOptional(address.code, key);
    const fields = {
      label: address.label,
      district: address.district,
      street: address.street,
      entranceCodeCiphertext: encrypted.ciphertext,
      entranceCodeIv: encrypted.iv,
      entranceCodeTag: encrypted.tag,
    };
    await prisma.address.upsert({
      where: { id: address.id },
      update: fields,
      create: { id: address.id, userId: address.userId, ...fields },
    });
  }

  // --------------------------------------------------------------- bookings
  const bookings = [
    {
      id: 'bkg_1',
      walkerId: 'usr_nino',
      scheduledFor: tbilisi('2026-08-10T09:30:00'),
      durationMin: 45,
      priceTetri: 2500,
      status: 'ACCEPTED' as const,
    },
    {
      id: 'bkg_2',
      walkerId: 'usr_giorgi',
      scheduledFor: tbilisi('2026-08-04T18:00:00'),
      durationMin: 30,
      priceTetri: 2100,
      status: 'COMPLETED' as const,
    },
    {
      id: 'bkg_3',
      walkerId: 'usr_mariam',
      scheduledFor: tbilisi('2026-08-01T19:00:00'),
      durationMin: 60,
      priceTetri: 4300,
      status: 'COMPLETED' as const,
    },
  ];

  for (const booking of bookings) {
    const fields = {
      ownerId: OWNER.id,
      walkerId: booking.walkerId,
      dogId: 'dog_bobi',
      addressId: 'adr_levan',
      scheduledFor: booking.scheduledFor,
      // The trigger recomputes this on write; supplied because the column is
      // NOT NULL and Prisma requires a value.
      endsAt: new Date(booking.scheduledFor.getTime() + booking.durationMin * 60_000),
      durationMin: booking.durationMin,
      status: booking.status,
      priceTetri: booking.priceTetri,
      serviceFeeTetri: SERVICE_FEE_TETRI,
      payoutTetri: booking.priceTetri - SERVICE_FEE_TETRI,
      acceptedAt: booking.scheduledFor,
      completedAt:
        booking.status === 'COMPLETED'
          ? new Date(booking.scheduledFor.getTime() + booking.durationMin * 60_000)
          : null,
    };

    await prisma.booking.upsert({
      where: { id: booking.id },
      update: fields,
      create: { id: booking.id, ...fields },
    });

    // One creation event per booking, so the audit log is never empty.
    await prisma.bookingEvent.upsert({
      where: { id: `evt_${booking.id}` },
      update: {},
      create: {
        id: `evt_${booking.id}`,
        bookingId: booking.id,
        fromStatus: null,
        toStatus: booking.status,
        actorUserId: OWNER.id,
        reason: 'seed',
      },
    });
  }

  // ----------------------------------------------------------- walk photos
  const photos = [
    { id: 'wph_1', key: SEED_PHOTOS.report1 },
    { id: 'wph_2', key: SEED_PHOTOS.report2 },
    { id: 'wph_3', key: SEED_PHOTOS.report3 },
  ];
  for (const photo of photos) {
    await prisma.walkPhoto.upsert({
      where: { id: photo.id },
      update: { objectKey: photo.key },
      create: {
        id: photo.id,
        bookingId: 'bkg_2',
        objectKey: photo.key,
        takenAt: tbilisi('2026-08-04T18:20:00'),
      },
    });
  }

  // ---------------------------------------------------------- conversations
  const conversations = [
    {
      id: 'cnv_1',
      walkerId: 'usr_nino',
      bookingId: 'bkg_1',
      messages: [
        { id: 'msg_1_1', from: 'walker', body: 'გამარჯობა! ბობისთვის მოვდივარ 18:00-ზე.', at: '2026-08-09T14:20:00' },
        { id: 'msg_1_2', from: 'owner', body: 'გამარჯობა ნინო, მადლობა! სადარბაზოს კოდია 12-45.', at: '2026-08-09T14:22:00' },
        { id: 'msg_1_3', from: 'walker', body: 'მივიღე. თოკი თან წამოვიღო თუ თქვენთანაა?', at: '2026-08-09T14:25:00' },
        { id: 'msg_1_4', from: 'owner', body: 'ჩვენთანაა, კარებთან დაგხვდებათ.', at: '2026-08-09T14:26:00' },
        { id: 'msg_1_5', from: 'walker', body: 'ბობი მშვენივრად იყო, ფოტოებს გიგზავნი 🐾', at: '2026-08-09T14:32:00' },
      ],
    },
    {
      id: 'cnv_2',
      walkerId: 'usr_giorgi',
      bookingId: 'bkg_2',
      messages: [
        { id: 'msg_2_1', from: 'walker', body: 'სეირნობა დასრულდა, ბობი სახლშია.', at: '2026-08-04T18:34:00' },
        { id: 'msg_2_2', from: 'owner', body: 'მადლობა გიორგი, ხუთი ვარსკვლავი ✨', at: '2026-08-04T18:40:00' },
        { id: 'msg_2_3', from: 'walker', body: 'დიდი მადლობა შეფასებისთვის!', at: '2026-08-04T18:41:00' },
      ],
    },
    {
      id: 'cnv_3',
      walkerId: 'usr_mariam',
      bookingId: 'bkg_3',
      messages: [
        { id: 'msg_3_1', from: 'owner', body: 'გამარჯობა, კვირას თავისუფალი ხართ?', at: '2026-08-01T11:02:00' },
        { id: 'msg_3_2', from: 'walker', body: 'ხვალ დილით თავისუფალი ვარ.', at: '2026-08-01T11:15:00' },
      ],
    },
  ];

  for (const conversation of conversations) {
    const last = conversation.messages[conversation.messages.length - 1];
    if (!last) continue;

    await prisma.conversation.upsert({
      where: { id: conversation.id },
      update: { lastMessageAt: tbilisi(last.at) },
      create: {
        id: conversation.id,
        ownerId: OWNER.id,
        walkerId: conversation.walkerId,
        bookingId: conversation.bookingId,
        lastMessageAt: tbilisi(last.at),
      },
    });

    for (const message of conversation.messages) {
      const senderId =
        message.from === 'owner' ? OWNER.id : conversation.walkerId;
      await prisma.message.upsert({
        where: { id: message.id },
        update: { body: message.body },
        create: {
          id: message.id,
          conversationId: conversation.id,
          senderId,
          body: message.body,
          createdAt: tbilisi(message.at),
        },
      });
    }
  }

  // ------------------------------------------------------------------ review
  await prisma.review.upsert({
    where: { bookingId: 'bkg_2' },
    update: { stars: 5 },
    create: {
      id: 'rvw_1',
      bookingId: 'bkg_2',
      authorId: OWNER.id,
      subjectId: 'usr_giorgi',
      stars: 5,
      body: 'ბობი ბედნიერი დაბრუნდა.',
    },
  });

  await report();
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `${name} is required to seed. Copy .env.example to .env and run: npm run keygen`,
    );
  }
  return value;
}

async function report(): Promise<void> {
  const counts = {
    users: await prisma.user.count(),
    walkerProfiles: await prisma.walkerProfile.count(),
    dogs: await prisma.dog.count(),
    addresses: await prisma.address.count(),
    bookings: await prisma.booking.count(),
    bookingEvents: await prisma.bookingEvent.count(),
    conversations: await prisma.conversation.count(),
    messages: await prisma.message.count(),
    reviews: await prisma.review.count(),
    walkPhotos: await prisma.walkPhoto.count(),
  };
  console.log('[seed] row counts:', JSON.stringify(counts));
}

main()
  .catch((error: unknown) => {
    console.error('[seed] failed', error);
    process.exitCode = 1;
  })
  .finally(() => {
    void prisma.$disconnect();
  });
