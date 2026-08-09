import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import {
  Avatar,
  Card,
  EmptyState,
  Screen,
  SegmentedControl,
} from '../../components';
import { Booking, gel } from '../../data/mock';
import { useAppStore } from '../../store/useAppStore';
import { colors, radius, spacing, type } from '../../theme';

type Tab = 'upcoming' | 'done';

const TABS = [
  { value: 'upcoming' as const, label: 'მომავალი' },
  { value: 'done' as const, label: 'დასრულებული' },
];

export default function BookingsScreen() {
  const bookings = useAppStore((s) => s.bookings);
  const [tab, setTab] = useState<Tab>('upcoming');

  const list = useMemo(
    () =>
      bookings.filter((b) =>
        tab === 'done' ? b.status === 'done' : b.status !== 'done'
      ),
    [bookings, tab]
  );

  return (
    <Screen padded={false}>
      <View style={styles.top}>
        <Text style={styles.title}>ჯავშნები</Text>
        <SegmentedControl segments={TABS} value={tab} onChange={setTab} />
      </View>

      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="calendar"
            title="ჯერ ჯავშანი არ გაქვს"
            body={
              tab === 'upcoming'
                ? 'იპოვე გამსეირნებელი და დაჯავშნე პირველი სეირნობა.'
                : 'დასრულებული სეირნობები აქ გამოჩნდება.'
            }
            actionLabel="გამსეირნებლის პოვნა"
            onAction={() => router.push('/search')}
          />
        }
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            onPress={() => router.push(`/walk/${item.id}`)}
          />
        )}
      />
    </Screen>
  );
}

function BookingCard({
  booking,
  onPress,
}: {
  booking: Booking;
  onPress: () => void;
}) {
  const done = booking.status === 'done';

  return (
    <Card
      onPress={onPress}
      accessibilityLabel={`${booking.dog.name}, ${booking.walkerName}, ${booking.when}`}
      style={styles.card}
    >
      <View style={styles.row}>
        <Avatar source={booking.dog.photo} size={54} square />
        <View style={styles.middle}>
          <Text style={styles.dog}>{booking.dog.name}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            {`${booking.walkerName} · ${booking.durationMin} წთ`}
          </Text>
          <Text style={styles.when}>{booking.when}</Text>
        </View>
        <View style={styles.right}>
          <View style={[styles.pill, done ? styles.pillDone : styles.pillUpcoming]}>
            <Text style={[styles.pillText, done && styles.pillTextDone]}>
              {done ? 'დასრულდა' : 'დაჯავშნილია'}
            </Text>
          </View>
          <Text style={styles.price}>{gel(booking.total)}</Text>
        </View>
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: spacing.screen, paddingTop: spacing.sm },
  title: { ...type.h1, color: colors.text, marginBottom: spacing.lg },
  list: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xl,
  },
  card: { marginBottom: spacing.gap },
  row: { flexDirection: 'row', alignItems: 'center' },
  middle: { flex: 1, marginLeft: spacing.md, marginRight: spacing.sm },
  dog: { ...type.title, color: colors.text },
  meta: { ...type.meta, color: colors.textMuted, marginTop: 2 },
  when: { ...type.metaStrong, color: colors.text, marginTop: 4 },
  right: { alignItems: 'flex-end', gap: 8 },
  pill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  pillUpcoming: { backgroundColor: colors.primarySoft },
  pillDone: { backgroundColor: colors.accentSoft },
  pillText: { ...type.caption, color: colors.primaryDark },
  // accent on accentSoft measures 2.05:1 — unreadable at 12.5pt, so the
  // done pill keeps the coral fill and takes the dark ink.
  pillTextDone: { color: colors.text },
  price: { ...type.price, color: colors.text },
});
