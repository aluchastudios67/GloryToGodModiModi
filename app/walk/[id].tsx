import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Avatar,
  Card,
  GhostButton,
  MapPreview,
  PrimaryButton,
  Screen,
} from '../../components';
import { PHOTOS, km } from '../../data/mock';
import { useAppStore } from '../../store/useAppStore';
import {
  cardShadow,
  colors,
  hitSlop,
  pressed,
  radius,
  spacing,
  topShadow,
  type,
} from '../../theme';

/** The walk plays out over this many real seconds. */
const WALK_SECONDS = 16;
/** …and reads as this many minutes on screen. */
const WALK_MINUTES = 32;
const WALK_DISTANCE_KM = 2.1;

const STAGES = [
  { key: 'start', label: 'დაიწყო', at: 0 },
  { key: 'active', label: 'მიმდინარეობს', at: 0.06 },
  { key: 'done', label: 'დასრულდა', at: 0.999 },
] as const;

export default function WalkScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  const bookings = useAppStore((s) => s.bookings);
  const completeBooking = useAppStore((s) => s.completeBooking);
  const rateWalk = useAppStore((s) => s.rateWalk);
  const ratings = useAppStore((s) => s.ratings);

  const booking = useMemo(
    () => bookings.find((b) => b.id === id) ?? bookings[0],
    [bookings, id]
  );

  const progress = useRef(new Animated.Value(0)).current;
  const [ratio, setRatio] = useState(0);

  useEffect(() => {
    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: WALK_SECONDS * 1000,
      easing: Easing.inOut(Easing.quad),
      // The map dot rides the native driver; the stats read the JS listener.
      useNativeDriver: true,
    });
    animation.start();
    const listener = progress.addListener(({ value }) => setRatio(value));
    return () => {
      animation.stop();
      progress.removeListener(listener);
    };
  }, [progress]);

  const finished = ratio >= 0.999;
  const bookingId = booking?.id;

  // Depend on the id, not the booking object: the object is replaced whenever
  // the store updates, which would re-fire this on every render.
  useEffect(() => {
    if (finished && bookingId) completeBooking(bookingId);
  }, [finished, bookingId, completeBooking]);

  /** Demo shortcut: tap the stats card to jump to the end of the walk. */
  const skipToEnd = () => {
    progress.stopAnimation();
    Animated.timing(progress, {
      toValue: 1,
      duration: 450,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  if (!booking) {
    return (
      <Screen>
        <Text style={styles.missing}>სეირნობა ვერ მოიძებნა.</Text>
        <GhostButton label="ჯავშნები" tone="brand" onPress={() => router.replace('/bookings')} />
      </Screen>
    );
  }

  const minutes = Math.round(ratio * WALK_MINUTES);
  const distance = ratio * WALK_DISTANCE_KM;
  const stars = ratings[booking.id] ?? 0;

  if (finished) {
    return (
      <Screen padded={false} edges={['top']}>
        <BackButton />
        <ScrollView
          contentContainerStyle={[
            styles.reportScroll,
            { paddingBottom: insets.bottom + spacing.xl },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <MapPreview
            height={150}
            pulse={false}
            rounded={radius.card}
            style={styles.reportMap}
          />

          <Card style={styles.reportCard}>
            <View style={styles.walkerRow}>
              <Avatar source={booking.walkerPhoto} size={46} />
              <View style={styles.walkerText}>
                <Text style={styles.walkerName}>{booking.walkerName}</Text>
                <Text style={styles.caption}>
                  {`სეირნობა დასრულდა · ${WALK_MINUTES} წუთი`}
                </Text>
              </View>
            </View>

            <View style={styles.photoGrid}>
              <Image source={{ uri: PHOTOS.report1 }} style={styles.photoWide} />
              <View style={styles.photoRow}>
                <Image source={{ uri: PHOTOS.report2 }} style={styles.photoHalf} />
                <Image source={{ uri: PHOTOS.report3 }} style={styles.photoHalf} />
              </View>
            </View>

            <Text style={styles.rateLabel}>როგორ იყო სეირნობა?</Text>
            <View style={styles.starRow}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Pressable
                  key={value}
                  onPress={() => rateWalk(booking.id, value)}
                  hitSlop={hitSlop}
                  accessibilityRole="button"
                  accessibilityLabel={`${value} ვარსკვლავი`}
                  style={({ pressed: p }) => pressed(p)}
                >
                  <Feather
                    name="star"
                    size={32}
                    color={value <= stars ? colors.yellow : colors.textFaint}
                  />
                </Pressable>
              ))}
            </View>
          </Card>

          <PrimaryButton
            label="მადლობა, დასრულდა"
            onPress={() => router.replace('/bookings')}
            style={styles.reportCta}
          />
        </ScrollView>
      </Screen>
    );
  }

  return (
    <Screen padded={false} edges={['top']}>
      <View style={styles.mapWrap}>
        <MapPreview fill progress={progress} />
        <BackButton floating />
      </View>

      <View style={[styles.panel, { paddingBottom: insets.bottom + spacing.lg }]}>
        <View style={styles.walkerRow}>
          <Avatar source={booking.walkerPhoto} size={46} status="online" />
          <View style={styles.walkerText}>
            <Text style={styles.walkerName}>{booking.walkerName}</Text>
            <Text style={styles.caption}>
              {`${booking.dog.name} · ${booking.durationMin} წუთი`}
            </Text>
          </View>
          <GhostButton
            label="ჩატი"
            icon="message-circle"
            height={44}
            tone="brand"
            onPress={() => router.push('/thread/c1')}
          />
        </View>

        <Pressable
          onPress={skipToEnd}
          accessibilityRole="button"
          accessibilityLabel="სეირნობის სტატისტიკა"
          style={({ pressed: p }) => [styles.stats, pressed(p)]}
        >
          <View style={styles.stat}>
            <Text style={styles.statValue}>{`${minutes} წთ`}</Text>
            <Text style={styles.statLabel}>გასული დრო</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.stat}>
            <Text style={styles.statValue}>{km(distance)}</Text>
            <Text style={styles.statLabel}>გავლილი მანძილი</Text>
          </View>
        </Pressable>

        <View style={styles.chips}>
          {STAGES.map((stage) => {
            const active = ratio >= stage.at;
            return (
              <View
                key={stage.key}
                style={[styles.chip, active && styles.chipActive]}
              >
                {active ? (
                  <Feather name="check" size={12} color={colors.card} />
                ) : null}
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {stage.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    </Screen>
  );
}

function BackButton({ floating = false }: { floating?: boolean }) {
  return (
    <Pressable
      onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
      hitSlop={hitSlop}
      accessibilityRole="button"
      accessibilityLabel="უკან"
      style={({ pressed: p }) => [
        styles.back,
        floating ? styles.backFloating : styles.backInline,
        pressed(p),
      ]}
    >
      <Feather name="chevron-left" size={22} color={colors.text} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  missing: { ...type.body, color: colors.textMuted, marginBottom: spacing.lg },

  mapWrap: { flex: 6 },

  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  backFloating: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.screen,
  },
  backInline: { marginLeft: spacing.screen, marginTop: spacing.sm },

  panel: {
    flex: 4,
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.card + 6,
    borderTopRightRadius: radius.card + 6,
    marginTop: -radius.card,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.lg,
    // Walker row, stats and chips spread across the panel rather than
    // stacking at the top and leaving a dead band underneath.
    justifyContent: 'space-between',
    ...topShadow,
  },
  walkerRow: { flexDirection: 'row', alignItems: 'center' },
  walkerText: { flex: 1, marginLeft: spacing.md, marginRight: spacing.sm },
  walkerName: { ...type.title, color: colors.text },
  caption: { ...type.meta, color: colors.textMuted, marginTop: 2 },

  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.bg,
    borderRadius: radius.card,
    paddingVertical: spacing.card,
    marginVertical: spacing.md,
  },
  stat: { flex: 1, alignItems: 'center' },
  statValue: { ...type.h2, color: colors.text },
  statLabel: { ...type.meta, color: colors.textMuted, marginTop: 2 },
  statDivider: { width: 1, height: 34, backgroundColor: colors.divider },

  chips: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  // Sized to their label, not flex:1 — "მიმდინარეობს" is far longer than the
  // other two and an equal split would overflow it.
  chip: {
    flexShrink: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    minHeight: 38,
    borderRadius: radius.pill,
    backgroundColor: colors.primarySoft,
    paddingHorizontal: spacing.md,
  },
  chipActive: { backgroundColor: colors.primary },
  chipText: { ...type.caption, color: colors.primaryDark, flexShrink: 1 },
  chipTextActive: { color: colors.card },

  reportScroll: { paddingHorizontal: spacing.screen, paddingTop: spacing.md },
  reportMap: { marginBottom: spacing.md },
  reportCard: { marginBottom: spacing.lg },
  photoGrid: { marginTop: spacing.card, gap: spacing.sm },
  photoWide: {
    width: '100%',
    height: 168,
    borderRadius: radius.thumb,
    backgroundColor: colors.primarySoft,
  },
  photoRow: { flexDirection: 'row', gap: spacing.sm },
  photoHalf: {
    flex: 1,
    height: 108,
    borderRadius: radius.thumb,
    backgroundColor: colors.primarySoft,
  },
  rateLabel: {
    ...type.title,
    color: colors.text,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  starRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginTop: spacing.md,
  },
  reportCta: { marginBottom: spacing.md },
});
