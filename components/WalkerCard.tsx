import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { gel, km } from '../data/mock';
import type { Walker } from '../src/api/hooks';
import { colors, sizes, spacing, type } from '../theme';
import { Avatar, VerifiedCheck } from './Avatar';
import { Card } from './Card';
import { PriceTag } from './PriceTag';
import { Rating } from './Rating';
import { StatusDot } from './StatusDot';

/**
 * A walker in the owner's list. The whole card books them.
 *
 * Takes the API's `PublicWalkerDto` shape directly — generated from the server's
 * OpenAPI document — so a field rename upstream is a TypeScript error here.
 */
export function WalkerCard({
  walker,
  onPress,
}: {
  walker: Walker;
  onPress?: () => void;
}) {
  const isNow = walker.isAvailableNow;
  const statusLabel = isNow ? 'ახლა თავისუფალია' : 'ამჟამად დაკავებულია';

  // Null until location lands, so the card simply omits it rather than
  // rendering a placeholder distance nobody can trust.
  const distance =
    typeof walker.distanceKm === 'number' ? km(walker.distanceKm) : null;

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${walker.name}, ${walker.rating}`}
      style={styles.card}
    >
      <View style={styles.row}>
        <Avatar
          source={walker.avatarUrl ?? ''}
          size={sizes.walkerAvatar}
          status={isNow ? 'online' : 'scheduled'}
        />

        <View style={styles.middle}>
          <View style={styles.nameRow}>
            <Text style={styles.name} numberOfLines={1}>
              {walker.name}
            </Text>
            {walker.verified ? <VerifiedCheck /> : null}
          </View>

          {/* Wraps as a whole word on a narrow phone rather than clipping. */}
          <View style={styles.metaRow}>
            <Rating rating={walker.rating} reviews={walker.reviewCount} />
            {distance ? (
              <Text style={styles.distance}>{`• ${distance}`}</Text>
            ) : null}
          </View>

          <View style={styles.statusRow}>
            <StatusDot
              variant={isNow ? 'online' : 'scheduled'}
              size={sizes.inlineDot}
              hollow={!isNow}
            />
            <Text style={isNow ? styles.statusOnline : styles.statusLater}>
              {statusLabel}
            </Text>
          </View>
        </View>

        <PriceTag amount={Math.round(walker.price30Tetri / 100)} />
      </View>
    </Card>
  );
}

/** Exposed so screens format prices the same way the card does. */
export const walkerPrice = (tetri: number) => gel(Math.round(tetri / 100));

const styles = StyleSheet.create({
  card: { marginBottom: spacing.gap },
  row: { flexDirection: 'row', alignItems: 'center' },
  middle: { flex: 1, marginLeft: 10, marginRight: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { ...type.title, color: colors.text, flexShrink: 1 },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 3,
  },
  distance: { ...type.metaStrong, color: colors.textMuted, marginLeft: 5 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  statusOnline: { ...type.metaStrong, color: colors.onlineText },
  statusLater: { ...type.metaStrong, color: colors.textMuted },
});
