import { TextStyle } from 'react-native';

/**
 * Noto Sans Georgian, loaded in app/_layout.tsx.
 *
 * On Android `fontWeight` is ignored for custom fonts — the weight has to come
 * from the family name. So every text style below picks a family, never a weight.
 */
export const fontFamily = {
  regular: 'NotoSansGeorgian_400Regular',
  medium: 'NotoSansGeorgian_500Medium',
  semibold: 'NotoSansGeorgian_600SemiBold',
  bold: 'NotoSansGeorgian_700Bold',
  extrabold: 'NotoSansGeorgian_800ExtraBold',
} as const;

/**
 * The whole type scale. Nothing in the app sets fontSize directly.
 * Tab labels are the one item under 12pt — that size is fixed by the spec.
 */
export const type = {
  /** 30/1.24 w800 — screen headlines. */
  h1: {
    fontFamily: fontFamily.extrabold,
    fontSize: 30,
    lineHeight: 37,
    letterSpacing: -0.3, // -0.01em, h1 only
  },
  /** 22 w800 — stack screen titles, dog name on the booking screen. */
  h2: {
    fontFamily: fontFamily.extrabold,
    fontSize: 22,
    lineHeight: 28,
  },
  /** 17 w700 — card names, section headers. */
  title: {
    fontFamily: fontFamily.bold,
    fontSize: 17,
    lineHeight: 23,
  },
  /** 15 w500 — body copy, list rows, buttons. */
  body: {
    fontFamily: fontFamily.medium,
    fontSize: 15,
    lineHeight: 21,
  },
  /** 13 w400 — secondary meta lines. */
  meta: {
    fontFamily: fontFamily.regular,
    fontSize: 13,
    lineHeight: 18,
  },
  /** 13 w500 — meta that needs a touch more weight (distance, status). */
  metaStrong: {
    fontFamily: fontFamily.medium,
    fontSize: 13,
    lineHeight: 18,
  },
  /** 12.5 w600 — chips, pills, badges. */
  caption: {
    fontFamily: fontFamily.semibold,
    fontSize: 12.5,
    lineHeight: 17,
  },
  /** 10.5 w500 — inactive tab label. Georgian descenders need the 16pt box. */
  tab: {
    fontFamily: fontFamily.medium,
    fontSize: 10.5,
    lineHeight: 16,
  },
  /** 10.5 w600 — active tab label. */
  tabActive: {
    fontFamily: fontFamily.semibold,
    fontSize: 10.5,
    lineHeight: 16,
  },
  /** 20 w800 — the price on a card. */
  price: {
    fontFamily: fontFamily.extrabold,
    fontSize: 20,
    lineHeight: 25,
  },
  /** 24 w800 — the grand total on the booking screen. */
  priceLarge: {
    fontFamily: fontFamily.extrabold,
    fontSize: 24,
    lineHeight: 30,
  },
  /** 12 w500 — the "/ 30 წთ" under a price. Never go below this. */
  priceUnit: {
    fontFamily: fontFamily.medium,
    fontSize: 12,
    lineHeight: 16,
  },
} satisfies Record<string, TextStyle>;

export type TypeName = keyof typeof type;
