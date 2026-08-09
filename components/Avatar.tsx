import { Feather } from '@expo/vector-icons';
import React from 'react';
import { Image, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { colors, radius, sizes } from '../theme';
import { StatusDot, dotOnAvatar } from './StatusDot';

type AvatarProps = {
  /** Remote URL from `PHOTOS`, or a local require(). */
  source: string;
  size?: number;
  /** Adds the ringed dot at the bottom-right. Omit for no dot. */
  status?: 'online' | 'scheduled';
  /** Small teal check badge on the photo. Cards show the check by the name instead. */
  verified?: boolean;
  /** Use the 20pt thumbnail radius instead of a circle — dogs only. */
  square?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** Photo with an optional availability dot. Backed by primarySoft while loading. */
export function Avatar({
  source,
  size = sizes.walkerAvatar,
  status,
  verified = false,
  square = false,
  style,
}: AvatarProps) {
  return (
    <View style={[{ width: size, height: size }, style]}>
      <Image
        source={{ uri: source }}
        style={{
          width: size,
          height: size,
          borderRadius: square ? radius.thumb : size / 2,
          backgroundColor: colors.primarySoft,
        }}
        resizeMode="cover"
      />
      {status ? (
        <StatusDot
          variant={status}
          size={sizes.statusDot}
          ring
          style={dotOnAvatar}
        />
      ) : null}
      {verified ? (
        <View style={styles.badge}>
          <Feather name="check" size={10} color={colors.card} />
        </View>
      ) : null}
    </View>
  );
}

/** The teal check that sits immediately after a verified walker's name. */
export function VerifiedCheck({ size = 15 }: { size?: number }) {
  return (
    <View
      style={[
        styles.check,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Feather name="check" size={size * 0.66} color={colors.card} />
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  check: {
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
