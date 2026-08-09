# ModiModi — Architecture Decision Record

Status: **accepted for v1**, 2026-08-09
Scope: turning the Expo demo into a real two-sided marketplace.
Explicitly deferred: payments, live GPS, push notifications.

---

## 0. What already exists

A finished-looking Expo SDK 54 app, ~2,500 lines, that reads entirely from
`data/mock.ts` and mutates a single zustand store. Nothing crosses the network
except Unsplash photos.

That is a much better starting point than it sounds. The demo has already
answered the hard product questions — the entity shapes in `data/mock.ts`
(`Walker`, `Dog`, `DogRequest`, `Booking`, `Message`, `Conversation`) are a
usable first draft of the domain model, and the screens define exactly which
queries the API has to serve. **The backend is not a blank page; it is a
transcription job with a state machine bolted on.**

The two things the demo hides:

- Every mutation is local, so nothing has ever had to be **consistent between
  two users**. The whole difficulty of the real build lives here.
- `role` is a toggle in a store. In production it is a property of the
  authenticated session and cannot be self-asserted.

---

## ADR-001 — Backend language and framework

**Decision: TypeScript on Node 22, NestJS with the Fastify adapter, Prisma,
PostgreSQL.**

### Options considered

| | Go (chi + sqlc) | NestJS/TS | Supabase-only |
|---|---|---|---|
| Language count in the project | 2 | **1** | 1 |
| Types shared with the app | hand-written or codegen | **generated from one OpenAPI spec** | generated |
| Memory at idle | ~20 MB | ~180 MB | n/a |
| Payment/chat/geo library depth | thin | **deepest** | n/a |
| Business logic lives in | Go | **Go-equivalent TS** | SQL policies |
| Escape hatch if you outgrow it | n/a | rewrite hot paths in Go later | full rewrite |

### Why not Go

Go is the technically better answer to a problem you do not have. It wins on
concurrent connections and memory — which matters when you are streaming live
GPS from 5,000 walkers at once. You have zero walkers. Between now and 5,000
walkers you will change the booking flow six times, and the cost of each change
in Go is meaningfully higher: more boilerplate, more hand-written SQL, a second
mental model to hold. Adopt Go later, for one service (the location gateway),
when there is measured pain. Adopting it now is buying insurance against
success you have not had yet.

### Why not Supabase-as-the-whole-backend

Supabase would get you to a working app fastest, and for a CRUD app I would
recommend it. This is not a CRUD app. A marketplace has an escrow-shaped
problem at its centre: money is authorised at booking, held, and released on
completion, minus a fee, subject to cancellation windows and disputes. That
logic is procedural, has to be transactional, has to be idempotent against
webhook retries, and has to be testable. Expressing it in Postgres row-level
security policies and edge functions is possible and unpleasant. You would
migrate off it precisely when you started making money, which is the worst
possible time to be doing a migration.

### The honest cost of NestJS

NestJS is heavier than it needs to be for an API this size — decorators,
modules, DI container, ~180 MB resident. On the $0 compute tier (512 MB, 0.1
vCPU) that is a real constraint, not a theoretical one. Two mitigations, both
required:

- Use the **Fastify** adapter, not Express. ~2× throughput, lower memory.
- Do not install `@nestjs/graphql`, `typeorm`, or `passport`'s full suite. Keep
  the dependency tree small; audit it at every phase boundary.

If memory becomes the binding constraint before revenue does, dropping NestJS
for bare Fastify is a two-day change because the business logic will live in
plain service classes, not in controllers.

### Non-negotiables that come with this decision

- `strict: true` **and** `noUncheckedIndexedAccess: true` in the server tsconfig.
- **Zod at the boundary.** Every request body, query string and env var is
  parsed, not cast. `any` is banned outside of `.d.ts` shims.
- Prisma for schema and migrations; raw SQL is allowed and expected for the
  two or three queries where the ORM produces something bad (search ranking,
  overlap checks). Do not fight the ORM — drop to SQL and move on.
- Money is **`Int`, in tetri** (1 GEL = 100 tetri). Never a float, never a JS
  `number` that came from the client. Prices are always recomputed server-side.

---

## ADR-002 — Frontend

**Decision: keep React Native + Expo. Add TanStack Query. Shrink zustand.**

There is no reason to change. Expo Router, the theme system and the component
library in this repo are genuinely well-built — `theme/` as the only home for
hex values, one file per component, a kitchen-sink route. That discipline is
worth more than any framework choice.

Three changes:

1. **TanStack Query owns all server state.** Caching, retries, background
   refetch, optimistic updates and loading flags are exactly the problems you
   are about to have, and they are solved. Do not hand-roll them in zustand.
2. **zustand shrinks to UI/session state only** — active role, toast, draft
   text, filters. Everything currently in `useAppStore` that mirrors server
   data (`bookings`, `threads`, `ratings`, `declinedRequestIds`) moves out.
