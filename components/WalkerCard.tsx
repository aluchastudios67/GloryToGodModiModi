import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Walker, km } from '../data/mock';
import { colors, sizes, spacing, type } from '../theme';
import { Avatar, VerifiedCheck } from './Avatar';
import { Card } from './Card';
import { PriceTag } from './PriceTag';
import { Rating } from './Rating';
import { StatusDot } from './StatusDot';

/** A walker in the owner's "ახლოს არიან" list. The whole card books them. */
export function WalkerCard({
  walker,
  onPress,
}: {
  walker: Walker;
  onPress?: () => void;
}) {
  const { availability } = walker;
  const isNow = availability.kind === 'now';
  const statusLabel = isNow ? 'ახლა თავისუფალია' : availability.label;

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${walker.name}, ${walker.rating}, ${km(walker.distanceKm)}`}
      style={styles.card}
    >
      <View style={styles.row}>
        <Avatar
          source={walker.photo}
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

          <View style={styles.metaRow}>
            <Rating rating={walker.rating} reviews={walker.reviews} />
            <Text style={styles.distance}>{`• ${km(walker.distanceKm)}`}</Text>
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

        <PriceTag amount={walker.price30} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.gap },
  row: { flexDirection: 'row', alignItems: 'center' },
  middle: { flex: 1, marginLeft: 10, marginRight: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  name: { ...type.title, color: colors.text, flexShrink: 1 },
  // Fits on one line from 390pt up. On a 375pt SE the distance drops to a
  // second line — a whole-word wrap, never a mid-word ellipsis.
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
