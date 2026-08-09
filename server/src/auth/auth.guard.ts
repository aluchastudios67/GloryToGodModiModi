import {
  CanActivate,
  ExecutionContext,
  Injectable,
  SetMetadata,
  createParamDecorator,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { FastifyRequest } from 'fastify';
import { AppError } from '../common/http-error';
import { PrismaService } from '../common/prisma.service';
import { TokensService } from './tokens.service';

export const IS_PUBLIC_KEY = 'auth:public';

/** Marks the handful of routes that may be reached without a token. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export type AuthedUser = {
  id: string;
  isOwner: boolean;
  isWalker: boolean;
};

/** `@CurrentUser() user: AuthedUser` — populated by the guard, never by input. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthedUser => {
    const request = context.switchToHttp().getRequest<
      FastifyRequest & { user?: AuthedUser }
    >();
    if (!request.user) {
      // Only reachable if a handler is somehow outside the guard.
      throw AppError.unauthorized();
    }
    return request.user;
  },
);

/**
 * Global guard: every route is authenticated unless it opts out with
 * `@Public()`. Opt-out beats opt-in — a forgotten decorator should mean a
 * locked door, not an open one.
 *
 * Capability flags are read from the database on each request rather than from
 * the token, so a revoked capability takes effect now instead of in fifteen
 * minutes.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly tokens: TokensService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const request = context.switchToHttp().getRequest<
      FastifyRequest & { user?: AuthedUser }
    >();

    const token = bearerFrom(request.headers.authorization);
    if (!token) throw AppError.unauthorized('Missing bearer token');

    const payload = await this.tokens.verifyAccessToken(token);

    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub, deletedAt: null },
      select: { id: true, isOwner: true, isWalker: true },
    });

    // A token outliving its account is exactly the case a stateless check
    // would miss.
    if (!user) throw AppError.unauthorized('Account is no longer active');

    request.user = user;
    return true;
  }
}

export function bearerFrom(header: string | undefined): string | null {
  if (!header) return null;
  const [scheme, value, ...rest] = header.split(' ');
  if (rest.length > 0) return null;
  if (!scheme || !value) return null;
  if (scheme.toLowerCase() !== 'bearer') return null;
  const token = value.trim();
  return token.length > 0 ? token : null;
}