3. **`data/mock.ts` types are replaced by generated types**, produced from the
   API's OpenAPI spec. One source of truth. A backend field rename becomes a
   TypeScript error in the app, not a runtime bug in front of a user.

Leave `MapPreview.tsx` as SVG. The README's reasoning is correct and still
holds — swapping to `react-native-maps` is a one-file change whenever you
actually need real tiles.

**Watch out:** Expo SDK 54 is pinned to whatever the App Store Expo Go
supports. The moment you add native modules — secure storage is fine, but
maps, push, background location are not — you need a development build via EAS.
Budget for that transition; it is the single most common place Expo projects
stall.

---

## ADR-003 — Repository layout

**Decision: `server/` as a sibling folder at the repo root. No monorepo tooling.**

```
GloryToGodModiModi/
├── app/  components/  theme/  store/   ← the Expo app, untouched at root
├── src/api/                            ← generated client + generated types
└── server/                             ← the entire backend, its own package.json
    ├── prisma/
    ├── src/
    └── openapi.json                    ← emitted at build, consumed by the app
```

The tempting alternative is a pnpm/Turborepo monorepo with `apps/mobile` and
`apps/api`. Reject it for now. Metro's handling of hoisted and symlinked
dependencies is the best-documented source of pain in Expo monorepos, and you
would be spending your first two days debugging module resolution instead of
writing the booking state machine. You get the one benefit that actually
matters — shared types — from OpenAPI codegen, without the tooling.

Revisit if you add a third consumer (a web dashboard, an admin panel).

---

## ADR-004 — Hosting on a $0 budget

| Concern | Choice | Free-tier reality |
|---|---|---|
| Postgres | **Neon** | 0.5 GB storage, 100 CU-hours/mo/project, 10 branches, scales to zero after 5 min idle, resumes in <1s. Never permanently paused. |
| API compute | **Koyeb** free nano | 1 service, 0.1 vCPU, 512 MB, scale-to-zero. |
| Object storage (dog photos) | **Cloudflare R2** | 10 GB, and — the actual reason — **zero egress fees**. |
| CI | GitHub Actions | Free for public repos. |

### Why Neon over Supabase for the database

Supabase gives you more raw storage (500 MB × 2 projects) and bundles auth,
storage and realtime. But its free tier **pauses a project after 7 days with no
requests**, and unpausing is a manual click in the dashboard. That is a booby
trap: you will take a two-week break, come back, and your app will be down. The
common workarounds — a cron ping, an UptimeRobot monitor — are you paying
attention forever to avoid a limitation.

Neon suspends *compute* on idle and resumes it automatically on the next query.
Same cost saving, no human in the loop. Take Neon.

Use Neon **branching** for CI: every pull request gets a real database branch
seeded from production schema, tests run against real Postgres, branch is
deleted on merge. This is the single highest-leverage free feature in the stack
and most people never turn it on.

### The things $0 actually costs you

Be sceptical of anyone who tells you free hosting is free.

- **Cold starts.** Both Neon compute and Koyeb scale to zero. First request
  after idle is slow — likely 1–3 s end to end. Fine in development,
  embarrassing in a demo. Mitigation: a GitHub Actions cron hitting `/health`
  every 10 minutes during a demo window. Do not run it 24/7 — it burns your
  100 CU-hours.
- **0.5 GB of Postgres** is plenty for rows and hopeless for images. This is
  why photos go to R2 and only the key is stored in the database. Never put a
  base64 image in a column.
- **Render's free tier does not support WebSockets** (paid plans only), which
  removes the most obvious host from consideration for live chat. See ADR-005.
- **No automated backups worth the name.** Before any destructive migration,
  `pg_dump` to your own machine. Write it in the runbook.

The first ~$10/month you spend should buy always-on compute. Not more storage,
not a bigger database — just the removal of cold starts.

---

## ADR-005 — Realtime chat transport

**Decision: ship chat as REST + adaptive polling behind a `ChatTransport`
interface. Move to WebSockets when you leave the free tier.**

This looks like a downgrade and mostly is not. Two-person chat about "I'm
outside the building" tolerates 3 seconds of latency completely. What it does
not tolerate is being unreliable, and polling is trivially reliable — it works
through captive portals, corporate proxies, backgrounded apps and cold starts,
none of which WebSockets do gracefully on mobile.

The design constraint that makes this safe: **the client must never know which
transport it is using.** One module, `src/api/chat/transport.ts`, exposes
`subscribe(conversationId, onMessage)`. The polling implementation lives behind
it. Swapping in Socket.IO later touches that one file and zero screens. If any
screen imports a polling detail — an interval, a cursor, a `setTimeout` — the
abstraction has leaked and the phase has failed review.

Polling policy: 3 s while a thread is open and the app is foregrounded, 30 s
for the conversation list, **stop entirely** when the app backgrounds. Use
`If-None-Match` / 304 so an idle poll costs almost nothing. Without the
backgrounding rule you will burn your free compute quota on nobody.

