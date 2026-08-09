import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { GhostButton, PrimaryButton, Screen } from '../../components';
import { colors, spacing, type } from '../../theme';

/** Shown for a beat after a booking is placed, then hands off to tracking. */
export default function BookingSuccessScreen() {
  const { bookingId, name, when } = useLocalSearchParams<{
    bookingId: string;
    name: string;
    when: string;
  }>();

  const pop = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(pop, {
      toValue: 1,
      friction: 5,
      tension: 90,
      useNativeDriver: true,
    }).start();
  }, [pop]);

  const ring = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(ring, {
      toValue: 1,
      duration: 900,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [ring]);

  return (
    <Screen>
      <View style={styles.body}>
        <Animated.View
          style={[
            styles.ring,
            {
              opacity: ring.interpolate({
                inputRange: [0, 1],
                outputRange: [0.5, 0],
              }),
              transform: [
                {
                  scale: ring.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.6, 1.5],
                  }),
                },
              ],
            },
          ]}
        />
        <Animated.View style={[styles.check, { transform: [{ scale: pop }] }]}>
          <Feather name="check" size={46} color={colors.card} />
        </Animated.View>

        <Text style={styles.title}>ჯავშანი დადასტურდა</Text>
        <Text style={styles.detail}>{`${name ?? ''} · ${when ?? ''}`}</Text>
        <Text style={styles.note}>
          გამსეირნებელი დროულად მოვა. სეირნობას რუკაზე გაჰყვები.
        </Text>
      </View>

      <View style={styles.actions}>
        <PrimaryButton
          label="სეირნობის თვალყური"
          icon="map"
          onPress={() => router.replace(`/walk/${bookingId ?? 'b1'}`)}
        />
        <GhostButton
          label="მთავარზე დაბრუნება"
          onPress={() => router.replace('/')}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  ring: {
    position: 'absolute',
    top: '50%',
    marginTop: -160,
    width: 140,
    height: 140,
    borderRadius: 70,
    backgroundColor: colors.primary,
  },
  check: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xl,
  },
  title: { ...type.h1, color: colors.text, textAlign: 'center' },
  detail: {
    ...type.title,
    color: colors.primary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  note: {
    ...type.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.md,
  },
  actions: { gap: spacing.md, paddingBottom: spacing.xl },
});
