import { Inject, Injectable } from '@nestjs/common';
import { decryptOptional, encryptOptional, parseKey } from '../common/crypto';
import { AppError } from '../common/http-error';
import { PrismaService } from '../common/prisma.service';
import { ENV, Env } from '../config/env';
import { toPublicUrl } from '../walkers/walkers.service';
import {
  AvailabilityInput,
  CreateAddressInput,
  CreateDogInput,
  UpdateDogInput,
  WalkerProfileInput,
} from './me.schemas';

export type DogView = {
  id: string;
  name: string;
  breed: string;
  birthDate: string;
  photoUrl: string | null;
  notes: string | null;
  sizeKg: number | null;
};

export type AddressView = {
  id: string;
  label: string;
  district: string;
  street: string;
  /** Decrypted, and only ever for the owner of the address. */
  entranceCode: string | null;
};

export type WalkerProfileView = {
  bio: string;
  price30Tetri: number;
  districts: string[];
  isAvailableNow: boolean;
  verified: boolean;
  rating: number;
  reviewCount: number;
};

@Injectable()
export class MeService {
  private readonly key: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(ENV) env: Env,
  ) {
    this.key = parseKey(env.ENCRYPTION_KEY);
  }

  /* ----------------------------------------------------------------- dogs */

  async listDogs(userId: string): Promise<DogView[]> {
    const dogs = await this.prisma.dog.findMany({
      where: { ownerId: userId, deletedAt: null },
      orderBy: { createdAt: 'asc' },
    });
    return dogs.map(toDogView);
  }

  async createDog(userId: string, input: CreateDogInput): Promise<DogView> {
    const dog = await this.prisma.dog.create({
      data: {
        ownerId: userId,
        name: input.name,
        breed: input.breed,
        birthDate: new Date(input.birthDate),
        photoKey: input.photoKey ?? null,
        notes: input.notes ?? null,
        sizeKg: input.sizeKg ?? null,
      },
    });
    return toDogView(dog);
  }

  /**
   * Ownership is part of the WHERE clause, not an `if` after fetching.
   * A 403 you compute after loading the row is a 403 you will eventually forget
   * to compute — and this way an unrelated id is indistinguishable from a
   * missing one, which is what you want.
   */
  async updateDog(
    userId: string,
    dogId: string,
    input: UpdateDogInput,
  ): Promise<DogView> {
    const updated = await this.prisma.dog.updateMany({
      where: { id: dogId, ownerId: userId, deletedAt: null },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.breed !== undefined ? { breed: input.breed } : {}),
        ...(input.birthDate !== undefined
          ? { birthDate: new Date(input.birthDate) }
          : {}),
        ...(input.photoKey !== undefined ? { photoKey: input.photoKey } : {}),
        ...(input.notes !== undefined ? { notes: input.notes } : {}),
        ...(input.sizeKg !== undefined ? { sizeKg: input.sizeKg } : {}),
      },
    });

    if (updated.count === 0) throw AppError.notFound('Dog not found');

    const dog = await this.prisma.dog.findUniqueOrThrow({ where: { id: dogId } });
    return toDogView(dog);
  }

  /** Soft delete: a dog with booking history must remain resolvable. */
  async deleteDog(userId: string, dogId: string): Promise<{ ok: true }> {
    const deleted = await this.prisma.dog.updateMany({
      where: { id: dogId, ownerId: userId, deletedAt: null },
      data: { deletedAt: new Date() },
    });

    if (deleted.count === 0) throw AppError.notFound('Dog not found');
    return { ok: true };
  }

  /* ------------------------------------------------------------ addresses */

  async listAddresses(userId: string): Promise<AddressView[]> {
    const addresses = await this.prisma.address.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    return addresses.map((address) => ({
      id: address.id,
      label: address.label,
      district: address.district,
      street: address.street,
      entranceCode: decryptOptional(
        {
          ciphertext: address.entranceCodeCiphertext ?? undefined,
          iv: address.entranceCodeIv ?? undefined,
          tag: address.entranceCodeTag ?? undefined,
        },
        this.key,
      ),
    }));
  }

  async createAddress(
    userId: string,
    input: CreateAddressInput,
  ): Promise<AddressView> {
    const encrypted = encryptOptional(input.entranceCode ?? null, this.key);

    const address = await this.prisma.address.create({
      data: {
        userId,
        label: input.label,
        district: input.district,
        street: input.street,
        entranceCodeCiphertext: encrypted.ciphertext,
        entranceCodeIv: encrypted.iv,
        entranceCodeTag: encrypted.tag,
      },
    });

    return {
      id: address.id,
      label: address.label,
      district: address.district,
      street: address.street,
      entranceCode: input.entranceCode ?? null,
    };
  }

  /* ------------------------------------------------------ walker profile */

  /**
   * Upsert, and the only way to become a walker: `isWalker` is set here by the
   * server rather than accepted from a registration body.
   */
  async putWalkerProfile(
    userId: string,
    input: WalkerProfileInput,
  ): Promise<WalkerProfileView> {
    const profile = await this.prisma.$transaction(async (tx) => {
      const saved = await tx.walkerProfile.upsert({
        where: { userId },
        create: {
          userId,
          bio: input.bio,
          price30Tetri: input.price30Tetri,
          districts: input.districts,
        },
        update: {
          bio: input.bio,
          price30Tetri: input.price30Tetri,
          districts: input.districts,
        },
      });

      await tx.user.update({ where: { id: userId }, data: { isWalker: true } });
      return saved;
    });

    return toWalkerProfileView(profile);
  }

  async setAvailability(
    userId: string,
    input: AvailabilityInput,
  ): Promise<WalkerProfileView> {
    const updated = await this.prisma.walkerProfile.updateMany({
      where: { userId },
      data: { isAvailableNow: input.isAvailableNow },
    });

    if (updated.count === 0) {
      throw new AppError(
        'NO_WALKER_PROFILE',
        409,
        'Create a walker profile before going available',
      );
    }

    const profile = await this.prisma.walkerProfile.findUniqueOrThrow({
      where: { userId },
    });
    return toWalkerProfileView(profile);
  }

  async getWalkerProfile(userId: string): Promise<WalkerProfileView | null> {
    const profile = await this.prisma.walkerProfile.findUnique({
      where: { userId },
    });
    return profile ? toWalkerProfileView(profile) : null;
  }
}

function toDogView(dog: {
  id: string;
  name: string;
  breed: string;
  birthDate: Date;
  photoKey: string | null;
  notes: string | null;
  sizeKg: number | null;
}): DogView {
  return {
    id: dog.id,
    name: dog.name,
    breed: dog.breed,
    // Date only: the app renders "3 წლის" from this, and a time component
    // would just be a timezone bug waiting to happen.
    birthDate: dog.birthDate.toISOString().slice(0, 10),
    photoUrl: toPublicUrl(dog.photoKey),
    notes: dog.notes,
    sizeKg: dog.sizeKg,
  };
}

function toWalkerProfileView(profile: {
  bio: string;
  price30Tetri: number;
  districts: string[];
  isAvailableNow: boolean;
  verifiedAt: Date | null;
  ratingAvg: unknown;
  ratingCount: number;
}): WalkerProfileView {
  return {
    bio: profile.bio,
    price30Tetri: profile.price30Tetri,
    districts: profile.districts,
    isAvailableNow: profile.isAvailableNow,
    verified: profile.verifiedAt !== null,
    rating: Number(profile.ratingAvg),
    reviewCount: profile.ratingCount,
  };
}
