import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppError } from '../common/http-error';
import {
  Page,
  decodeCursor,
  encodeCursor,
  toPage,
} from '../common/pagination';
import { PrismaService } from '../common/prisma.service';
import { PublicWalkerDto } from './walkers.dto';
import { WalkerQuery } from './walkers.schemas';

/**
 * Exactly the columns a public walker view needs. Anything not listed here
 * cannot leak, because it is never loaded.
 */
const PUBLIC_SELECT = {
  id: true,
  name: true,
  avatarKey: true,
  walkerProfile: {
    select: {
      bio: true,
      price30Tetri: true,
      verifiedAt: true,
      isAvailableNow: true,
      ratingAvg: true,
      ratingCount: true,
      districts: true,
    },
  },
} satisfies Prisma.UserSelect;

type WalkerRow = Prisma.UserGetPayload<{ select: typeof PUBLIC_SELECT }>;

@Injectable()
export class WalkersService {
  constructor(private readonly prisma: PrismaService) {}

  async search(query: WalkerQuery): Promise<Page<PublicWalkerDto>> {
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      isWalker: true,
      walkerProfile: {
        is: {
          ...(query.availableNow ? { isAvailableNow: true } : {}),
          ...(query.maxPrice30Tetri !== undefined
            ? { price30Tetri: { lte: query.maxPrice30Tetri } }
            : {}),
          ...(query.verified ? { verifiedAt: { not: null } } : {}),
          ...(query.district ? { districts: { has: query.district } } : {}),
        },
      },
    };

    if (query.q) {
      // Georgian has no letter case, so `insensitive` is a no-op for Georgian
      // text and still correct for the Latin wordmark or a transliterated name.
      where.OR = [
        { name: { contains: query.q, mode: 'insensitive' } },
        { walkerProfile: { is: { districts: { has: query.q } } } },
      ];
    }

    // Keyset: everything strictly after the cursor in (rating desc, id asc).
    if (query.cursor) {
      const cursor = decodeCursor(query.cursor);
      where.AND = [
        {
          OR: [
            { walkerProfile: { is: { ratingAvg: { lt: cursor.ratingAvg } } } },
            {
              AND: [
                {
                  walkerProfile: { is: { ratingAvg: { equals: cursor.ratingAvg } } },
                },
                { id: { gt: cursor.id } },
              ],
            },
          ],
        },
      ];
    }

    const rows = await this.prisma.user.findMany({
      where,
      select: PUBLIC_SELECT,
      orderBy: [
        { walkerProfile: { ratingAvg: 'desc' } },
        { id: 'asc' },
      ],
      // One extra row answers "is there another page?" without a COUNT that
      // would be stale by the time it returned.
      take: query.limit + 1,
    });

    return toPage(rows.map(toPublicWalker), query.limit, (walker) =>
      encodeCursor({ ratingAvg: walker.rating.toFixed(2), id: walker.id }),
    );
  }

  async byId(id: string): Promise<PublicWalkerDto> {
    const row = await this.prisma.user.findFirst({
      where: { id, deletedAt: null, isWalker: true },
      select: PUBLIC_SELECT,
    });

    if (!row?.walkerProfile) throw AppError.notFound('Walker not found');
    return toPublicWalker(row);
  }
}

/**
 * The single place a database row becomes a public walker. Keeping it one
 * function means the PII test has one thing to guard.
 */
export function toPublicWalker(row: WalkerRow): PublicWalkerDto {
  const profile = row.walkerProfile;

  return {
    id: row.id,
    name: row.name,
    avatarUrl: toPublicUrl(row.avatarKey),
    rating: profile ? Number(profile.ratingAvg) : 0,
    reviewCount: profile?.ratingCount ?? 0,
    price30Tetri: profile?.price30Tetri ?? 0,
    verified: profile?.verifiedAt !== null && profile?.verifiedAt !== undefined,
    isAvailableNow: profile?.isAvailableNow ?? false,
    districts: profile?.districts ?? [],
    bio: profile?.bio ?? '',
    // Null until location lands. The field exists now so the client contract
    // does not change when it starts carrying a number.
    distanceKm: null,
  };
}

/**
 * Object key to public URL.
 *
 * Seeded rows hold full Unsplash URLs rather than R2 keys (see DEFERRED.md), so
 * an already-absolute value is passed through instead of being prefixed into
 * nonsense.
 */
export function toPublicUrl(key: string | null): string | null {
  if (!key) return null;
  if (key.startsWith('http://') || key.startsWith('https://')) return key;

  const base = process.env.CDN_BASE_URL;
  return base ? `${base.replace(/\/$/, '')}/${key}` : key;
}
