import { z } from 'zod';

/**
 * Everything under /me is scoped to the authenticated user. Note what these
 * schemas do **not** accept: no `ownerId`, no `userId`, no `id`. Ownership comes
 * from the session, never from the body — otherwise anyone could add a dog to
 * someone else's account.
 */

/** ISO date, and not in the future: a dog cannot be born tomorrow. */
const birthDate = z
  .string()
  .refine((value) => !Number.isNaN(Date.parse(value)), {
    message: 'must be an ISO date',
  })
  .refine((value) => new Date(value).getTime() <= Date.now(), {
    message: 'cannot be in the future',
  })
  .refine(
    (value) =>
      new Date(value).getTime() > Date.now() - 40 * 365 * 24 * 3600 * 1000,
    { message: 'is implausibly long ago' },
  );

export const createDogSchema = z.object({
  name: z.string().trim().min(1).max(40),
  breed: z.string().trim().min(1).max(60),
  birthDate,
  photoKey: z.string().trim().max(500).nullable().optional(),
  notes: z.string().trim().max(500).nullable().optional(),
  sizeKg: z.coerce.number().int().min(1).max(120).nullable().optional(),
});
export type CreateDogInput = z.infer<typeof createDogSchema>;

export const updateDogSchema = createDogSchema
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'provide at least one field to update',
  });
export type UpdateDogInput = z.infer<typeof updateDogSchema>;

export const createAddressSchema = z.object({
  label: z.string().trim().min(1).max(40),
  district: z.string().trim().min(1).max(60),
  street: z.string().trim().min(1).max(120),
  /** Encrypted at rest; see common/crypto.ts. */
  entranceCode: z.string().trim().max(40).nullable().optional(),
});
export type CreateAddressInput = z.infer<typeof createAddressSchema>;

export const walkerProfileSchema = z.object({
  bio: z.string().trim().min(1).max(600),
  price30Tetri: z.coerce.number().int().min(0).max(100_000),
  districts: z.array(z.string().trim().min(1).max(60)).min(1).max(10),
});
export type WalkerProfileInput = z.infer<typeof walkerProfileSchema>;

export const availabilitySchema = z.object({
  isAvailableNow: z.boolean(),
});
export type AvailabilityInput = z.infer<typeof availabilitySchema>;
