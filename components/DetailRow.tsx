import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, pressed, spacing, type } from '../theme';

/**
 * One line of the booking details list: teal icon, label, chevron.
 *
 * @param divider  draws the 1px hairline above the row (all but the first)
 */
export function DetailRow({
  icon,
  label,
  value,
  onPress,
  divider = false,
}: {
  icon: keyof typeof Feather.glyphMap;
  /** Small grey caption above the value — optional. */
  label?: string;
  value: string;
  onPress?: () => void;
  divider?: boolean;
}) {
  const body = (
    <View style={[styles.row, divider && styles.divider]}>
      <View style={styles.iconWell}>
        <Feather name={icon} size={17} color={colors.primary} />
      </View>
      <View style={styles.text}>
        {label ? <Text style={styles.label}>{label}</Text> : null}
        <Text style={styles.value}>{value}</Text>
      </View>
      {onPress ? (
        <Feather name="chevron-right" size={18} color={colors.textFaint} />
      ) : null}
    </View>
  );

  if (!onPress) return body;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label ? `${label}: ${value}` : value}
      style={({ pressed: isPressed }) => pressed(isPressed)}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    minHeight: 52,
  },
  divider: { borderTopWidth: 1, borderTopColor: colors.divider },
  iconWell: {
    width: 34,
    alignItems: 'flex-start',
    justifyContent: 'center',
  },
  text: { flex: 1 },
  label: { ...type.meta, color: colors.textFaint, marginBottom: 1 },
  value: { ...type.body, color: colors.text },
});
