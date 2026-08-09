# Build prompt — ModiModi backend + app integration

**How to use this file.** Paste the *Standing brief* into a fresh Claude Opus 5
session once. Then paste **one phase at a time**, in order. Do not paste two
phases together, and do not start a phase until the previous phase's
Definition of Done is actually green. If you skip ahead, the model will
invent contracts to fill the gap and you will be refactoring instead of
building.

At the end of each phase, run the *Phase review* prompt at the bottom of this
file before moving on.

---

# STANDING BRIEF

You are the sole engineer on ModiModi, a two-sided dog-walking marketplace for
Tbilisi, Georgia. The mobile app already exists and looks finished; it is
backed entirely by mock data. Your job is to build the real backend and wire
the app to it, in strictly ordered phases.

## Repository

Root is an Expo SDK 54 app. Read these before writing any code, and treat them
as the specification of what the API must serve:

- `README.md` — states what is mock vs. real, and why certain choices were made
- `data/mock.ts` — the domain model in draft form, and the seed data
- `store/useAppStore.ts` — every mutation the product currently supports
- `app/(tabs)/*.tsx`, `app/booking/[walkerId].tsx`, `app/walk/[id].tsx`,
  `app/thread/[id].tsx` — every query the API must answer
- `docs/ARCHITECTURE.md` — the decisions you are implementing. Do not relitigate
  them. If you believe one is wrong, say so in one paragraph and continue as
  specified unless told otherwise.

The backend lives in a new top-level `server/` directory with its own
`package.json`. **You may not add dependencies to the root `package.json`
except where a phase explicitly instructs it.** Root `.npmrc` sets
`legacy-peer-deps=true` for Expo's dependency graph; `server/` must not inherit
that — give it its own `.npmrc` with `legacy-peer-deps=false`.

## Stack (fixed)

Node 22 · NestJS with the **Fastify** adapter · Prisma · PostgreSQL 16 ·
Zod for all boundary validation · pino for logging · Vitest for tests ·
argon2id for password hashing.

Do **not** install: TypeORM, Passport's full suite, GraphQL, Express,
class-validator, Lodash, Moment.

## Rules that apply to every phase

1. **The client is hostile.** Never trust a price, a role, a user id, a
   timestamp or a status from the request body. Every one of those is derived
   server-side from the authenticated session and the database.
2. **Money is `Int`, in tetri.** 1 GEL = 100 tetri. No floats anywhere in the
   money path, including in tests. The app formats `₾` at the display layer only.
3. **Parse, don't validate.** Every inbound body, query and env var goes
   through a Zod schema and comes out typed. `any` is banned outside `.d.ts`
   shims. `as` casts require a one-line comment justifying them.
4. **`strict: true` and `noUncheckedIndexedAccess: true`** in
   `server/tsconfig.json`. The build fails on a type error; there is no
   `// @ts-expect-error` without an issue link in the comment.
5. **Errors have one shape**, everywhere:
   ```json
   { "error": { "code": "BOOKING_ALREADY_ACCEPTED", "message": "...", "requestId": "..." } }
   ```
   `code` is a stable SCREAMING_SNAKE string the app switches on. `message` is
   English, for developers. **User-facing Georgian text lives in the app, never
   in an API response.** The app maps `code` → Georgian string.
6. **Every mutating endpoint that could be retried is idempotent**, keyed on an
   `Idempotency-Key` header. Booking creation and booking acceptance are the
   two that matter most.
7. **No business logic in controllers.** Controllers parse, call a service,
   serialise. Services contain the domain logic and take no framework types as
   arguments. This is what makes the framework swappable later.
8. **Tests are part of the phase, not a follow-up.** A phase is not done
   without them. Prefer few, real tests against a real Postgres over many
   mocked ones. Mocking Prisma tests nothing.
9. **Write down what you skipped.** End every phase with a `DEFERRED.md` entry
   listing anything you stubbed, hardcoded or knowingly left insecure. An
   undocumented shortcut is a bug; a documented one is a decision.
10. **Ask before inventing.** If a requirement is ambiguous, state the
    ambiguity and your assumption at the top of your response, then proceed.
    Do not silently pick.

