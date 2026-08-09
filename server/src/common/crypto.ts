import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  timingSafeEqual,
} from 'node:crypto';

/**
 * AES-256-GCM for the few fields that must not sit in the database as plain
 * text — today only `Address.entranceCode`.
 *
 * GCM is authenticated: a tampered ciphertext fails to decrypt rather than
 * quietly returning different plaintext. That matters here, because the value
 * is a door code and a silent corruption is a stranger at the wrong door.
 */

const ALGORITHM = 'aes-256-gcm';
const KEY_BYTES = 32;
/** 96 bits is the GCM-recommended nonce size. Never reuse one with a key. */
const IV_BYTES = 12;

export type Encrypted = {
  ciphertext: string;
  iv: string;
  tag: string;
};

export class CryptoKeyError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CryptoKeyError';
  }
}

/** Parses and validates the base64 key. Throws rather than truncating. */
export function parseKey(base64Key: string): Buffer {
  let key: Buffer;
  try {
    key = Buffer.from(base64Key, 'base64');
  } catch {
    throw new CryptoKeyError('ENCRYPTION_KEY is not valid base64');
  }

  if (key.length !== KEY_BYTES) {
    throw new CryptoKeyError(
      `ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes, got ${key.length}`,
    );
  }

  return key;
}

export function encrypt(plaintext: string, key: Buffer): Encrypted {
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  const ciphertext = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);

  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    tag: cipher.getAuthTag().toString('base64'),
  };
}

export function decrypt(payload: Encrypted, key: Buffer): string {
  const decipher = createDecipheriv(
    ALGORITHM,
    key,
    Buffer.from(payload.iv, 'base64'),
  );
  decipher.setAuthTag(Buffer.from(payload.tag, 'base64'));

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(payload.ciphertext, 'base64')),
    decipher.final(),
  ]);

  return plaintext.toString('utf8');
}

/**
 * Nullable convenience for the Address columns, which are all-or-nothing:
 * a half-written triple is treated as absent rather than throwing on read.
 */
export function encryptOptional(
  plaintext: string | null | undefined,
  key: Buffer,
): { ciphertext: string | null; iv: string | null; tag: string | null } {
  if (plaintext === null || plaintext === undefined || plaintext === '') {
    return { ciphertext: null, iv: null, tag: null };
  }
  const encrypted = encrypt(plaintext, key);
  return encrypted;
}

export function decryptOptional(
  payload: Partial<Encrypted> | null | undefined,
  key: Buffer,
): string | null {
  if (!payload?.ciphertext || !payload.iv || !payload.tag) return null;
  return decrypt(
    { ciphertext: payload.ciphertext, iv: payload.iv, tag: payload.tag },
    key,
  );
}

/** Generates a fresh key. Used by `npm run keygen`, never at runtime. */
export function generateKey(): string {
  return randomBytes(KEY_BYTES).toString('base64');
}

/** Constant-time compare, for anywhere a secret is checked against input. */
export function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a, 'utf8');
  const right = Buffer.from(b, 'utf8');
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
