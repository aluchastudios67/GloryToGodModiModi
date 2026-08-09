// Loads server/.env so tests see DATABASE_URL, then points the suite at the
// throwaway test database. CI injects these directly and has no .env.
try {
  process.loadEnvFile('.env');
} catch {
  // No .env in CI — variables come from the workflow.
}

process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL ??= 'silent';
process.env.PORT ??= '3001';
process.env.CORS_ORIGINS ??= 'http://localhost:8081';

if (process.env.TEST_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
}
