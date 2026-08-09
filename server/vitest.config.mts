import swc from 'unplugin-swc';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.spec.ts', 'test/**/*.spec.ts'],
    setupFiles: ['./test/setup.ts'],
    // Fastify + Prisma boot takes a moment; the timing test needs headroom.
    testTimeout: 20_000,
    hookTimeout: 30_000,
  },
  // esbuild (vitest's default) drops emitDecoratorMetadata, which Nest's DI
  // container needs. swc keeps it.
  plugins: [swc.vite({ module: { type: 'es6' } })],
});
