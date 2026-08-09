import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { colors, pressed, radius, type } from '../theme';

/** Filter pill on the search screen. Selected = solid teal. */
export function Chip({
  label,
  selected = false,
  onPress,
  icon,
}: {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  icon?: keyof typeof Feather.glyphMap;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      accessibilityLabel={label}
      style={({ pressed: isPressed }) => [
        styles.chip,
        selected && styles.chipSelected,
        pressed(isPressed),
      ]}
    >
      {icon ? (
        <Feather
          name={icon}
          size={13}
          color={selected ? colors.card : colors.textMuted}
        />
      ) : null}
      <Text style={[styles.label, selected && styles.labelSelected]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    minHeight: 38,
    paddingHorizontal: 14,
    borderRadius: radius.chip,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  chipSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
  label: { ...type.caption, color: colors.textMuted },
  labelSelected: { color: colors.card },
});
