import { Module } from '@nestjs/common';
import { PrismaService } from './common/prisma.service';
import { ConfigModule } from './config/config.module';
import { HealthController } from './health/health.controller';
import { HealthService } from './health/health.service';

/**
 * Phase 0 is deliberately flat: one module, one route. Feature modules arrive
 * with the domain in later phases; splitting now would be filing empty folders.
 */
@Module({
  imports: [ConfigModule],
  controllers: [HealthController],
  providers: [PrismaService, HealthService],
  exports: [PrismaService],
})
export class AppModule {}
