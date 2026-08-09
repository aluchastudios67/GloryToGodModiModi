import { Injectable } from '@nestjs/common';
import * as argon2 from 'argon2';
import { AppError } from '../common/http-error';
import { isCommonPassword } from './common-passwords';

/**
 * Password hashing and policy.
 *
 * argon2id with parameters at or above the OWASP floor. Not bcrypt (72-byte
 * input limit, weaker against GPUs), and emphatically not sha-anything.
 */
export const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  /** 19 MiB. Memory hardness is what makes GPU cracking expensive. */
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
} as const;

/** Long beats complex. Character-class rules make passwords worse. */
export const MIN_PASSWORD_LENGTH = 10;
/** argon2 handles long input, but unbounded input is a free CPU-burn vector. */
export const MAX_PASSWORD_LENGTH = 200;

@Injectable()
export class PasswordService {
  /**
   * A hash of a value nobody knows, used to spend the same CPU time when an
   * email does not exist. Computed once at construction.
   *
   * Without this, "no such user" returns in microseconds while a wrong password
   * takes ~50ms, and anyone can enumerate your entire user table with a
   * stopwatch.
   */
  private readonly dummyHashPromise: Promise<string>;

  constructor() {
    this.dummyHashPromise = argon2.hash(
      'a-password-nobody-will-ever-use-2f8a1c',
      ARGON2_OPTIONS,
    );
  }

  async hash(password: string): Promise<string> {
    return argon2.hash(password, ARGON2_OPTIONS);
  }

  async verify(hash: string, password: string): Promise<boolean> {
    try {
      return await argon2.verify(hash, password);
    } catch {
      // A malformed stored hash must read as "wrong password", not as a 500.
      return false;
    }
  }

  /** Burns the same time as a real verify, for users that do not exist. */
  async verifyDummy(password: string): Promise<false> {
    const dummy = await this.dummyHashPromise;
    await this.verify(dummy, password);
    return false;
  }

  /**
   * Throws on a password we refuse to accept. Length first: it is free, and it
   * already disqualifies most of the common list.
   */
  assertAcceptable(password: string): void {
    if (password.length < MIN_PASSWORD_LENGTH) {
      throw new AppError(
        'PASSWORD_TOO_SHORT',
        400,
        `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
      );
    }

    if (password.length > MAX_PASSWORD_LENGTH) {
      throw new AppError(
        'PASSWORD_TOO_LONG',
        400,
        `Password must be at most ${MAX_PASSWORD_LENGTH} characters`,
      );
    }

    if (isCommonPassword(password)) {
      throw new AppError(
        'PASSWORD_TOO_COMMON',
        400,
        'That password appears in lists of the most common passwords',
      );
    }
  }
}
