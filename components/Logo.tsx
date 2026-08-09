import React from 'react';
import { View, ViewStyle } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { colors } from '../theme';

/**
 * Placeholder brand mark: teal rounded square + white paw.
 * Swap the <Svg> below for the real asset when it lands — this file is the only
 * place the logo is drawn.
 *
 * @param size  edge length in points (corner radius is always 22% of it)
 */
export function Logo({ size = 34, style }: { size?: number; style?: ViewStyle }) {
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size * 0.22,
          backgroundColor: colors.primary,
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
        },
        style,
      ]}
    >
      <Svg width={size * 0.66} height={size * 0.66} viewBox="0 0 100 100">
        <Ellipse cx="26" cy="40" rx="10.5" ry="13.5" fill={colors.card} transform="rotate(-16 26 40)" />
        <Ellipse cx="46" cy="28" rx="10.5" ry="14" fill={colors.card} transform="rotate(-5 46 28)" />
        <Ellipse cx="67" cy="30" rx="10.5" ry="13.5" fill={colors.card} transform="rotate(9 67 30)" />
        <Ellipse cx="85" cy="46" rx="9.5" ry="12.5" fill={colors.card} transform="rotate(22 85 46)" />
        <Path
          d="M53 51c14 0 26 10.5 26 21.5S68.5 89 53 89 27 83.5 27 72.5 39 51 53 51z"
          fill={colors.card}
        />
      </Svg>
    </View>
  );
}
