import { z } from 'zod';
import { AppError } from './http-error';

/**
 * Keyset ("cursor") pagination.
 *
 * Not offset. `?skip=20` on a list that is being written to produces duplicates
 * and gaps: insert a row on page 1 and every later page shifts by one, so an
 * item you already saw reappears and one you never saw is skipped. Those become
 * bug reports nobody can reproduce.
 *
 * A keyset cursor names the last row you saw, so inserts elsewhere cannot move
 * your place.
 */

export const MAX_PAGE_SIZE = 50;
export const DEFAULT_PAGE_SIZE = 20;

export const paginationSchema = z.object({
  cursor: z.string().min(1).optional(),
  limit: z.coerce
    .number()
    .int()
    .min(1)
    .max(MAX_PAGE_SIZE)
    .optional()
    .default(DEFAULT_PAGE_SIZE),
});

export type Pagination = z.infer<typeof paginationSchema>;

export type Page<T> = {
  items: T[];
  /** Null when there is nothing after this page. */
  nextCursor: string | null;
};

/**
 * Walkers are ordered by rating descending, then id ascending as a tiebreak —
 * a total order, which keyset pagination requires. Ordering by rating alone
 * would let two walkers with 5.00 swap places between pages.
 */
export type WalkerCursor = { ratingAvg: string; id: string };

export function encodeCursor(cursor: WalkerCursor): string {
  return Buffer.from(`${cursor.ratingAvg}|${cursor.id}`, 'utf8').toString(
    'base64url',
  );
}

export function decodeCursor(raw: string): WalkerCursor {
  const decoded = Buffer.from(raw, 'base64url').toString('utf8');
  const separator = decoded.indexOf('|');

  if (separator <= 0) {
    throw AppError.badRequest('Malformed cursor');
  }

  const ratingAvg = decoded.slice(0, separator);
  const id = decoded.slice(separator + 1);

  if (!id || Number.isNaN(Number(ratingAvg))) {
    throw AppError.badRequest('Malformed cursor');
  }

  return { ratingAvg, id };
}

/**
 * Fetches one extra row to discover whether another page exists, rather than
 * running a second COUNT query that would be wrong by the time it returns.
 */
export function toPage<T>(
  rows: T[],
  limit: number,
  cursorOf: (row: T) => string,
): Page<T> {
  if (rows.length <= limit) return { items: rows, nextCursor: null };

  const items = rows.slice(0, limit);
  const last = items[items.length - 1];

  return {
    items,
    nextCursor: last === undefined ? null : cursorOf(last),
  };
}
