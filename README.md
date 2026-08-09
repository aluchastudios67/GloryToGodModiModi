# ModiModi

A demo-ready MVP of a two-sided dog-walking marketplace for Tbilisi. One React
Native codebase, iOS and Android, running in Expo Go. Every screen is driven by
local mock data — there is no backend, no auth and no payments.

All interface copy is Georgian. The wordmark stays Latin.

---

## Running it

```bash
npm install
npx expo start
```

Scan the QR code with **Expo Go** on a physical iPhone or Android phone. Nothing
in the app needs a custom dev client.

```bash
npm run ios       # simulator
npm run android   # emulator
npm run web       # browser — used for layout checks, not a shipping target
npm run typecheck # tsc --noEmit
```

## What's where

```
app/                 expo-router routes (file = screen)
  (tabs)/            the five bottom tabs
  booking/           [walkerId] request screen, success screen
  walk/[id]          live tracking + photo report
  thread/[id]        one chat conversation
  kitchen-sink       every component rendered once (see below)
components/          the component library — one file per component
theme/               colors, type, layout — the single source of design truth
data/mock.ts         walkers, dogs, requests, bookings, conversations, photos
store/useAppStore.ts zustand: role, availability, bookings, threads, toast
```

### The theme is the only place design values live

- `theme/colors.ts` — **the only file allowed to contain a hex value.** Adding a
  colour anywhere else is a bug.
- `theme/type.ts` — the whole type scale. Because Android ignores `fontWeight`
  on custom fonts, every style picks a **font family**, never a weight.
- `theme/layout.ts` — radii (22 cards/buttons, 20 dog thumbnails, full pills),
  spacing (24 screen, 16 card, 14 between cards), shadows, the shared pressed
  state.

Change a value there and it propagates everywhere. `app/kitchen-sink.tsx`
renders every component once at real size — open it after a theme change to see
the whole library on one screen. It's reachable in the app from the version line
at the bottom of the **პროფილი** tab.

### Swapping the logo

`components/Logo.tsx` is the only file that draws the mark. Replace the `<Svg>`
body with the real asset, keep the `size` prop, and every usage updates.

### Swapping the photos

`data/mock.ts` exports a single `PHOTOS` constant. Every image in the app comes
from it. Replace the Unsplash URLs with `require('../assets/…')` to go fully
offline — nothing else needs to change.

## Fonts

**Noto Sans Georgian** (400/500/600/700/800) via `@expo-google-fonts`. The
splash screen is held until the font is ready so Georgian never flashes as tofu.
Verified rendering on both platforms — no missing glyphs.

## What is mocked vs real

| Area | Status |
| --- | --- |
| Walkers, dogs, requests, bookings, chats | Mock data in `data/mock.ts` |
| Role switch, availability, accept/decline, bookings, chat sending, ratings | **Real** — held in zustand, live for the session |
| Booking confirm | Real state change behind a 900 ms simulated request |
| Map | Drawn with `react-native-svg`, not a real map (see below) |
| Walk tracking | `Animated` interpolation along a fixed route — no GPS |
| Payments, auth, notifications, backend | Not present |

State lives in memory only. Reloading the app resets it to the seed data — which
is what you want between demo runs.

### Why the map is drawn, not `react-native-maps`

`react-native-maps` needs a native module and platform API keys, which would put
the demo behind a custom dev client and give two different results on iOS and
Android. `components/MapPreview.tsx` draws the same picture in SVG: it renders
identically on both platforms, cannot fail to load, and has no key to expire.

Everything map-shaped in the app goes through that one file, so switching to
`react-native-maps` later is a single-file change. The route lives in `ROUTE` as
0–1 coordinates and is scaled to whatever box it's given.

## Demo notes

- **The walk runs on a timer.** Opening a booking from **ჯავშნები** starts a
  16-second walk that reads as 32 minutes on screen. When it finishes you get
  the photo report and the star rating.
- **To skip ahead**, tap the time/distance card during the walk — it jumps
  straight to the end. Useful if you're presenting and don't want to wait.
- **The role switch is on the პროფილი tab.** `მფლობელი` finds and books a
  walker; `გამსეირნებელი` shows dogs waiting nearby and the availability
  toggle. It flips the whole app, including the home screen.
- Haptics fire on booking confirm, accepting a job, going available and the role
  switch. They're silent in a simulator — use a real phone.

## Known trade-offs

These are deliberate; they're written down so they don't read as oversights.

- **Tab labels are 10.5pt**, which is under the 12pt floor used everywhere else.
  That size is fixed by the brief; it's the only text below 12pt.
- **On a 375pt screen (iPhone SE) two meta lines wrap.** The walker card's
  `★ 4.9 · 127 შეფასება • 0.8 კმ` needs ~183pt and has ~172pt, so the distance
  drops to a second line. Same for the longest breed,
  `გოლდენ რეტრივერი · 5 წ.`. Both wrap at a word boundary rather than taking a
  mid-word ellipsis, which the brief forbids. From 390pt up they're single
  lines.
- **Colour contrast.** Several palette pairs fall below WCAG AA for small text —
  white on `primary` measures 2.96:1, teal links on white 2.96:1, `textFaint` on
  white 2.45:1. These come from the brand palette itself, so they were left
  alone. If accessibility matters for the real build, darkening `primary` from
  `#14A89A` to about `#108479` brings white-on-teal to 4.57:1 at the same hue.
  The one pair that was *not* dictated by the palette — coral on `accentSoft`
  at 2.05:1 — was changed to dark ink on the same fill.
- Dark mode is out of scope; the app is forced light.