## Out of scope for all phases below

Payments, live GPS tracking, push notifications, admin dashboard, i18n of the
API. The seams for payments and location are specified in Phase 1 and must be
built; the features are not.

---

# PHASE 0 — Foundation

**Goal:** an empty but production-shaped server that boots, connects to
Postgres, logs properly, and proves the whole toolchain works. No product
features.

## Build

```
server/
├── .npmrc                      legacy-peer-deps=false
├── .env.example                every var, documented, no real secrets
├── docker-compose.yml          postgres:16 on 5433, named volume
├── package.json
├── tsconfig.json               strict + noUncheckedIndexedAccess
├── vitest.config.ts
├── prisma/schema.prisma        datasource + generator only, no models yet
└── src/
    ├── main.ts                 Fastify adapter, graceful shutdown on SIGTERM
    ├── app.module.ts
    ├── config/
    │   ├── env.ts              Zod schema; process exits on invalid env
    │   └── config.module.ts
    ├── common/
    │   ├── prisma.service.ts   onModuleInit connect, onModuleDestroy disconnect
    │   ├── http-error.ts       AppError class carrying { code, status, message }
    │   ├── error.filter.ts     catches everything → the one error envelope
    │   ├── request-id.ts       reads x-request-id or generates a uuid
    │   ├── logger.ts           pino; redacts authorization, password, token
    │   └── zod-pipe.ts         the single validation pipe
    └── health/
        ├── health.controller.ts
        └── health.service.ts
```

Specifics:

- `GET /health` → `{ status, uptimeSec, db: "up" | "down", version }`. It runs
  `SELECT 1` with a **2-second timeout** and returns 503 if the database is
  down. It must not throw.
- `GET /health` is the only unauthenticated, unrate-limited route in the app.
- Env vars: `DATABASE_URL`, `PORT`, `NODE_ENV`, `LOG_LEVEL`,
  `CORS_ORIGINS` (comma-separated). Parse with Zod at boot; **crash loudly on a
  missing var rather than defaulting**. A server that silently starts with the
  wrong config is worse than one that will not start.
- pino logs JSON in production, pretty in development. Every log line carries
  `requestId`. Redact `authorization`, `password`, `refreshToken`, `token`.
- Fastify plugins: `@fastify/helmet`, `@fastify/cors` (origins from env only —
  never `*`), `@fastify/rate-limit` (global 100 req/min per IP as a floor;
  per-route limits come later).
- OpenAPI: `@nestjs/swagger` wired up so `npm run openapi` writes
  `server/openapi.json`. It will be nearly empty now. Prove the pipeline works
  now, when it is cheap.
- GitHub Actions workflow `.github/workflows/server.yml`: postgres service
  container → `npm ci` → `prisma migrate deploy` → `typecheck` → `lint` →
  `test`. Must run on every push touching `server/**`.

## Definition of Done

- [ ] `docker compose up -d && npm run dev` boots and logs a single structured
      startup line.
- [ ] `curl localhost:PORT/health` → 200 with `db: "up"`.
- [ ] Stop Postgres → `/health` returns **503 within 3 seconds**, does not hang,
      does not crash the process.
- [ ] Deleting `DATABASE_URL` from `.env` makes the process exit non-zero with a
      readable message naming the variable.
- [ ] `npm run typecheck`, `npm run lint`, `npm run test` all pass.
- [ ] CI is green on a pull request.
- [ ] `server/openapi.json` is generated and committed.

**Do not proceed until every box is ticked.** Everything after this assumes the
error envelope, the request id and the config loader exist and work.

---

# PHASE 1 — Domain model and migrations

**Goal:** the complete database schema for the product, plus a seed that makes
the app's data identical to `data/mock.ts`. No endpoints.

## Build

`prisma/schema.prisma`. Read `data/mock.ts` first and reuse its field names
wherever they are already good — you want a reviewer to be able to hold both
files side by side.

Required models and the non-obvious constraints on each:

