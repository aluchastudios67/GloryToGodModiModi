import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import { cardShadow, colors, pressed, radius, spacing } from '../theme';

type CardProps = {
  children: React.ReactNode;
  /** Pass to make the whole card a tap target. */
  onPress?: () => void;
  /** Drop the 16pt inner padding — for cards that contain a full-bleed map. */
  flush?: boolean;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
};

/** White 22-radius surface with the standard soft shadow. */
export function Card({
  children,
  onPress,
  flush = false,
  style,
  accessibilityLabel,
}: CardProps) {
  const base = [styles.card, flush ? styles.flush : styles.padded, style];

  if (!onPress) return <View style={base}>{children}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed: isPressed }) => [...base, pressed(isPressed)]}
    >
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.card,
    ...cardShadow,
  },
  padded: { padding: spacing.card },
  flush: { overflow: 'hidden' },
});
