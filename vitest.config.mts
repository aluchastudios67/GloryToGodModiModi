import { defineConfig } from 'vitest/config';

/**
 * Only covers plain-TypeScript modules under src/api — the pieces with real
 * logic and no React Native imports. Rendering tests would need a native
 * preset and are not what this suite is for.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
