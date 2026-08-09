import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, hitSlop, pressed, spacing, type } from '../theme';

/** `ახლოს არიან` on the left, an optional teal action word on the right. */
export function SectionHeader({
  title,
  action,
  onActionPress,
}: {
  title: string;
  /** e.g. `ყველა` or `ფილტრი`. */
  action?: string;
  onActionPress?: () => void;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.title}>{title}</Text>
      {action ? (
        <Pressable
          onPress={onActionPress}
          hitSlop={hitSlop}
          accessibilityRole="button"
          accessibilityLabel={action}
          style={({ pressed: isPressed }) => pressed(isPressed)}
        >
          <Text style={styles.action}>{action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  title: { ...type.title, color: colors.text, flexShrink: 1 },
  action: { ...type.body, color: colors.primary },
});
