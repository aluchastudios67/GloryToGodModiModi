# Deferred

Things stubbed, hardcoded or knowingly left incomplete, with the phase that
introduced them. An undocumented shortcut is a bug; a documented one is a
decision.

---

## Phase 3 — Profiles, dogs, walker search (partial)

### Only walker search is built

`GET /walkers` and `GET /walkers/:id` are done and tested. **Still outstanding
from the phase brief:** `GET/POST/PATCH/DELETE /me/dogs`, `GET/POST
/me/addresses`, `PUT /me/walker-profile`,
`PATCH /me/walker-profile/availability`, `POST /uploads/presign`, and the whole
app side — `openapi-typescript` codegen, TanStack Query hooks, and replacing the
`walkers` / `myDogs` / `currentLocation` imports in `index.tsx`, `search.tsx`
and `profile.tsx`.

### The "1 კმ-ში" filter chip cannot be honoured yet

Per ADR-006 the search endpoint accepts `lat`, `lng` and `radiusKm` and ignores
them, ordering by rating instead. `PublicWalkerDto.distanceKm` is therefore
**always null**, and the distance filter in `app/(tabs)/search.tsx` has nothing
to filter on.

*Assumption made, flagged rather than silently chosen:* the phase's acceptance
criterion "every filter combination matches what the mock filter produced"
cannot hold for that one chip, because the mock had hardcoded distances and the
database has no coordinates. Every other chip — availability, price, verified,
district, text search — matches exactly, verified against the seeded data. When
the chip is wired to the API it should either be hidden or mapped to a district
until location lands.

### `CDN_BASE_URL` is read from `process.env`, not the Zod-parsed config

`toPublicUrl()` in `walkers.service.ts` reads it directly, so it is neither
required nor validated at boot — the one place in the server that breaks the
"parse, don't validate" rule. It is optional today because seeded photos are
absolute URLs. When R2 lands it should move into `env.ts` and become required.

---

## Phase 2 — Authentication (server side)

### The app side is built, but only verified in a browser

Login, registration, secure token storage, the single-flight refresh queue and
auth gating are all in place, and the whole loop was exercised against the
running API: sign in, reload and stay signed in, `/me` renders the real user,
sign out returns to the login screen.

**That verification was in Chrome, not on a phone.** The Definition of Done asks
for a real device, which needs `extra.apiUrl` pointed at this machine's LAN
address instead of `localhost` — a phone's `localhost` is the phone. Until
someone runs it on hardware, the keychain path (`expo-secure-store`) is
unexercised: the browser run used the localStorage fallback.

### Tokens fall back to localStorage on web

`src/api/token-storage.ts` uses `expo-secure-store` on iOS and Android and
`localStorage` in a browser, because there is no secure store on the web. Web is
a layout-checking target here, not a shipping one. If it ever ships, this is the
line to revisit — localStorage is readable by any script on the origin.

### The common-password list is 10,000 entries, not the 1,000 the brief asked for

Measured against SecLists' frequency-ordered list: **zero of the top 1,000
passwords are 10 characters or longer**, so a top-1,000 check can never fire
behind a 10-character minimum. It would have been a check that looks like
security and is not.

Widened to the top 10,000, which contains 51 passwords that survive the length
rule — "1234567890" (rank 1159) and "qwertyuiop" (rank 2101) among them. Cost is
~120 KB of source and a `Set` built once at startup.

### Credential rate limiting is in-process and per-instance

`AuthThrottleGuard` keeps fixed-window counters in a `Map`. It enforces the
brief's limits (login 5/min and 20/hour, register 3/hour, refresh 30/min) per IP
**and** per email, but the counters reset on deploy and are not shared between
instances — two instances mean double every limit. Redis or the platform's
limiter before there is more than one process.

`TRUST_PROXY` matters here as much as for the global limiter: with it wrongly
false behind a proxy, every caller shares one IP bucket and one attacker locks
out everybody.

### Access tokens cannot be revoked before they expire

By design: they are stateless and live 15 minutes. `logout` and `logout-all`
revoke *refresh* tokens, so a stolen access token stays valid for up to fifteen
minutes after a logout. The mitigation already in place is that capability flags
are read from the database per request, so a disabled account stops working
immediately even though its token still verifies. A deny-list keyed on `jti`
would close the rest, at the cost of a database read per request.

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
