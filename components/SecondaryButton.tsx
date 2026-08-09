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

/** Coral button — the second-choice action, never more than one per screen. */
export function SecondaryButton({
  label,
  onPress,
  icon,
  height = 56,
  style,
}: {
  label: string;
  onPress?: () => void;
  icon?: keyof typeof Feather.glyphMap;
  height?: number;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed: isPressed }) => [
        styles.button,
        { height },
        pressed(isPressed),
        style,
      ]}
    >
      <View style={styles.content}>
        {icon ? <Feather name={icon} size={18} color={colors.card} /> : null}
        <Text style={styles.label}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.button,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  content: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  label: { ...type.title, color: colors.card, textAlign: 'center' },
});
