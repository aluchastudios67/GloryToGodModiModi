import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

export type DbStatus = 'up' | 'down';

export type Health = {
  status: 'ok' | 'degraded';
  uptimeSec: number;
  db: DbStatus;
  version: string;
};

/** How long we wait for `SELECT 1` before calling the database down. */
export const DB_PING_TIMEOUT_MS = 2_000;

/** Injected so tests can drive the clock and the query independently. */
export type Pinger = Pick<PrismaService, '$queryRaw'>;

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Never throws. A health endpoint that can fail is not a health endpoint —
   * the orchestrator reads it to decide whether to keep you alive.
   */
  async check(): Promise<Health> {
    const db = await pingDatabase(this.prisma, this.logger);

    return {
      status: db === 'up' ? 'ok' : 'degraded',
      uptimeSec: Math.floor(process.uptime()),
      db,
      version: VERSION,
    };
  }
}

/**
 * `SELECT 1` under a hard timeout.
 *
 * The timeout is the whole point: a database that has gone away often does not
 * refuse connections, it accepts them and never answers. Without a deadline the
 * health check hangs, the platform's probe times out, and you get an opaque
 * restart loop instead of a 503.
 */
export async function pingDatabase(
  prisma: Pinger,
  logger?: Pick<Logger, 'warn'>,
  timeoutMs: number = DB_PING_TIMEOUT_MS,
): Promise<DbStatus> {
  let timer: NodeJS.Timeout | undefined;

  try {
    const query = prisma.$queryRaw`SELECT 1`;
    const timeout = new Promise<never>((_resolve, reject) => {
      timer = setTimeout(
        () => reject(new Error(`database ping exceeded ${timeoutMs}ms`)),
        timeoutMs,
      );
    });

    await Promise.race([query, timeout]);
    return 'up';
  } catch (error) {
    logger?.warn(
      { err: error instanceof Error ? error.message : String(error) },
      'Database ping failed',
    );
    return 'down';
  } finally {
    // Without this the process keeps a live timer per health check and refuses
    // to exit for up to two seconds after SIGTERM.
    if (timer) clearTimeout(timer);
  }
}

/** Injected at build time would be nicer; package.json is the pragmatic source. */
export const VERSION: string = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pkg = require('../../package.json') as { version?: unknown };
    return typeof pkg.version === 'string' ? pkg.version : '0.0.0';
  } catch {
    return '0.0.0';
  }
})();
