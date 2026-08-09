import { Body, Controller, Get, Patch, Post, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyRequest } from 'fastify';
import { ZodValidationPipe } from '../common/zod-pipe';
import { HOUR, MINUTE, Throttle } from './auth-throttle.guard';
import { AuthedUser, CurrentUser, Public } from './auth.guard';
import {
  LoginInput,
  RefreshInput,
  RegisterInput,
  UpdateMeInput,
  loginSchema,
  refreshSchema,
  registerSchema,
  updateMeSchema,
} from './auth.schemas';
import { AuthService, MeView, SessionContext } from './auth.service';
import { TokenPair } from './tokens.service';

/**
 * Controllers parse, delegate and serialise. No logic here — that is what keeps
 * the services callable from a queue worker or a different framework later.
 */
@ApiTags('auth')
@Controller()
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ max: 3, windowMs: HOUR })
  @Post('auth/register')
  @ApiOperation({ summary: 'Create an account and sign in' })
  async register(
    @Body(new ZodValidationPipe(registerSchema)) body: RegisterInput,
    @Req() request: FastifyRequest,
  ): Promise<TokenPair & { user: MeView }> {
    return this.auth.register(body, contextOf(request));
  }

  @Public()
  @Throttle({ max: 5, windowMs: MINUTE }, { max: 20, windowMs: HOUR })
  @Post('auth/login')
  @ApiOperation({ summary: 'Exchange email and password for a token pair' })
  async login(
    @Body(new ZodValidationPipe(loginSchema)) body: LoginInput,
    @Req() request: FastifyRequest,
  ): Promise<TokenPair & { user: MeView }> {
    return this.auth.login(body, contextOf(request));
  }

  @Public()
  @Throttle({ max: 30, windowMs: MINUTE })
  @Post('auth/refresh')
  @ApiOperation({ summary: 'Rotate a refresh token; the old one is revoked' })
  async refresh(
    @Body(new ZodValidationPipe(refreshSchema)) body: RefreshInput,
    @Req() request: FastifyRequest,
  ): Promise<TokenPair> {
    return this.auth.refresh(body.refreshToken, contextOf(request));
  }

  /**
   * Public because logging out must work with an expired access token — the
   * refresh token in the body is the credential being surrendered.
   */
  @Public()
  @Post('auth/logout')
  @ApiOperation({ summary: 'Revoke the presented refresh token' })
  async logout(
    @Body(new ZodValidationPipe(refreshSchema)) body: RefreshInput,
  ): Promise<{ ok: true }> {
    await this.auth.logout(body.refreshToken);
    return { ok: true };
  }

  @Post('auth/logout-all')
  @ApiOperation({ summary: 'Revoke every session for the signed-in user' })
  async logoutAll(
    @CurrentUser() user: AuthedUser,
  ): Promise<{ revoked: number }> {
    return this.auth.logoutAll(user.id);
  }

  @Get('me')
  @ApiOperation({ summary: 'The signed-in user' })
  async me(@CurrentUser() user: AuthedUser): Promise<MeView> {
    return this.auth.meView(user.id);
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update name or avatar' })
  async updateMe(
    @CurrentUser() user: AuthedUser,
    @Body(new ZodValidationPipe(updateMeSchema)) body: UpdateMeInput,
  ): Promise<MeView> {
    return this.auth.updateMe(user.id, body);
  }
}

function contextOf(request: FastifyRequest): SessionContext {
  const agent = request.headers['user-agent'];
  return {
    userAgent: typeof agent === 'string' ? agent.slice(0, 300) : undefined,
    ip: request.ip,
  };
}
