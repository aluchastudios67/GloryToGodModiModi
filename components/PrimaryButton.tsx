import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { buttonGlow, colors, radius, sizes, type } from '../theme';

type PrimaryButtonProps = {
  label: string;
  onPress?: () => void;
  /** Feather glyph shown left of the label. */
  icon?: keyof typeof Feather.glyphMap;
  loading?: boolean;
  disabled?: boolean;
  /** Fire a medium impact on press — reserved for booking, accepting, going online. */
  haptic?: boolean;
  /** Defaults to 64; the pinned booking CTA uses 66. */
  height?: number;
  style?: StyleProp<ViewStyle>;
};

/** The one teal call-to-action per screen. */
export function PrimaryButton({
  label,
  onPress,
  icon,
  loading = false,
  disabled = false,
  haptic = false,
  height = sizes.primaryButton,
  style,
}: PrimaryButtonProps) {
  const inactive = disabled || loading;

  const handlePress = () => {
    if (inactive) return;
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    }
    onPress?.();
  };

  return (
    <Pressable
      onPress={handlePress}
      disabled={inactive}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: inactive, busy: loading }}
      style={({ pressed }) => [
        styles.button,
        { height, backgroundColor: pressed ? colors.primaryDark : colors.primary },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={colors.card} />
      ) : (
        <View style={styles.content}>
          {icon ? <Feather name={icon} size={19} color={colors.card} /> : null}
          <Text style={styles.label}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.button,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    ...buttonGlow,
  },
  pressed: { transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.45 },
  content: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  label: { ...type.title, color: colors.card, textAlign: 'center' },
});
