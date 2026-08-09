import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AppError } from '../common/http-error';
import { PrismaService } from '../common/prisma.service';
import { LoginInput, RegisterInput, UpdateMeInput } from './auth.schemas';
import { PasswordService } from './password.service';
import { TokenPair, TokensService } from './tokens.service';

export type SessionContext = { userAgent?: string; ip?: string };

/** What the app is told about the signed-in person. Never another user's row. */
export type MeView = {
  id: string;
  email: string;
  name: string;
  avatarKey: string | null;
  isOwner: boolean;
  isWalker: boolean;
  hasWalkerProfile: boolean;
  createdAt: Date;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly passwords: PasswordService,
    private readonly tokens: TokensService,
  ) {}

  async register(
    input: RegisterInput,
    context: SessionContext,
  ): Promise<TokenPair & { user: MeView }> {
    this.passwords.assertAcceptable(input.password);

    const passwordHash = await this.passwords.hash(input.password);

    let user;
    try {
      user = await this.prisma.user.create({
        data: {
          email: input.email,
          name: input.name,
          passwordHash,
          isOwner: input.isOwner,
          isWalker: input.isWalker,
        },
      });
    } catch (error) {
      // Uniqueness is enforced by a partial index the database owns; catching
      // the violation is correct, whereas checking first would be a race.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === 'P2002'
      ) {
        throw new AppError(
          'EMAIL_TAKEN',
          409,
          'An account with that email already exists',
        );
      }
      throw error;
    }

    const pair = await this.tokens.issuePair(user.id, context);
    return { ...pair, user: await this.meView(user.id) };
  }

  /**
   * Login is deliberately uniform: same code, same message, same status and —
   * the part people forget — the same amount of work, whether or not the email
   * exists. Timing is a side channel, and an unauthenticated one.
   */
  async login(
    input: LoginInput,
    context: SessionContext,
  ): Promise<TokenPair & { user: MeView }> {
    const user = await this.prisma.user.findFirst({
      where: { email: input.email, deletedAt: null },
    });

    const ok = user
      ? await this.passwords.verify(user.passwordHash, input.password)
      : await this.passwords.verifyDummy(input.password);

    if (!user || !ok) {
      throw new AppError(
        'INVALID_CREDENTIALS',
        401,
        'Email or password is incorrect',
      );
    }

    const pair = await this.tokens.issuePair(user.id, context);
    return { ...pair, user: await this.meView(user.id) };
  }

  async refresh(token: string, context: SessionContext): Promise<TokenPair> {
    return this.tokens.rotate(token, context);
  }

  async logout(token: string): Promise<void> {
    await this.tokens.revoke(token);
  }

  async logoutAll(userId: string): Promise<{ revoked: number }> {
    return { revoked: await this.tokens.revokeAllForUser(userId) };
  }

  async updateMe(userId: string, input: UpdateMeInput): Promise<MeView> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.avatarKey !== undefined ? { avatarKey: input.avatarKey } : {}),
      },
    });
    return this.meView(userId);
  }

  /**
   * Built field by field rather than by spreading the Prisma model. Spreading is
   * how `passwordHash` ends up in a response, and it only has to happen once.
   */
  async meView(userId: string): Promise<MeView> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        avatarKey: true,
        isOwner: true,
        isWalker: true,
        createdAt: true,
        walkerProfile: { select: { id: true } },
      },
    });

    if (!user) throw AppError.unauthorized('Account is no longer active');

    return {
      id: user.id,
      email: user.email,
      name: user.name,
      avatarKey: user.avatarKey,
      isOwner: user.isOwner,
      isWalker: user.isWalker,
      hasWalkerProfile: user.walkerProfile !== null,
      createdAt: user.createdAt,
    };
  }
}