**`User`** — `id` (cuid), `email` (citext, unique), `passwordHash`, `name`,
`avatarKey` (nullable, an R2 object key, **not** a URL), `phone` (nullable,
unique when present), `isOwner`, `isWalker`, `createdAt`, `updatedAt`,
`deletedAt` (nullable — soft delete; a walker with completed bookings can never
be hard-deleted).

**`WalkerProfile`** — one-to-one optional with `User`. `bio`,
`price30Tetri` (Int), `verifiedAt` (nullable DateTime — **not** a boolean; you
will want to know when and by whom), `isAvailableNow`, `ratingAvg` (Decimal
3,2, denormalised), `ratingCount` (Int, denormalised), `districts` (String[]).
The two denormalised rating fields are recomputed in a transaction whenever a
review lands; never computed on read.

**`Dog`** — `ownerId`, `name`, `breed`, `birthDate` (a real date — the demo's
`"3 წლის"` string is a display concern and must not enter the database),
`photoKey`, `notes`, `sizeKg` (nullable Int), `deletedAt`.

**`Address`** — `userId`, `label`, `district`, `street`, `entranceCode`
(nullable — **encrypted at rest**, see below), `latitude`/`longitude` as
nullable `Decimal(9,6)`. The lat/lng columns are populated by nothing in this
build. They exist so the location phase is a backfill, not a migration.

**`Booking`** — `id`, `ownerId`, `walkerId`, `dogId`, `addressId`,
`scheduledFor` (DateTime, UTC), `durationMin` (Int, one of 30/45/60),
`status` (enum, below), `priceTetri`, `serviceFeeTetri`, `payoutTetri`,
`paymentStatus` (enum with the single value `NOT_REQUIRED`), `note` (nullable),
`acceptedAt`, `startedAt`, `completedAt`, `cancelledAt`, `cancelledBy`
(nullable enum OWNER|WALKER|SYSTEM), `cancelReason` (nullable),
`idempotencyKey` (unique, nullable), `createdAt`, `updatedAt`.

**`BookingStatus` enum:** `REQUESTED`, `ACCEPTED`, `IN_PROGRESS`, `COMPLETED`,
`CANCELLED`, `DECLINED`, `EXPIRED`. Seven states, not the demo's three — the
demo never had to represent a request the walker ignored.

**`BookingEvent`** — append-only audit log: `bookingId`, `fromStatus`,
`toStatus`, `actorUserId` (nullable for SYSTEM), `reason`, `createdAt`. Every
status change writes one, in the same transaction as the change. When a user
disputes a walk in four months, this table is the only thing that will save you.

**`Conversation`** — `ownerId`, `walkerId`, `bookingId` (nullable — a
conversation outlives the booking that created it), `lastMessageAt`.
Unique on `(ownerId, walkerId)`.

**`Message`** — `conversationId`, `senderId`, `body` (max 2000 chars),
`createdAt`, `readAt` (nullable). Index `(conversationId, createdAt desc)`.

**`Review`** — `bookingId` (**unique** — one review per booking, enforced by
the database, not by a service check), `authorId`, `subjectId`, `stars` (Int,
DB check constraint 1–5), `body` (nullable, max 1000), `createdAt`.

**`RefreshToken`** — `userId`, `tokenHash` (sha256 of the token; never store
the token), `family` (uuid, for rotation-reuse detection), `expiresAt`,
`revokedAt`, `userAgent`, `ip`.

**`WalkPhoto`** — `bookingId`, `objectKey`, `takenAt`. The photo report is the
product's emotional payoff; give it a real table now.

### Constraints you must write as SQL, not as application code

These go in a hand-edited migration. Prisma will not generate them.

1. **A walker cannot hold two overlapping non-terminal bookings.** Add a
   `tstzrange` generated from `scheduledFor` and `durationMin`, plus a
   `btree_gist` `EXCLUDE` constraint over `(walkerId WITH =, range WITH &&)`
   filtered to `status IN ('ACCEPTED','IN_PROGRESS')`. Two walkers accepting
   the same slot is a race you cannot win in application code, and it is
   exactly the bug that makes a marketplace lose a customer permanently.
