import React from 'react';
import {
  ScrollView,
  StyleSheet,
  View,
  ViewStyle,
  StyleProp,
} from 'react-native';
import { Edge, SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';

type ScreenProps = {
  children: React.ReactNode;
  /** Wrap the content in a ScrollView. Off for screens that own their own list. */
  scroll?: boolean;
  /** Apply the standard 24pt horizontal padding. */
  padded?: boolean;
  /** Safe-area edges to inset. Tab screens skip `bottom` — the tab bar owns it. */
  edges?: readonly Edge[];
  style?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
};

/** Cream background + safe area. Every screen starts with this. */
export function Screen({
  children,
  scroll = false,
  padded = true,
  edges = ['top'],
  style,
  contentStyle,
}: ScreenProps) {
  const pad = padded ? { paddingHorizontal: spacing.screen } : null;

  return (
    <SafeAreaView style={[styles.root, style]} edges={edges}>
      {scroll ? (
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[pad, styles.scrollContent, contentStyle]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.flex, pad, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  flex: { flex: 1 },
  scrollContent: { paddingBottom: spacing.xl },
});