---

## ADR-006 — The seams for payments and location

You asked to leave both out. Correct call. But *leaving room* for them costs
almost nothing now and a rewrite later, so build these three seams in Phase 1:

**Money.** Every `Booking` carries `priceTetri`, `serviceFeeTetri`,
`payoutTetri`, and a `paymentStatus` enum that ships with exactly one value:
`NOT_REQUIRED`. Nothing reads it yet. When Stripe or TBC arrives, you add
values to the enum and a `Payment` table with a foreign key — you do not touch
the booking state machine.

**Location.** Store `latitude`/`longitude` as nullable `Decimal(9,6)` on
`Address` from day one, and make the search endpoint accept optional `lat`/`lng`
query parameters that it currently ignores in favour of a fixed district
filter. The API contract does not change when GPS arrives; only the
implementation behind it does. Add PostGIS when you have more than ~2,000
walkers; before that, a bounding-box filter plus the haversine formula in SQL
is faster to write and fast enough.

**Live walk tracking is a different system.** Do not try to serve it from the
same request/response API. It is append-only, high-frequency, and worthless
after the walk ends. When you build it, it gets its own table with a TTL and
its own endpoint. `app/walk/[id].tsx` currently animates a fixed route — keep
that as the fallback rendering path forever, because GPS will drop out.

---

## ADR-007 — Roles

**Decision: one `User` row, two capability flags, role asserted by the server.**

The demo's insight is right and worth preserving: this is one binary, and a
person is both a dog owner and a walker at different hours. So do not model two
user types. Model `User { isOwner: Boolean, isWalker: Boolean }` plus an
optional `WalkerProfile` one-to-one.

The security consequence, which the demo cannot express: **the active role is
never sent by the client.** A request to accept a job is authorised by checking
that the authenticated user has a `WalkerProfile` and is the assigned walker on
that booking — not by trusting a header. Every role check happens in a guard,
server-side, against the database. Assume the client is hostile; a marketplace
where a walker can self-assign jobs is a marketplace with no walkers left.

---

## Where the money and the risk actually are

Three things will decide whether this works, and none of them are the language:

1. **Supply liquidity in one district.** A marketplace that is thin everywhere
   is dead. Vake alone, saturated, beats all of Tbilisi at 5% coverage. The
   search screen should probably lie a little at launch — show only districts
   where you can actually deliver a walker.
2. **Trust.** `verified: boolean` is a single field in the mock and the entire
   product in reality. Someone is handing a stranger their dog and their front
   door code. The verification flow (ID check, references, insurance) is the
   moat, and it is a business process, not code.
3. **Take rate vs. disintermediation.** `SERVICE_FEE = 3` on a ₾15 walk is 20%.
   After the second walk, Nino and the owner have each other's phone numbers
   and no reason to keep paying it. Every dog-walking marketplace fights this.
   The answer is usually insurance, guaranteed backup walkers, and scheduling —
   things an individual cannot self-provide. Design for that, not for the fee.

### Adjacent ideas the same infrastructure supports

Since you are building a scheduling + trust + escrow engine for a two-sided
local services market, the marginal cost of these is low:

- **Vet-visit transport.** Higher price point, same booking primitives, and
  people who will not trust a stranger with a walk will pay more for a
  scheduled clinic run with proof-of-arrival photos.
- **Pet-sitting / boarding.** Multi-day bookings are the same state machine
  with a date range instead of a duration. Highest revenue per booking in this
  category and the one that most justifies a take rate.
- **A verified-walker API for buildings and compounds.** Sell the trust layer
  rather than the marketplace. New residential developments in Tbilisi want an
  amenity; you want distribution. Same walker table, different customer.
- **The photo report as the product.** `app/walk/[id].tsx` already ends in a
  photo report. That artefact is what an anxious owner is actually buying. It
  is also the highest-retention surface in the app and the thing worth
  over-investing in.

Treat all four as hypotheses, not roadmap. The correct next step is one
saturated district, not a second product.

---

## Sources

- [Supabase vs Neon vs Railway (2026)](https://codelesssync.com/blog/supabase-vs-neon-vs-railway-postgresql-for-saas)
- [Neon Free plan limits and quotas](https://neon.com/faqs/free-plan-limits-and-quotas)
- [Neon plans — Neon Docs](https://neon.com/docs/introduction/plans)
- [Supabase Free Tier Limits in 2026: Hidden Pauses & Caps](https://www.itpathsolutions.com/supabase-free-tier-limits)
- [Koyeb Free Tier 2026: Pricing, Limits & Credit Card](https://www.srvrlss.io/provider/koyeb/)
- [Platforms with a real free tier for developers in 2026](https://render.com/articles/platforms-with-a-real-free-tier-for-developers-in-2026)
- [Free PostgreSQL Hosting: Every Real Option (2026)](https://swyftstack.com/blog/free-postgresql-hosting)
