import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, hitSlop, pillShadow, pressed, radius, type } from '../theme';

/** White pill with a pin icon — the owner's current district. */
export function LocationPill({
  label,
  onPress,
}: {
  label: string;
  onPress?: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed: isPressed }) => [styles.pill, pressed(isPressed)]}
    >
      <Feather name="map-pin" size={13} color={colors.primary} />
      <Text style={styles.label} numberOfLines={1}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    height: 34,
    paddingHorizontal: 12,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    ...pillShadow,
  },
  label: { ...type.caption, color: colors.text },
});
