import { Module } from '@nestjs/common';
import { AuthModule } from './auth/auth.module';
import { CommonModule } from './common/common.module';
import { ConfigModule } from './config/config.module';
import { HealthController } from './health/health.controller';
import { HealthService } from './health/health.service';
import { MeModule } from './me/me.module';
import { WalkersModule } from './walkers/walkers.module';

/**
 * Phase 0 was one module and one route. Feature modules arrive with the domain:
 * ConfigModule and CommonModule are global, so nothing below has to import them.
 */
@Module({
  imports: [ConfigModule, CommonModule, AuthModule, WalkersModule, MeModule],
  controllers: [HealthController],
  providers: [HealthService],
})
export class AppModule {}
