import { Feather } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, type } from '../theme';

/**
 * `★ 4.9 · 127 შეფასება`, optionally followed by a distance.
 *
 * @param trailing  appended after a bullet, e.g. `0.8 კმ` — never wraps
 */
export function Rating({
  rating,
  reviews,
  trailing,
}: {
  rating: number;
  reviews?: number;
  trailing?: string;
}) {
  return (
    <View style={styles.row}>
      <Feather name="star" size={13} color={colors.yellow} />
      <Text style={styles.score}>{rating.toFixed(1)}</Text>
      {reviews !== undefined ? (
        <Text style={styles.meta} numberOfLines={1}>
          {`· ${reviews} შეფასება`}
        </Text>
      ) : null}
      {trailing ? <Text style={styles.trailing}>{`• ${trailing}`}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
  score: { ...type.metaStrong, color: colors.text, marginLeft: 4 },
  meta: { ...type.meta, color: colors.textMuted, flexShrink: 1, marginLeft: 4 },
  trailing: { ...type.metaStrong, color: colors.textMuted, marginLeft: 5 },
});
