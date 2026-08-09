import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { cardShadow, colors, radius, sizes, spacing } from '../theme';

/** A pulsing primarySoft block. Never a spinner on a blank screen. */
export function Skeleton({
  width,
  height,
  rounded = radius.pill,
  style,
}: {
  width?: number | `${number}%`;
  height: number;
  rounded?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const value = useRef(new Animated.Value(0.5)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(value, {
          toValue: 1,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(value, {
          toValue: 0.5,
          duration: 700,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [value]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: rounded, backgroundColor: colors.primarySoft, opacity: value },
        style,
      ]}
    />
  );
}

/** The WalkerCard silhouette, shown while a search re-filters. */
export function WalkerCardSkeleton() {
  return (
    <View style={styles.card}>
      <Skeleton width={sizes.walkerAvatar} height={sizes.walkerAvatar} rounded={sizes.walkerAvatar / 2} />
      <View style={styles.middle}>
        <Skeleton width="55%" height={15} rounded={8} />
        <Skeleton width="80%" height={12} rounded={8} style={styles.line} />
        <Skeleton width="42%" height={12} rounded={8} style={styles.line} />
      </View>
      <Skeleton width={46} height={20} rounded={8} />
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: spacing.card,
    marginBottom: spacing.gap,
    ...cardShadow,
  },
  middle: { flex: 1, marginLeft: spacing.md, marginRight: spacing.sm, gap: 0 },
  line: { marginTop: 7 },
});
