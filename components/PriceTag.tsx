import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, type } from '../theme';
import { gel } from '../data/mock';

/**
 * Right-hand price column: `₾15` over `/ 30 წთ`.
 *
 * @param unit  the line underneath; pass null for a bare amount
 */
export function PriceTag({
  amount,
  unit = '/ 30 წთ',
  large = false,
}: {
  amount: number;
  unit?: string | null;
  /** 24pt — used for the booking total. */
  large?: boolean;
}) {
  return (
    <View style={styles.column}>
      <Text style={large ? styles.amountLarge : styles.amount}>
        {gel(amount)}
      </Text>
      {unit ? <Text style={styles.unit}>{unit}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  column: { alignItems: 'flex-end' },
  amount: { ...type.price, color: colors.text },
  amountLarge: { ...type.priceLarge, color: colors.text },
  unit: { ...type.priceUnit, color: colors.textMuted, marginTop: 1 },
});
