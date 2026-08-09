# ModiModi — entity relationship diagram

Generated from `server/prisma/schema.prisma` at Phase 1. Regenerate by hand when
the schema changes; a diagram that drifts is worse than none.

Money is `Int`, in **tetri** (1 GEL = 100 tetri). Times are `timestamptz`.

```mermaid
erDiagram
    User ||--o| WalkerProfile : "has (optional)"
    User ||--o{ Dog : owns
    User ||--o{ Address : has
    User ||--o{ Booking : "books (owner)"
    User ||--o{ Booking : "works (walker)"
    User ||--o{ Conversation : "owner side"
    User ||--o{ Conversation : "walker side"
    User ||--o{ Message : sends
    User ||--o{ Review : writes
    User ||--o{ Review : "is reviewed"
    User ||--o{ RefreshToken : holds
    User ||--o{ BookingEvent : acts

    Dog ||--o{ Booking : "walked in"
    Address ||--o{ Booking : "starts at"

    Booking ||--o{ BookingEvent : "audited by"
    Booking ||--o| Review : "reviewed by"
    Booking ||--o{ WalkPhoto : "documented by"
    Booking ||--o{ Conversation : "may start"

    Conversation ||--o{ Message : contains

    User {
        string id PK
        citext email "unique WHERE deletedAt IS NULL"
        string passwordHash
        string name
        string avatarKey "R2 object key, not a URL"
        string phone "unique when present"
        boolean isOwner
        boolean isWalker
        datetime deletedAt "soft delete"
    }

    WalkerProfile {
        string id PK
        string userId FK "unique, one-to-one"
        string bio
        int price30Tetri
        datetime verifiedAt "null = unverified"
        boolean isAvailableNow
        decimal ratingAvg "denormalised 3,2"
        int ratingCount "denormalised"
        string_array districts
    }

    Dog {
        string id PK
        string ownerId FK
        string name
        string breed
        date birthDate "real date, not '3 წლის'"
        string photoKey
        int sizeKg
        datetime deletedAt
    }

    Address {
        string id PK
        string userId FK
        string label
        string district
        string street
        string entranceCodeCiphertext "AES-256-GCM"
        string entranceCodeIv
        string entranceCodeTag
        decimal latitude "9,6 — unused until GPS"
        decimal longitude "9,6 — unused until GPS"
    }

    Booking {
        string id PK
        string ownerId FK
        string walkerId FK
        string dogId FK
        string addressId FK
        datetime scheduledFor
        datetime endsAt "trigger-maintained"
        int durationMin "CHECK IN (30,45,60)"
        enum status "7 states"
        int priceTetri "CHECK >= 0"
        int serviceFeeTetri "CHECK >= 0"
        int payoutTetri "CHECK = price - fee"
        enum paymentStatus "NOT_REQUIRED only"
        string idempotencyKey "unique"
        datetime acceptedAt
        datetime startedAt
        datetime completedAt
        datetime cancelledAt
        enum cancelledBy "OWNER|WALKER|SYSTEM"
    }

    BookingEvent {
        string id PK
        string bookingId FK
        enum fromStatus "null on creation"
        enum toStatus
        string actorUserId FK "null when SYSTEM"
        string reason
        datetime createdAt
    }

    Conversation {
        string id PK
        string ownerId FK
        string walkerId FK
        string bookingId FK "nullable — outlives the booking"
        datetime lastMessageAt
    }

    Message {
        string id PK
        string conversationId FK
        string senderId FK
        string body "max 2000, plain text"
        datetime readAt
    }

    Review {
        string id PK
        string bookingId FK "UNIQUE — one per booking"
        string authorId FK
        string subjectId FK
        int stars "CHECK BETWEEN 1 AND 5"
        string body "max 1000"
    }

    RefreshToken {
        string id PK
        string userId FK
        string tokenHash "sha256, unique"
        uuid family "rotation-reuse detection"
        datetime expiresAt
        datetime revokedAt
    }

    WalkPhoto {
        string id PK
        string bookingId FK
        string objectKey
        datetime takenAt
    }
```

## Booking status

```mermaid
stateDiagram-v2
    [*] --> REQUESTED
    REQUESTED --> ACCEPTED : walker
    REQUESTED --> DECLINED : walker
    REQUESTED --> CANCELLED : owner
    REQUESTED --> EXPIRED : system
    ACCEPTED --> IN_PROGRESS : walker
    ACCEPTED --> CANCELLED : either
    IN_PROGRESS --> COMPLETED : walker
    COMPLETED --> [*]
    CANCELLED --> [*]
    DECLINED --> [*]
    EXPIRED --> [*]
```

Seven states, not the demo's three: the demo never had to represent a request
the walker simply ignored. The transition table is implemented in Phase 4.

## What the database enforces, not the application

These live in hand-written SQL at the end of
`server/prisma/migrations/*/migration.sql`. They are the rules that must hold
even if a service has a bug.

| Rule | Mechanism |
| --- | --- |
| A walker cannot hold two overlapping live bookings | `EXCLUDE USING gist` on `("walkerId", tstzrange(scheduledFor, endsAt))`, filtered to `ACCEPTED`/`IN_PROGRESS` |
| `endsAt` always equals `scheduledFor + durationMin` | `BEFORE INSERT OR UPDATE` trigger |
| `payoutTetri = priceTetri - serviceFeeTetri` | `CHECK` |
| No negative money | `CHECK` |
| Duration is 30, 45 or 60 | `CHECK` |
| Stars are 1–5 | `CHECK` |
| One review per booking | `UNIQUE` on `bookingId` |
| Email unique among live accounts only | partial unique index `WHERE deletedAt IS NULL` |
| Email is case-insensitive | `citext` |

### Why `endsAt` exists at all

The natural design is a generated column holding a `tstzrange`. Postgres refuses
it:

```
ERROR:  generation expression is not immutable
```

`timestamptz + interval` is **STABLE**, not IMMUTABLE, because month and day
arithmetic depends on the session `TimeZone`. A stable expression is allowed in
neither a generated column nor an index expression, and the exclusion constraint
is an index. Two plain `timestamptz` columns give `tstzrange(a, b)`, which *is*
immutable. The trigger stops `endsAt` drifting from `durationMin`.

`tstzrange` is half-open `[)`, so a walk ending at 11:00 and one starting at
11:00 do not conflict — which is the behaviour you want.
