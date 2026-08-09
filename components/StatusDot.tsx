import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors } from '../theme';

type StatusDotProps = {
  /** `online` = free right now, `scheduled` = free later today / tomorrow. */
  variant: 'online' | 'scheduled';
  size?: number;
  /** 3pt white ring — used when the dot sits on top of a photo. */
  ring?: boolean;
  /** Outline only. The inline dot on a scheduled row is hollow, never filled. */
  hollow?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** The green "available now" dot, and its scheduled counterpart. */
export function StatusDot({
  variant,
  size = 7,
  ring = false,
  hollow = false,
  style,
}: StatusDotProps) {
  const fill = variant === 'online' ? colors.online : colors.yellow;

  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: hollow ? 'transparent' : fill,
        },
        hollow && { borderWidth: 1.5, borderColor: colors.textFaint },
        ring && {
          borderWidth: 3,
          borderColor: colors.card,
        },
        style,
      ]}
    />
  );
}

/** Convenience for the dot pinned to the bottom-right of an avatar. */
export const dotOnAvatar = StyleSheet.create({
  anchor: { position: 'absolute', right: -1, bottom: -1 },
}).anchor;
