import { ApiProperty } from '@nestjs/swagger';

/**
 * The serialised shape of GET /health.
 *
 * This class exists purely so the OpenAPI document carries a real schema.
 * `openapi.json` feeds `openapi-typescript` in Phase 3 — an endpoint with no
 * documented response generates an empty type, and the CI drift check passes
 * happily while the app gets nothing useful. Every endpoint from here on needs
 * a DTO like this one.
 */
export class HealthDto {
  @ApiProperty({
    enum: ['ok', 'degraded'],
    description: '`degraded` whenever the database is unreachable.',
  })
  status!: 'ok' | 'degraded';

  @ApiProperty({ example: 421, description: 'Process uptime in whole seconds.' })
  uptimeSec!: number;

  @ApiProperty({
    enum: ['up', 'down'],
    description: 'Result of `SELECT 1` under a 2 second timeout.',
  })
  db!: 'up' | 'down';

  @ApiProperty({ example: '0.1.0', description: 'Server package version.' })
  version!: string;
}

/**
 * The error envelope, documented once and referenced everywhere. The app
 * switches on `code`; `message` is for developers and is always English.
 */
export class ErrorBodyDto {
  @ApiProperty({ example: 'NOT_FOUND' })
  code!: string;

  @ApiProperty({ example: 'Cannot GET /nope' })
  message!: string;

  @ApiProperty({ example: '3f1b2c9e-6d21-4a55-9a0c-1f2e3d4c5b6a' })
  requestId!: string;
}

export class ErrorEnvelopeDto {
  @ApiProperty({ type: ErrorBodyDto })
  error!: ErrorBodyDto;
}
