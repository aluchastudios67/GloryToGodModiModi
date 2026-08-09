# Deferred

Things stubbed, hardcoded or knowingly left incomplete, with the phase that
introduced them. An undocumented shortcut is a bug; a documented one is a
decision.

---

## Phase 1 — Domain model and migrations

### Seed photos are Unsplash URLs in an object-key column

`prisma/seed.ts` puts full `https://images.unsplash.com/...` URLs into
`User.avatarKey`, `Dog.photoKey` and `WalkPhoto.objectKey`, which are meant to
hold **R2 object keys**, not URLs. They are gathered in one `SEED_PHOTOS` map so
the migration is a single edit.

*Consequence for Phase 3:* the serialiser that turns a key into a CDN URL must
tolerate a value that is already a URL, or the seeded data renders as a broken
image. Better still, migrate the images to R2 first and delete the special case.

### `ENCRYPTION_KEY` lives in an environment variable, not a KMS

`Address.entranceCode` is encrypted with AES-256-GCM using a key read from the
environment. That is a real improvement over plaintext and still short of right:
anyone who can read the environment can decrypt every door code in the database.

There is also **no key versioning**. Rotating `ENCRYPTION_KEY` makes every
existing ciphertext undecryptable — there is no `keyVersion` column and no
re-encryption path. Before this holds real customer data, either move to a KMS
with envelope encryption or at minimum add a key id alongside the ciphertext so
rotation is possible.

### The mock's money was not self-consistent, so the seed had to choose

`data/mock.ts` sets booking totals by hand (₾25 for a 45-minute walk at ₾15/30
min) which do not match its own `priceFor()`. The seed treats the displayed
total as `priceTetri` — what the owner pays — with a ₾3 fee and
`payoutTetri = price - fee`. The screens therefore still show the numbers the
demo showed. **Phase 4 must compute price from `priceFor()` for real bookings**,
so seeded rows and new rows will follow slightly different arithmetic until the
seed is regenerated.

### `endsAt` must be supplied on create even though the trigger overwrites it

The column is `NOT NULL` with no default, so Prisma's generated types require a
value on `booking.create()`. The trigger replaces whatever is passed. Callers
should compute it honestly anyway; the tests assert the trigger wins. Giving it
a `@default(now())` would let callers omit it but would be a lie in the schema
if the trigger were ever dropped.

### `prisma migrate reset` was never run

Prisma requires explicit human consent for destructive commands. The Definition
of Done items that call for `migrate reset` were instead verified by creating a
throwaway `modimodi_scratch` database, applying `migrate deploy` to it from
empty, seeding twice with identical row counts, and dropping it. Equivalent in
substance, but `migrate reset` itself is unexercised.

### Extensions are created by the migration, but the seed assumes they exist

`CREATE EXTENSION IF NOT EXISTS citext / btree_gist` sits at the top of the
initial migration, so any fresh database gets them. A database where the role
lacks `CREATE EXTENSION` privileges will fail at migration time. Neon grants
this on the default role; a locked-down production role may not.

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

### `ErrorEnvelopeDto` is declared but not referenced

`src/health/health.dto.ts` defines the error envelope as a DTO so the generated
client can type failures, but no endpoint declares it yet, so it does not appear
in `components.schemas`. Attach `@ApiResponse({ type: ErrorEnvelopeDto })` to the
first real endpoints in Phase 2, or the app will have no generated type for the
one shape every failure uses.

### The rate limiter is a hook, not the plugin's `global` mode

`registerRateLimitHook()` in `src/main.ts` applies the limiter via a global
`onRequest` hook, and translates the plugin's rejection into a 429 envelope by
hand. Two Fastify/Nest interactions forced this and are worth remembering:
Nest installs its own `setNotFoundHandler` during `init()` so a second one
throws, and a rejection from the limiter inside Nest reaches the global
exception filter and becomes a 500. If either behaviour changes on upgrade,
the rate-limit tests in `test/hardening.e2e.spec.ts` are what will catch it.

### RESOLVED in Phase 1: the overlap constraint could not use a generated column

The Phase 1 brief asks for "a `tstzrange` **generated** from `scheduledFor` and
`durationMin`". PostgreSQL rejects it:

```
ERROR:  generation expression is not immutable
```

`timestamptz + interval` is **STABLE**, not IMMUTABLE — month and day arithmetic
depends on the session `TimeZone` — so it cannot back a `STORED` generated
column, and for the same reason it cannot appear in an index expression either.
`make_interval()` does not help; the addition operator is the stable part.

**Resolved as proposed.** `Booking` has a real
`endsAt timestamptz` column, written server-side in the same transaction as
`scheduledFor` and `durationMin`, and build the range from two plain timestamps:

```sql
CONSTRAINT booking_no_overlap EXCLUDE USING gist (
  "walkerId" WITH =,
  tstzrange("scheduledFor", "endsAt") WITH &&
) WHERE (status IN ('ACCEPTED','IN_PROGRESS'))
```

`tstzrange(timestamptz, timestamptz)` *is* immutable, so this is accepted. It
was exercised against the local database and behaves correctly: an overlapping
`ACCEPTED` booking for the same walker is rejected; the same slot for a
different walker is allowed; an overlapping `CANCELLED` booking is allowed (the
partial predicate works); and an adjacent booking that merely touches the
previous one is allowed, because `tstzrange` is half-open `[)`.

The cost is that `endsAt` is now derived data that the application must keep
consistent with `durationMin`. A `CHECK` tying the two together is not possible
for the same immutability reason, so a `BEFORE INSERT OR UPDATE` trigger that
recomputes `endsAt` is the safer option — the database, not the service, stays
the source of truth.

`btree_gist` and `citext` are available (both 1.8) and have been installed into
`modimodi_dev` by hand during this check. **The Phase 1 migration must create
them itself** with `CREATE EXTENSION IF NOT EXISTS`, or CI and any fresh
database will fail.

### Not yet built, and assumed by later phases

- No authentication, so **every route is currently public**. The global
  auth-by-default guard arrives in Phase 2; until then the only route is
  `/health`, which is meant to be public.
- Rate limiting is a single global 100 req/min per IP, in memory. It resets on
  restart and is per-instance, not shared. Fine at one instance; needs Redis or
  the platform's limiter before there are two.
- `TRUST_PROXY` is `false` locally and **must be set to `true` in production**,
  where Koyeb terminates TLS upstream. Left false behind a proxy, every request
  appears to come from the proxy's IP and one noisy client throttles everyone.
  Left true with no proxy, anyone can spoof `X-Forwarded-For` for a fresh quota.
  There is no safe default, which is why it has none.
- `ENCRYPTION_KEY` (Phase 1, for `Address.entranceCode`) is not in the env
  schema yet. When it lands it will be an env var, **not** a KMS-managed key —
  see the Phase 1 brief, which already flags this.
