/**
 * ModiModi palette. This is the ONLY place a hex value may appear.
 * If you need a new colour, add it here first.
 */
export const colors = {
  primary: '#14A89A', // brand teal — primary buttons, active tab, links
  primaryDark: '#0E8C80', // pressed state
  primarySoft: '#DCF0EE', // tinted fills, avatar backgrounds
  accent: '#FF8A5B', // warm coral — secondary CTA, highlights
  accentSoft: '#FFEEDF',
  yellow: '#FFC94D', // star ratings, small accents
  bg: '#FFF7EF', // cream app background
  card: '#FFFFFF',
  text: '#1F2A2E',
  textMuted: '#6B7B80',
  textFaint: '#9AA8AC',
  divider: 'rgba(31,42,46,0.07)',
  online: '#34C759', // available-now dot
  onlineText: '#2E9E4F',
} as const;

/** Colours that only exist as an alpha wash of a palette colour. */
export const alpha = {
  /** White at 32% — the availability switch track on teal. */
  white32: 'rgba(255,255,255,0.32)',
  /** White at 18% — hairlines drawn on top of teal. */
  white18: 'rgba(255,255,255,0.18)',
  /** Scrim behind a bottom sheet. */
  scrim: 'rgba(31,42,46,0.38)',
} as const;

export type ColorName = keyof typeof colors;
