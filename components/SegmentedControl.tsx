import * as Haptics from 'expo-haptics';
import React from 'react';
import {
  LayoutAnimation,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { colors, radius, type } from '../theme';

export type Segment<T extends string> = { value: T; label: string };

/**
 * Two-or-more way switch on a primarySoft track: role, booking filter, duration.
 *
 * @param haptic  selection feedback — on for the role switch
 */
export function SegmentedControl<T extends string>({
  segments,
  value,
  onChange,
  haptic = false,
  style,
}: {
  segments: readonly Segment<T>[];
  value: T;
  onChange: (value: T) => void;
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const handlePress = (next: T) => {
    if (next === value) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (haptic) Haptics.selectionAsync().catch(() => {});
    onChange(next);
  };

  return (
    <View style={[styles.track, style]}>
      {segments.map((segment) => {
        const active = segment.value === value;
        return (
          <Pressable
            key={segment.value}
            onPress={() => handlePress(segment.value)}
            accessibilityRole="tab"
            accessibilityState={{ selected: active }}
            accessibilityLabel={segment.label}
            style={({ pressed }) => [
              styles.segment,
              active && styles.segmentActive,
              pressed && !active && styles.segmentPressed,
            ]}
          >
            <Text
              style={[styles.label, active && styles.labelActive]}
              numberOfLines={1}
            >
              {segment.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  track: {
    flexDirection: 'row',
    backgroundColor: colors.primarySoft,
    borderRadius: radius.pill,
    padding: 4,
  },
  segment: {
    flex: 1,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    paddingHorizontal: 8,
  },
  segmentActive: { backgroundColor: colors.primary },
  segmentPressed: { opacity: 0.7 },
  label: { ...type.body, color: colors.primaryDark },
  labelActive: { color: colors.card },
});
