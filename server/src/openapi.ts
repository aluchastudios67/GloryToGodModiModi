import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { FastifyAdapter } from '@nestjs/platform-fastify';
import { SwaggerModule } from '@nestjs/swagger';
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { AppModule } from './app.module';
import { loadDotEnvFile, loadEnvOrExit } from './config/env';
import { buildOpenApiConfig } from './main';

/**
 * Emits `server/openapi.json`, which the Expo app turns into TypeScript types.
 * Run in CI so a contract change that nobody regenerated fails the build rather
 * than surfacing as a runtime shape mismatch on someone's phone.
 */
async function emit(): Promise<void> {
  loadDotEnvFile();
  loadEnvOrExit();

  // No listen() — this builds the DI graph, reads the decorators and exits.
  const app = await NestFactory.create(AppModule, new FastifyAdapter(), {
    logger: false,
  });

  const document = SwaggerModule.createDocument(app, buildOpenApiConfig());
  const target = resolve(process.cwd(), 'openapi.json');

  writeFileSync(target, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
  await app.close();

  console.log(`[openapi] wrote ${target}`);
}

void emit().catch((error: unknown) => {
  console.error('[openapi] failed', error);
  process.exit(1);
});
