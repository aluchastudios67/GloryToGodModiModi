# Deferred

Things stubbed, hardcoded or knowingly left incomplete, with the phase that
introduced them. An undocumented shortcut is a bug; a documented one is a
decision.

---

## Phase 0 — Foundation

### Local Postgres is 18, not the specified 16

`docker-compose.yml` pins `postgres:16` as the brief requires, and CI uses the
`postgres:16` service container. **Local development on this machine uses the
already-installed Homebrew PostgreSQL 18 on port 5432**, because Docker is not
installed here. The compose file publishes on **5433** so it can be adopted
later without clashing with the local install.

*Risk:* a behaviour difference between PG18 locally and PG16 in CI. Low for
Phase 0 (only `SELECT 1`), and it grows the moment Phase 1 adds `tstzrange`,
`btree_gist` and generated columns. **Before Phase 1 lands, either install
Docker or `brew install postgresql@16`** so local matches CI where the SQL
starts to matter.

### CI has never run

`.github/workflows/server.yml` is written and complete, but this repository has
no git remote, so the "CI is green on a pull request" acceptance criterion is
**not met and cannot be**. The workflow is unverified beyond review. First push
to GitHub should be treated as its first real test.

### `prisma migrate deploy` runs against an empty migrations directory

Phase 0 has no models, so there are no migrations. The CI step is wired now so
that Phase 1 does not have to touch the workflow. It is a no-op today.

### Toolchain versions held back from latest

- **Prisma 6.19.3, not 7.x.** Prisma 7 is ESM-first with a new client generator;
  adopting it would add module-format friction to a NestJS CommonJS build for no
  Phase 0 benefit. Revisit at a phase boundary, not mid-phase.
- **TypeScript 5.9, not 7.x.** `typescript-eslint` 8 does not yet target TS 7.
  The root Expo app is also on 5.9, so the repo stays consistent.
- **ESLint 9, not 10**, for the same `typescript-eslint` compatibility reason.

### `@fastify/static` is a production dependency for a development-only feature

It exists solely so `SwaggerModule.setup()` can serve the browsable docs. The
docs UI is gated to non-production, but the package still ships. Dropping the
served UI entirely would remove the dependency — `npm run openapi` does not
need it.

### Install scripts approved

`package.json` carries an `allowScripts` block for `prisma`, `@prisma/client`,
`@prisma/engines` and `@swc/core`, which need postinstall steps to fetch
binaries. `@scarf/scarf` (telemetry) and `fsevents` were deliberately **not**
approved.

### Not yet built, and assumed by later phases

- No authentication, so **every route is currently public**. The global
  auth-by-default guard arrives in Phase 2; until then the only route is
  `/health`, which is meant to be public.
- Rate limiting is a single global 100 req/min per IP, in memory. It resets on
  restart and is per-instance, not shared. Fine at one instance; needs Redis or
  the platform's limiter before there are two.
- `ENCRYPTION_KEY` (Phase 1, for `Address.entranceCode`) is not in the env
  schema yet. When it lands it will be an env var, **not** a KMS-managed key —
  see the Phase 1 brief, which already flags this.
