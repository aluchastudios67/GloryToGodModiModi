import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, fontFamily, spacing } from '../theme';
import { Logo } from './Logo';

/** Logo + "ModiModi" wordmark on the left, anything you pass on the right. */
export function AppHeader({ right }: { right?: React.ReactNode }) {
  return (
    <View style={styles.row}>
      <View style={styles.brand}>
        <Logo size={34} />
        <Text style={styles.wordmark}>ModiModi</Text>
      </View>
      {right}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  brand: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  wordmark: {
    fontFamily: fontFamily.extrabold,
    fontSize: 19,
    lineHeight: 24,
    letterSpacing: -0.2,
    color: colors.text,
  },
});
