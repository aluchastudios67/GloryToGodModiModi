import { Feather } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAppStore } from '../store/useAppStore';
import { colors, radius, spacing, topShadow, type } from '../theme';

const VISIBLE_MS = 2200;

/**
 * Single global toast, mounted once in the root layout.
 * Fire it from anywhere with `useAppStore.getState().showToast('...')`.
 */
export function Toast() {
  const toast = useAppStore((s) => s.toast);
  const hideToast = useAppStore((s) => s.hideToast);
  const insets = useSafeAreaInsets();
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!toast) return;

    Animated.timing(value, {
      toValue: 1,
      duration: 220,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();

    const timer = setTimeout(() => {
      Animated.timing(value, {
        toValue: 0,
        duration: 180,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) hideToast();
      });
    }, VISIBLE_MS);

    return () => clearTimeout(timer);
  }, [toast, value, hideToast]);

  if (!toast) return null;

  const success = toast.tone === 'success';

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.wrap,
        { top: insets.top + spacing.sm },
        {
          opacity: value,
          transform: [
            {
              translateY: value.interpolate({
                inputRange: [0, 1],
                outputRange: [-20, 0],
              }),
            },
          ],
        },
      ]}
    >
      <View style={styles.toast}>
        <Feather
          name={success ? 'check-circle' : 'info'}
          size={16}
          color={success ? colors.online : colors.primary}
        />
        <Text style={styles.text} numberOfLines={2}>
          {toast.message}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: spacing.screen,
    right: spacing.screen,
    alignItems: 'center',
    zIndex: 100,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    maxWidth: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    ...topShadow,
  },
  text: { ...type.body, color: colors.text, flexShrink: 1 },
});
