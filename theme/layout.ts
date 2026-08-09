import { Platform, ViewStyle } from 'react-native';
import { colors } from './colors';

/** Corner radii. Cards and buttons are 22, dog thumbnails 20, pills full. */
export const radius = {
  card: 22,
  button: 22,
  thumb: 20, // dog photos only
  pill: 999,
  sheet: 28,
  chip: 999,
} as const;

/** Spacing scale. Screens are padded 24, cards 16, list gap 14. */
export const spacing = {
  screen: 24,
  card: 16,
  gap: 14,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 20,
  xl: 28,
} as const;

/** Fixed control heights, so nothing drifts between screens. */
export const sizes = {
  primaryButton: 64,
  bottomCta: 66,
  availabilityBar: 64,
  walkerAvatar: 60,
  dogThumb: 64,
  bookingDogPhoto: 76,
  bookingAvatar: 54,
  mapPreview: 106,
  statusDot: 16, // the ring-bordered dot on an avatar
  inlineDot: 7, // the small dot in a status row
  hitSlop: 44, // minimum tappable square
} as const;

/** Standard card shadow — soft, low, never muddy. */
export const cardShadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: colors.text,
    shadowOpacity: 0.07,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 4 },
  },
  default: { elevation: 2 },
}) as ViewStyle;

/** Teal glow under the primary button. */
export const buttonGlow: ViewStyle = Platform.select({
  ios: {
    shadowColor: colors.primary,
    shadowOpacity: 0.32,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 8 },
  },
  default: { elevation: 4 },
}) as ViewStyle;

/** Lighter shadow for pills floating on the cream background. */
export const pillShadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: colors.text,
    shadowOpacity: 0.06,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 2 },
  },
  default: { elevation: 1 },
}) as ViewStyle;

/** Shadow above a bottom sheet / pinned CTA bar. */
export const topShadow: ViewStyle = Platform.select({
  ios: {
    shadowColor: colors.text,
    shadowOpacity: 0.1,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: -6 },
  },
  default: { elevation: 12 },
}) as ViewStyle;

/** Pressed feedback shared by every Pressable in the app. */
export const pressed = (isPressed: boolean): ViewStyle => ({
  opacity: isPressed ? 0.85 : 1,
  transform: [{ scale: isPressed ? 0.985 : 1 }],
});

/** Expands a small control's touch target to the 44pt minimum. */
export const hitSlop = { top: 12, bottom: 12, left: 12, right: 12 } as const;
