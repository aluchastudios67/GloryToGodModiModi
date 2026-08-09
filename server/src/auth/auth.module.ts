import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { AuthController } from './auth.controller';
import { AuthThrottleGuard } from './auth-throttle.guard';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { PasswordService } from './password.service';
import { TokensService } from './tokens.service';

/**
 * The guard is registered as APP_GUARD, so it applies to every route in the
 * application — including ones added later by someone who has never read this
 * file. That is the point.
 */
@Module({
  imports: [JwtModule.register({})],
  controllers: [AuthController],
  providers: [
    AuthService,
    PasswordService,
    TokensService,
    // Order matters: throttle first, so a flood of bad credentials is turned
    // away before it costs an argon2 verify each.
    { provide: APP_GUARD, useClass: AuthThrottleGuard },
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
  exports: [AuthService, TokensService, PasswordService],
})
export class AuthModule {}
