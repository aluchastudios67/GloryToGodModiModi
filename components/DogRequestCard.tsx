import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { DogRequest, km } from '../data/mock';
import { colors, sizes, spacing, type } from '../theme';
import { Avatar } from './Avatar';
import { Card } from './Card';
import { PriceTag } from './PriceTag';
import { StatusDot } from './StatusDot';

/** A dog waiting for a walk, in the walker's list. Tapping opens the accept sheet. */
export function DogRequestCard({
  request,
  onPress,
}: {
  request: DogRequest;
  onPress?: () => void;
}) {
  const { when } = request;
  const isNow = when.kind === 'now';
  const statusLabel = isNow ? 'ახლა სჭირდება' : when.label;

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${request.dog.name}, ${request.dog.breed}, ${km(request.distanceKm)}`}
      style={styles.card}
    >
      <View style={styles.row}>
        <Avatar source={request.dog.photo} size={sizes.dogThumb} square />

        <View style={styles.middle}>
          <Text style={styles.name} numberOfLines={1}>
            {request.dog.name}
          </Text>

          <View style={styles.metaRow}>
            {/* The longest breed ("გოლდენ რეტრივერი · 5 წ.") outruns the column
                on a narrow phone. It wraps as a whole word rather than taking a
                mid-word ellipsis, and the distance never splits. */}
            <Text style={styles.breed}>
              {`${request.dog.breed} · ${request.dog.ageShort}`}
            </Text>
            <Text style={styles.distance}>{`• ${km(request.distanceKm)}`}</Text>
          </View>

          <View style={styles.statusRow}>
            <StatusDot
              variant={isNow ? 'online' : 'scheduled'}
              size={sizes.inlineDot}
              hollow={!isNow}
            />
            <Text style={isNow ? styles.statusNow : styles.statusLater}>
              {statusLabel}
            </Text>
          </View>
        </View>

        <PriceTag amount={request.payout} />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: spacing.gap },
  row: { flexDirection: 'row', alignItems: 'center' },
  middle: { flex: 1, marginLeft: 10, marginRight: 4 },
  name: { ...type.title, color: colors.text },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginTop: 3,
  },
  breed: { ...type.meta, color: colors.textMuted },
  distance: {
    ...type.metaStrong,
    color: colors.textMuted,
    marginLeft: 6,
    flexShrink: 0,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
  },
  statusNow: { ...type.metaStrong, color: colors.onlineText },
  statusLater: { ...type.metaStrong, color: colors.textMuted },
});