2. `CHECK (stars BETWEEN 1 AND 5)` on `Review`.
3. `CHECK (priceTetri >= 0 AND serviceFeeTetri >= 0 AND payoutTetri >= 0)`.
4. `CHECK (payoutTetri = priceTetri - serviceFeeTetri)` on `Booking`. Make the
   database enforce the arithmetic identity that the business depends on.
5. Partial unique index on `User.email WHERE deletedAt IS NULL`.

### Encryption of `entranceCode`

Door codes are the most sensitive field in this database — more than passwords,
which are at least hashed. Encrypt with AES-256-GCM using a key from
`ENCRYPTION_KEY` (env, 32 bytes base64). Store `iv`, `authTag`, `ciphertext`.
Put the helpers in `src/common/crypto.ts` and never log a decrypted value.
Add a note to `DEFERRED.md`: the key is currently in an env var, not a KMS.

### Seed

`prisma/seed.ts` reproduces `data/mock.ts` exactly — the same five walkers
(Nino, Giorgi, Ana, Davit, Mariam), the same six dogs, the same three bookings,
the same three conversations with the same message text. Georgian strings are
copied verbatim. Photos: keep the Unsplash URLs in a `SEED_PHOTOS` map for now
and store them in `avatarKey`/`photoKey` as full URLs, flagged in `DEFERRED.md`
as an R2-migration item.

All seeded users get the password `Password123!`. Seed must be idempotent —
running it twice must not duplicate rows or fail.

## Definition of Done

- [ ] `prisma migrate dev` runs clean from an empty database.
- [ ] `prisma migrate reset && npm run seed` twice in a row produces identical
      row counts.
- [ ] A test proves the overlap `EXCLUDE` constraint rejects a second
      overlapping `ACCEPTED` booking for the same walker, and permits one for a
      different walker.
- [ ] A test proves `stars = 0` and `stars = 6` are rejected by the database.
- [ ] A test proves `entranceCode` round-trips through encrypt/decrypt and that
      the stored column is not readable plaintext.
- [ ] `docs/ERD.md` contains a Mermaid ER diagram of the final schema.
- [ ] `DEFERRED.md` exists and lists the seed photo URLs and the env-var key.

---

# PHASE 2 — Authentication

**Goal:** email + password auth with rotating refresh tokens, and the app can
log in. Phone/SMS is explicitly not in this phase.

## Build

