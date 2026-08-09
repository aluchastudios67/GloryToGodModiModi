import 'reflect-metadata';

import fastifyCors from '@fastify/cors';
import fastifyHelmet from '@fastify/helmet';
import fastifyRateLimit from '@fastify/rate-limit';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/error.filter';
import { ERROR_CODES, toEnvelope } from './common/http-error';
import { buildLoggerOptions } from './common/logger';
import { genReqId, requestIdOf } from './common/request-id';
import { loadDotEnvFile, loadEnvOrExit } from './config/env';

/** Global floor. Per-route limits tighten this in later phases. */
const RATE_LIMIT_MAX = 100;
const RATE_LIMIT_WINDOW = '1 minute';

export async function bootstrap(): Promise<NestFastifyApplication> {
  loadDotEnvFile();
  const env = loadEnvOrExit();

  const adapter = new FastifyAdapter({
    genReqId,
    logger: buildLoggerOptions(env),
    // Only when a proxy you control terminates TLS in front of this process.
    // Trusting X-Forwarded-For from anyone hands the rate limiter's identity
    // key to the caller — rotate the header, get a fresh quota.
    trustProxy: env.TRUST_PROXY,
  });

  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    adapter,
    { bufferLogs: true },
  );

  await app.register(fastifyHelmet);

  await app.register(fastifyCors, {
    origin: env.CORS_ORIGINS,
    credentials: true,
  });

  await app.register(fastifyRateLimit, {
    // Off by default, then applied by the hook below. In `global` mode the
    // plugin only guards *registered* routes, which left unmatched paths
    // unlimited — 150 requests to /nope produced zero 429s.
    global: false,
    max: RATE_LIMIT_MAX,
    timeWindow: RATE_LIMIT_WINDOW,
    errorResponseBuilder: (request, context) =>
      toEnvelope(
        ERROR_CODES.RATE_LIMITED,
        `Too many requests. Retry in ${context.after}.`,
        requestIdOf(request),
      ),
  });

  registerRateLimitHook(app);

  app.useGlobalFilters(new AllExceptionsFilter());
  app.enableShutdownHooks();

  // Served only outside production: the browsable UI is a development
  // convenience, and publishing a full API surface map is a free gift to
  // anyone probing you. `npm run openapi` still emits the spec everywhere.
  if (env.NODE_ENV !== 'production') {
    const document = SwaggerModule.createDocument(app, buildOpenApiConfig());
    SwaggerModule.setup('docs', app, document);
  }

  await app.listen({ port: env.PORT, host: '0.0.0.0' });

  const logger = new Logger('bootstrap');
  logger.log(
    `ModiModi API listening on :${env.PORT} (env=${env.NODE_ENV}, origins=${env.CORS_ORIGINS.length})`,
  );

  return app;
}

/**
 * Applies the limiter to every request, matched route or not, exempting
 * /health.
 *
 * A hook rather than the plugin's `global` mode, because that only covers
 * registered routes; and not `setNotFoundHandler`, because Nest installs its
 * own during `init()` and Fastify refuses a second one.
 */
export function registerRateLimitHook(app: NestFastifyApplication): void {
  const fastify = app.getHttpAdapter().getInstance();
  const limiter = fastify.rateLimit();

  // Async hook, not callback style: `fastify.rateLimit()` returns a promise and
  // ignores a `done` argument, so the callback form leaves the hook unresolved
  // and every request hangs.
  fastify.addHook('onRequest', async (request, reply) => {
    // Probes must never be throttled, or the platform concludes the service is
    // dead precisely when it is busiest.
    if (isHealthPath(request.url)) return;

    try {
      // `.call` supplies the Fastify `this` the hook is typed against.
      await limiter.call(fastify, request, reply);
    } catch (error) {
      // The plugin reports a breach by rejecting, expecting Fastify's own error
      // path. Inside Nest that reaches the global filter and becomes a 500, so
      // the 429 is written here instead.
      if (!reply.sent) {
        void reply
          .status(429)
          .send(
            toEnvelope(
              ERROR_CODES.RATE_LIMITED,
              errorMessage(error) ?? 'Too many requests.',
              requestIdOf(request),
            ),
          );
      }
      return reply; // halts the lifecycle
    }
  });
}

function errorMessage(error: unknown): string | undefined {
  if (error instanceof Error && error.message.length > 0) return error.message;
  return undefined;
}

/**
 * Exact-path match, ignoring any query string. A `startsWith('/health')` test
 * would also exempt /healthXYZ, handing an unlimited endpoint to anyone who
 * guesses the prefix.
 */
export function isHealthPath(url: string): boolean {
  const path = url.split('?')[0] ?? url;
  return path === '/health' || path === '/health/';
}

export function buildOpenApiConfig() {
  return new DocumentBuilder()
    .setTitle('ModiModi API')
    .setDescription(
      'Two-sided dog-walking marketplace. Errors always use the envelope ' +
        '{ error: { code, message, requestId } }.',
    )
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
}

// `require.main === module` keeps the file importable from tests and the
// OpenAPI emitter without starting a server as a side effect.
if (require.main === module) {
  void bootstrap().catch((error: unknown) => {
    console.error('[bootstrap] failed to start', error);
    process.exit(1);
  });
}
