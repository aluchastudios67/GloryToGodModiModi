import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, radius, spacing, type } from '../theme';
import { GhostButton } from './GhostButton';

/**
 * No list in this app dead-ends: every empty state carries a way forward.
 *
 * @param actionLabel  omit only if the caller genuinely has nowhere to send you
 */
export function EmptyState({
  icon = 'inbox',
  title,
  body,
  actionLabel,
  onAction,
  tone = 'empty',
}: {
  icon?: keyof typeof Feather.glyphMap;
  title: string;
  body?: string;
  actionLabel?: string;
  onAction?: () => void;
  /** `error` tints the illustration coral; the layout is otherwise identical. */
  tone?: 'empty' | 'error';
}) {
  return (
    <View style={styles.wrap}>
      <View style={[styles.illustration, tone === 'error' && styles.illustrationError]}>
        <Feather
          name={icon}
          size={38}
          color={tone === 'error' ? colors.accent : colors.primary}
        />
      </View>
      <Text style={styles.title}>{title}</Text>
      {body ? <Text style={styles.body}>{body}</Text> : null}
      {actionLabel ? (
        <GhostButton
          label={actionLabel}
          onPress={onAction}
          tone="brand"
          height={52}
          style={styles.action}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', paddingVertical: spacing.xl * 1.4 },
  illustration: {
    width: 108,
    height: 108,
    borderRadius: radius.card * 1.6,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  illustrationError: { backgroundColor: colors.accentSoft },
  title: { ...type.h2, color: colors.text, textAlign: 'center' },
  body: {
    ...type.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  action: { marginTop: spacing.lg, minWidth: 220 },
});
