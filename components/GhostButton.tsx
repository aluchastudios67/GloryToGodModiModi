import { Feather } from '@expo/vector-icons';
import React from 'react';
import {
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { colors, pressed, radius, type } from '../theme';

/** Outlined, low-commitment action: decline, chat, "maybe later". */
export function GhostButton({
  label,
  onPress,
  icon,
  height = 56,
  tone = 'muted',
  style,
}: {
  label: string;
  onPress?: () => void;
  icon?: keyof typeof Feather.glyphMap;
  height?: number;
  /** `muted` = grey border, `brand` = teal border and label. */
  tone?: 'muted' | 'brand';
  style?: StyleProp<ViewStyle>;
}) {
  const tint = tone === 'brand' ? colors.primary : colors.text;
  const border = tone === 'brand' ? colors.primary : colors.divider;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed: isPressed }) => [
        styles.button,
        { height, borderColor: border },
        pressed(isPressed),
        style,
      ]}
    >
      <View style={styles.content}>
        {icon ? <Feather name={icon} size={17} color={tint} /> : null}
        <Text style={[styles.label, { color: tint }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.button,
    borderWidth: 1.5,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  label: { ...type.title, textAlign: 'center' },
});
