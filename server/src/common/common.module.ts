import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Cross-cutting providers that every feature module needs.
 *
 * Global so no feature module has to remember to import it, and so there is
 * exactly one Prisma connection pool for the process rather than one per module.
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class CommonModule {}
