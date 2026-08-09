import { z } from 'zod';
import { MAX_PASSWORD_LENGTH } from './password.service';

/**
 * Boundary schemas. Everything the client sends is parsed here and typed on the
 * way out; nothing downstream re-validates.
 *
 * Note what is absent: no `role`, no `isWalker` on login, no user id anywhere.
 * Identity is derived from the session, never asserted by the caller.
 */

const email = z
  .string()
  .trim()
  .toLowerCase()
  .min(3)
  .max(254)
  .refine((value) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value), {
    message: 'must be a valid email address',
  });

/**
 * Only bounded here — the real policy (length, common-password list) lives in
 * PasswordService so the rules sit in one place and are testable on their own.
 */
const password = z.string().min(1).max(MAX_PASSWORD_LENGTH);

export const registerSchema = z.object({
  email,
  password,
  name: z.string().trim().min(1).max(80),
  /** Which side of the marketplace they are signing up for. */
  isOwner: z.boolean().optional().default(true),
  isWalker: z.boolean().optional().default(false),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({ email, password });
export type LoginInput = z.infer<typeof loginSchema>;

export const refreshSchema = z.object({ refreshToken: z.string().min(1) });
export type RefreshInput = z.infer<typeof refreshSchema>;

export const updateMeSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    avatarKey: z.string().trim().max(500).nullable().optional(),
  })
  .refine((value) => Object.keys(value).length > 0, {
    message: 'provide at least one field to update',
  });
export type UpdateMeInput = z.infer<typeof updateMeSchema>;
