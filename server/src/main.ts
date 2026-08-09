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
    // Koyeb terminates TLS upstream; without this every client IP is the proxy,
    // which would make per-IP rate limiting meaningless.
    trustProxy: true,
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
    max: RATE_LIMIT_MAX,
    timeWindow: RATE_LIMIT_WINDOW,
    // /health is exempt: probes must never be throttled, or the platform will
    // conclude the service is dead precisely when it is busiest.
    allowList: (request) => request.url.startsWith('/health'),
    errorResponseBuilder: (request, context) =>
      toEnvelope(
        ERROR_CODES.RATE_LIMITED,
        `Too many requests. Retry in ${context.after}.`,
        requestIdOf(request),
      ),
  });

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
