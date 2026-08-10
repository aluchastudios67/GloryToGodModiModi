import { z } from 'zod';
import { paginationSchema } from '../common/pagination';

/**
 * Mirrors the filter chips in `app/(tabs)/search.tsx` one for one.
 *
 * `lat`, `lng` and `radiusKm` are accepted and deliberately ignored: the
 * contract is fixed now so the client does not change when location lands,
 * per ADR-006. Results are ordered by rating instead.
 */
export const walkerQuerySchema = paginationSchema.extend({
  availableNow: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  maxPrice30Tetri: z.coerce.number().int().min(0).max(1_000_000).optional(),
  district: z.string().trim().min(1).max(60).optional(),
  verified: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional(),
  q: z.string().trim().min(1).max(80).optional(),

  // Accepted, unused. Present so the shape is stable.
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  radiusKm: z.coerce.number().min(0).max(200).optional(),
});

export type WalkerQuery = z.infer<typeof walkerQuerySchema>;