Endpoints:

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register` | email, password, name, and which roles they want |
| POST | `/auth/login` | returns access + refresh |
| POST | `/auth/refresh` | rotates; old token is revoked |
| POST | `/auth/logout` | revokes the presented refresh token |
| POST | `/auth/logout-all` | revokes the whole family |
| GET | `/me` | the authenticated user + profile flags |
| PATCH | `/me` | name, avatarKey |

Requirements:

- **argon2id**, `memoryCost` ≥ 19456 KiB, `timeCost` ≥ 2, `parallelism` 1.
  Not bcrypt, not sha-anything.
- Access token: JWT, **15 minutes**, HS256, payload is `{ sub, iat, exp, jti }`
  and *nothing else*. No roles in the token — roles are read from the database
  on every request. A token that outlives a permission change is a security
  hole and a support ticket.
- Refresh token: 32 random bytes, base64url, **30 days**, stored as a sha256
  hash with a `family` uuid. On refresh: verify → revoke the old → issue a new
  one in the same family, **in one transaction**.
- **Reuse detection:** if a refresh token that is already revoked is presented,
  revoke the entire family immediately and return 401. This is the difference
  between a stolen token being useful for 30 days and being useful once.
- Password rules: minimum 10 characters, and reject the top-1000 common
  passwords from a bundled list. Do not impose character-class rules — they
  make passwords worse and users angrier.
- Rate limits, per IP **and** per email: login 5/min and 20/hour; register
  3/hour; refresh 30/min.
- **Login must not reveal whether an email exists.** Same error code, same
  message, same status, and *the same response time* — run the argon2 verify
  against a dummy hash when the user is not found. Timing tells the truth if
  you let it.
- Guards: `@Public()` decorator marks the exceptions; **everything else is
  authenticated by default** via a global guard. Opt-out beats opt-in — a
  forgotten decorator should fail closed.

## App side

Add to the root Expo app (this is the one phase permitted to touch root deps):
`expo-secure-store`, `@tanstack/react-query`, `axios`.

- `src/api/client.ts` — axios instance, `baseURL` from
  `expo-constants` extra, request interceptor attaching the access token.
- `src/api/auth-store.ts` — tokens in `expo-secure-store` (**never**
  AsyncStorage, never zustand, never in a file). `zustand` holds only
  `status: 'loading' | 'authed' | 'anon'` and the user object.
- **A single-flight refresh queue.** On 401: one refresh request runs; every
  other in-flight request waits on that promise and retries. Without this, a
  screen that fires four queries on mount fires four refreshes, three of which
  trip your own reuse detection and log the user out. This is the single most
  common bug in this phase — write the test for it.
- New routes `app/(auth)/login.tsx` and `app/(auth)/register.tsx`, styled with
  the existing `theme/` and components — `Screen`, `PrimaryButton`, `Card`.
  **No new hex values.** Georgian copy, consistent with the rest of the app.
- `app/_layout.tsx` gates on auth status and redirects. Keep the splash held
  until both the fonts and the auth check resolve, preserving the existing
  no-tofu behaviour.

## Definition of Done

- [ ] Register → login → `/me` works end to end from the app on a real device.
- [ ] Killing and reopening the app keeps the user logged in.
- [ ] Test: presenting a used refresh token revokes the family and every
      subsequent refresh in that family returns 401.
- [ ] Test: 6 failed logins in a minute return 429.
- [ ] Test: login timing for an unknown email is within 20% of a known email
      with a wrong password, over 20 runs.
- [ ] Test: four concurrent 401s trigger exactly **one** refresh request.
- [ ] No endpoint other than `/health` and the `@Public()` auth routes is
      reachable without a token — prove it with a test that enumerates all
      registered routes.

---

# PHASE 3 — Profiles, dogs, walker search

**Goal:** the home and search tabs read real data.

Endpoints: `GET /walkers` (filters + cursor pagination), `GET /walkers/:id`,
`GET /me/dogs`, `POST /me/dogs`, `PATCH /me/dogs/:id`, `DELETE /me/dogs/:id`
(soft), `GET /me/addresses`, `POST /me/addresses`,
`PUT /me/walker-profile`, `PATCH /me/walker-profile/availability`,
`POST /uploads/presign`.

- `GET /walkers` filters mirror `app/(tabs)/search.tsx` exactly:
  `availableNow`, `maxPrice30Tetri`, `district`, `verified`, `q` (name or
  district substring, case-insensitive, Georgian-safe). Accept `lat`/`lng` and
  `radiusKm` in the schema and **ignore them**, returning results ordered by
  rating — the contract is stable before the feature exists.
- **Cursor pagination, not offset.** `?cursor=&limit=` with `limit` capped at
  50, returning `{ items, nextCursor }`. Offset pagination on an infinite list
  produces duplicates and gaps the moment a row is inserted, and every one of
  those becomes a bug report you cannot reproduce.
- Uploads: `POST /uploads/presign` returns a presigned R2 PUT URL scoped to a
  key the server chooses. **The client never chooses the key.** Constrain
  content-type to `image/jpeg|png|webp`, max 5 MB, 5-minute expiry. The client
  uploads directly to R2 and then sends the key. Images never pass through your
  512 MB API server.
- Serialise a `photoKey`/`avatarKey` into a public CDN URL in the response DTO.
  The app receives URLs and knows nothing about keys.
- **Never return another user's email, phone, address or door code.** Write a
  `PublicWalkerDto` and construct it explicitly — no `select: *`, no spreading
  a Prisma model into a response. This is the most likely place in the whole
  build to leak PII.

## App side

- `src/api/generated.ts` from `openapi-typescript` against `server/openapi.json`,
  with an `npm run api:types` script. Wire it into CI so drift fails the build.
- Replace `walkers`, `myDogs` and `currentLocation` imports in
  `app/(tabs)/index.tsx`, `app/(tabs)/search.tsx` and `app/(tabs)/profile.tsx`
  with TanStack Query hooks in `src/api/hooks/`.
- Reuse the existing `WalkerCardSkeleton` for loading and `EmptyState` for both
  empty and error states — add an error variant with a retry action. **Do not
  add a spinner.** The skeleton already exists and is better.
- The search debounce currently lives in a `useEffect` with a 250 ms timer;
  keep the timing, move the fetch into a query with a debounced key.

## Definition of Done

- [ ] Search returns the same five walkers as the mock, and every filter
      combination matches what the mock filter produced.
- [ ] A test asserts a walker response body contains no `email`, `phone`,
      `passwordHash` or address field, by deep-scanning the serialised JSON.
- [ ] Cursor pagination test: insert a row mid-iteration, confirm no duplicate
      and no skipped item.
- [ ] A real photo uploads from the device to R2 and renders in the app.
- [ ] `npm run api:types` produces no diff on a clean checkout.
- [ ] Airplane mode shows the error state with a working retry, not a crash.

---

# PHASE 4 — Bookings

**Goal:** the booking flow and the walker inbox work between two real accounts
on two real devices. This is the phase where the product becomes real.

## The state machine — implement it as data

```
REQUESTED  → ACCEPTED (walker) | DECLINED (walker) | CANCELLED (owner) | EXPIRED (system)
ACCEPTED   → IN_PROGRESS (walker) | CANCELLED (either)
IN_PROGRESS→ COMPLETED (walker)
COMPLETED  → ∅
CANCELLED  → ∅
DECLINED   → ∅
EXPIRED    → ∅
```

Write this as a literal `const TRANSITIONS: Record<Status, Record<Status,
Guard>>` table in one file, and have exactly one function
`transition(bookingId, to, actor, reason)` that consults it. Every service
calls that function; no service writes `status` directly. When you add
payments, you add one guard to the table instead of hunting through eleven
call sites.

Every transition, in a single transaction:
1. `SELECT ... FOR UPDATE` on the booking
2. check the transition is legal from the current status
3. check the actor is permitted (owner vs. walker vs. system)
4. update
5. insert a `BookingEvent`

## Endpoints

`POST /bookings` (owner) · `GET /bookings?role=owner|walker&status=` ·
`GET /bookings/:id` · `POST /bookings/:id/accept` ·
`POST /bookings/:id/decline` · `POST /bookings/:id/cancel` ·
`POST /bookings/:id/start` · `POST /bookings/:id/complete` ·
`GET /walker/requests` (the walker inbox — open `REQUESTED` bookings near them)

Rules:

- **Price is computed server-side, always.** Port `priceFor` and `SERVICE_FEE`
  from `data/mock.ts` into `src/bookings/pricing.ts`; the request body carries
  `durationMin`, never an amount. If the client sends a price field, reject the
  request with 400 rather than ignoring it — silent tolerance of a malformed
  request trains a bug into the client.
- `POST /bookings` and `/accept` require an `Idempotency-Key`. Store the key on
  the booking and return the **existing** booking on a repeat, with 200 instead
  of 201. A double-tap on a flaky connection must not create two walks.
- Accepting a booking auto-creates the `Conversation` if none exists, in the
  same transaction.
- `scheduledFor` must be in the future at creation and not more than 30 days
  out. All times UTC in the database; the app formats to Asia/Tbilisi. **Store
  the timezone-aware instant, never a formatted string** — `data/mock.ts`'s
  `"ხვალ, 09:30"` is display, and the moment it enters the database you have
  lost the ability to sort, filter or remind.
- A `REQUESTED` booking older than its `scheduledFor` is `EXPIRED` by a cron
  every 5 minutes. On $0 hosting where the process sleeps, also expire lazily
  on read. Belt and braces, because your cron will not run.
- Cancellation windows are **not** implemented; the guard function exists and
  returns `allowed: true` unconditionally, with a `TODO(payments)` comment.

## App side

- `app/booking/[walkerId].tsx` posts a real booking; the confirm button shows a
  pending state driven by the mutation, replacing the 900 ms `setTimeout`.
- `app/(tabs)/bookings.tsx` and the walker inbox on `app/(tabs)/index.tsx` read
  from queries. `declinedRequestIds` / `acceptedRequestIds` disappear from
  zustand entirely — server state now.
- Optimistic update on accept/decline with rollback on error, so the card
  animates away instantly. The `LayoutAnimation` calls already in those screens
  keep working.
- `app/walk/[id].tsx` keeps its animated route — the walk timer stays a client
  animation — but `start` and `complete` now call the API, and the photo report
  reads `WalkPhoto` rows. Keep the tap-to-skip demo shortcut behind
  `__DEV__`.

## Definition of Done

- [ ] Two devices, two accounts: owner books, walker sees the request within one
      refresh, accepts, both see `ACCEPTED`.
- [ ] Test: every illegal transition in the table returns 409 with a specific
      code, exercised exhaustively over all 49 status pairs.
- [ ] Test: two concurrent accepts of overlapping slots — exactly one succeeds,
      the other gets 409, no partial write.
- [ ] Test: the same `Idempotency-Key` posted twice creates one booking.
- [ ] Test: a body containing `priceTetri` is rejected with 400.
- [ ] Test: `payoutTetri = priceTetri - serviceFeeTetri` holds for all of
      30/45/60 minutes at each seeded walker's price.
- [ ] `BookingEvent` has one row per transition and zero orphans.

---

# PHASE 5 — Chat

**Goal:** the chat tab and thread screen work between two real accounts.
Transport is polling, hidden behind an interface, per `docs/ARCHITECTURE.md`
ADR-005.

Endpoints: `GET /conversations` · `GET /conversations/:id/messages`
(cursor, newest-first) · `POST /conversations/:id/messages` ·
`POST /conversations/:id/read`.

- Authorisation is participation: you can read a conversation if and only if
  you are its `ownerId` or `walkerId`. Enforce it in the query's `where`, not
  in an `if` after fetching. A `403` you compute after loading the row is a
  `403` you will eventually forget to compute.
- `GET /conversations` returns an `ETag`; an unchanged poll returns **304** with
  an empty body. Without this, a 30-second poll on the list screen will eat
  your free compute quota.
- Message body: trim, reject empty, cap at 2000 characters, and **store as
  plain text** — no HTML, no markdown. Escaping is the renderer's job and React
  Native does it for you; storing markup is how you get an injection bug in the
  web dashboard you have not built yet.
- Unread counts come from `readAt IS NULL AND senderId != me`, computed in one
  grouped query. Never N+1 over conversations.
- Server-side rate limit: 20 messages/minute per user.

## App side

- `src/api/chat/transport.ts` exposing exactly:
  `subscribe(conversationId, onMessages): () => void`. The polling
  implementation is private to this module.
- Poll 3 s with a thread open and the app foregrounded; 30 s on the list; **0 —
  fully stopped — when `AppState` is not `active`.** Wire this to `AppState`
  and test it, because a background poll loop is how a marketplace app earns a
  one-star review about battery life.
- Optimistic send: the message appears instantly with a `sending` state,
  reconciles on the server response, and shows a retry affordance on failure.
  `app/thread/[id].tsx` already scrolls to end on send — keep that.
- `store/useAppStore.ts` loses `threads` and `sendMessage`.

## Definition of Done

- [ ] Two devices exchange messages; each appears on the other within 4 s.
- [ ] Test: a non-participant gets 404 (**not** 403 — do not confirm that a
      conversation id exists to someone who is not in it).
- [ ] Test: an unchanged `GET /conversations` returns 304.
- [ ] Backgrounding the app stops all polling — verified in the network log.
- [ ] Send with the network off shows the retry state and succeeds on
      reconnect.

---

# PHASE 6 — Reviews

Endpoints: `POST /bookings/:id/review` · `GET /walkers/:id/reviews` (cursor).

- Only the owner of a `COMPLETED` booking may review, once, within 14 days.
  Uniqueness is enforced by the database constraint from Phase 1, not by a
  read-then-write check — that check is a race.
- Writing a review recomputes `WalkerProfile.ratingAvg` and `ratingCount` in
  the same transaction. Recompute with `AVG()` over the table; do not
  incrementally update a running average, because it drifts and cannot be
  audited.
- The rating UI in `app/walk/[id].tsx` posts for real. `ratings` leaves zustand.

**Done when:** double-submit returns 409; a review on a non-`COMPLETED` booking
returns 409; `ratingAvg` matches a `SELECT AVG(stars)` after 20 random reviews;
reviewing on day 15 returns 409.

---

# PHASE 7 — Cutover and cleanup

**Goal:** delete the mock layer. This phase is mostly deletion, and it is the
phase most likely to be skipped and most valuable to do.

- `data/mock.ts` is reduced to display helpers only — `gel`, `km`, `DURATIONS`,
  `priceFor` — with all data and types removed. Types now come from
  `src/api/generated.ts`.
- `store/useAppStore.ts` retains only `role`, `toast` and UI state. If anything
  server-shaped is still in there, this phase is not finished.
- Delete every unused import and dead branch that the cutover leaves behind.
- `app/kitchen-sink.tsx` still renders every component — fix it if the cutover
  broke it. It is the fastest regression check you have.
- Update `README.md`'s "What is mocked vs real" table to the truth.
- Global loading, empty and error states audited on all nine routes — the five
  tabs plus `booking/[walkerId]`, `booking/success`, `walk/[id]` and
  `thread/[id]`. Every one must handle loading, empty, error and offline. Most
  bug reports from real users come from these four states, not the happy path.

**Done when:** `grep -rn "from '.*data/mock'" app components` returns only
helper imports; the app runs end to end against a deployed server with the
Metro cache cleared; and a fresh account with zero data can navigate every
route without a crash or a blank screen.

---

# PHASE 8 — Deploy and harden

- Neon project, two branches: `main` and `dev`. Neon branch-per-PR in CI.
- Koyeb free nano service, deployed from GitHub on push to `main`.
  `prisma migrate deploy` runs as a release step, **before** the new instance
  takes traffic.
- Cloudflare R2 bucket, CORS restricted to your app's origins, public read via a
  CDN domain, private write via presigned URLs only.
- Secrets in the platform's secret store. `.env` is in `.gitignore`; verify
  with `git log -p -S 'DATABASE_URL'` that no secret was ever committed. If one
  was, rotate it — a deleted commit is not a rotated secret.
- Sentry on both server and app, with `requestId` attached so a mobile error and
  a server log line can be joined.
- `docs/RUNBOOK.md`: how to run a migration, how to roll back, how to restore
  from `pg_dump`, what to do when Koyeb cold-starts during a demo, who to call.
- **Practise the restore.** A backup you have never restored is not a backup.
- Then read `docs/ARCHITECTURE.md` §"Where the money and the risk actually are"
  and go find one saturated district.

**Done when:** the app on a physical device talks to the deployed server; a PR
gets its own Neon branch and green CI; a deliberate error appears in Sentry with
a joinable request id; and you have restored a `pg_dump` into a scratch branch
at least once.

---

# PHASE REVIEW PROMPT

Run this at the end of every phase, in the same session:

> Review the phase you just completed as a hostile senior reviewer who did not
> write it. Produce:
>
> 1. Every place a value from the client is trusted without server-side
>    derivation.
> 2. Every database write that should be in a transaction and is not.
> 3. Every query that is N+1, unbounded, or missing an index it needs.
> 4. Every response DTO that could leak another user's PII — check by reading
>    the serialised shape, not the intent.
> 5. Every `any`, `as`, non-null `!` and `@ts-expect-error`, with a judgement on
>    each.
> 6. Every acceptance criterion in the Definition of Done that is not actually
>    covered by an automated test, stated plainly.
> 7. The three things most likely to break first in production, and why.
>
> Do not fix anything yet. List findings with file and line. Then wait.

Then decide what to fix. Fixing everything a reviewer finds is as much a
mistake as fixing nothing — but you should know the list before you choose.
