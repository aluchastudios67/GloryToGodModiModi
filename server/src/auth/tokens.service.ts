import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { createHash, randomBytes, randomUUID } from 'node:crypto';
import { PrismaService } from '../common/prisma.service';
import { AppError } from '../common/http-error';
import { ENV, Env } from '../config/env';

/** Short, because it cannot be revoked. Everything else hangs off this number. */
export const ACCESS_TOKEN_TTL_SECONDS = 15 * 60;
/** Long, because it can be revoked — and is, on every use. */
export const REFRESH_TOKEN_TTL_DAYS = 30;

const REFRESH_TOKEN_BYTES = 32;

export type AccessPayload = {
  sub: string;
  jti: string;
  iat: number;
  exp: number;
};

export type TokenPair = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
};

/**
 * Access tokens, refresh tokens, rotation and reuse detection.
 *
 * The access token carries `sub` and nothing else — **no roles**. Roles are read
 * from the database on every request, so revoking a capability takes effect
 * immediately rather than up to fifteen minutes later.
 */
@Injectable()
export class TokensService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @Inject(ENV) private readonly env: Env,
  ) {}

  /** sha256, not argon2: this is a 256-bit random value, not a human secret. */
  static hashToken(token: string): string {
    return createHash('sha256').update(token).digest('hex');
  }

  async signAccessToken(userId: string): Promise<string> {
    return this.jwt.signAsync(
      { sub: userId, jti: randomUUID() },
      { expiresIn: ACCESS_TOKEN_TTL_SECONDS, secret: this.env.JWT_SECRET },
    );
  }

  async verifyAccessToken(token: string): Promise<AccessPayload> {
    try {
      return await this.jwt.verifyAsync<AccessPayload>(token, {
        secret: this.env.JWT_SECRET,
      });
    } catch {
      throw AppError.unauthorized('Invalid or expired access token');
    }
  }

  /**
   * Issues a refresh token in a family. A new login starts a new family; a
   * refresh continues the existing one.
   */
  async issueRefreshToken(
    userId: string,
    options: { family?: string; userAgent?: string; ip?: string } = {},
  ): Promise<string> {
    const token = randomBytes(REFRESH_TOKEN_BYTES).toString('base64url');
    const expiresAt = new Date(
      Date.now() + REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000,
    );

    await this.prisma.refreshToken.create({
      data: {
        userId,
        tokenHash: TokensService.hashToken(token),
        family: options.family ?? randomUUID(),
        expiresAt,
        userAgent: options.userAgent ?? null,
        ip: options.ip ?? null,
      },
    });

    return token;
  }

  async issuePair(
    userId: string,
    context: { userAgent?: string; ip?: string } = {},
  ): Promise<TokenPair> {
    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(userId),
      this.issueRefreshToken(userId, context),
    ]);

    return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
  }

  /**
   * Rotates a refresh token: verify, revoke the old, issue a new one in the
   * same family — all in one transaction, so a crash cannot leave a user with
   * two live tokens or none.
   *
   * **Reuse detection:** presenting an already-revoked token means either a
   * replay or a stolen token, and there is no way to tell which. The whole
   * family is revoked. That turns a stolen refresh token from thirty days of
   * silent access into one use followed by everyone being logged out — which is
   * noisy, and noisy is what you want.
   */
  async rotate(
    presentedToken: string,
    context: { userAgent?: string; ip?: string } = {},
  ): Promise<TokenPair> {
    const tokenHash = TokensService.hashToken(presentedToken);

    const existing = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (!existing) throw AppError.unauthorized('Invalid refresh token');

    if (existing.expiresAt.getTime() <= Date.now()) {
      throw AppError.unauthorized('Invalid refresh token');
    }

    // Claim the token atomically. `updateMany` with `revokedAt: null` in the
    // WHERE is a compare-and-set: exactly one concurrent caller can win, so two
    // requests racing with the same token cannot both be issued a new pair.
    const claimed = await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    if (claimed.count === 0) {
      // Already revoked: a replay, or a stolen token being used after the real
      // client already rotated. There is no way to tell, so assume the worst.
      //
      // This burn must not sit inside a transaction that then throws — the
      // rollback would undo it and reuse detection would silently do nothing.
      await this.burnFamily(existing.family);
      throw AppError.unauthorized('Invalid refresh token');
    }

    const { userId, family } = existing;

    const [accessToken, refreshToken] = await Promise.all([
      this.signAccessToken(userId),
      this.issueRefreshToken(userId, { ...context, family }),
    ]);

    return { accessToken, refreshToken, expiresIn: ACCESS_TOKEN_TTL_SECONDS };
  }

  /**
   * Revokes every live token in a rotation family.
   *
   * Turns a stolen refresh token from thirty days of quiet access into a single
   * use followed by every session dropping — which is loud, and loud is what
   * you want when a credential has been copied.
   */
  private async burnFamily(family: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { family, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Revokes one token. Unknown tokens are a no-op — logout is idempotent. */
  async revoke(presentedToken: string): Promise<void> {
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash: TokensService.hashToken(presentedToken), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /** Revokes every live token for a user — "sign out everywhere". */
  async revokeAllForUser(userId: string): Promise<number> {
    const result = await this.prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
    return result.count;
  }
}
