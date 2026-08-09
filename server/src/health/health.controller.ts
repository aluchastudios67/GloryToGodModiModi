import { Controller, Get, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { FastifyReply } from 'fastify';
import { Health, HealthService } from './health.service';

/**
 * The only unauthenticated, unrate-limited route in the application.
 * Controllers parse, delegate and serialise — no logic lives here.
 */
@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  @ApiOperation({ summary: 'Liveness and database reachability' })
  @ApiOkResponse({
    description: '200 when the database answers, 503 when it does not',
  })
  async get(
    @Res({ passthrough: true }) reply: FastifyReply,
  ): Promise<Health> {
    const result = await this.health.check();
    // 503 tells a load balancer to stop sending traffic; the body still
    // explains why, which is what a human needs at the same moment.
    void reply.status(result.db === 'up' ? 200 : 503);
    return result;
  }
}
