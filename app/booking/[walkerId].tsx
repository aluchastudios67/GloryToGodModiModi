import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Avatar,
  Card,
  DetailRow,
  GhostButton,
  MapPreview,
  PrimaryButton,
  Rating,
  Screen,
  SegmentedControl,
  Sheet,
  StatusDot,
  VerifiedCheck,
} from '../../components';
import {
  DURATIONS,
  Duration,
  SERVICE_FEE,
  findWalker,
  gel,
  myDogs,
  priceFor,
} from '../../data/mock';
import { useAppStore } from '../../store/useAppStore';
import {
  cardShadow,
  colors,
  hitSlop,
  pressed,
  radius,
  sizes,
  spacing,
  topShadow,
  type,
} from '../../theme';

const TIMES = ['დღეს, 17:00', 'დღეს, 18:00', 'დღეს, 19:00', 'ხვალ, 09:00', 'ხვალ, 18:00'];

type Picker = 'time' | 'duration' | 'address' | null;

export default function BookingScreen() {
  const { walkerId } = useLocalSearchParams<{ walkerId: string }>();
  const insets = useSafeAreaInsets();
  const addBooking = useAppStore((s) => s.addBooking);

  const walker = findWalker(walkerId);
  const dog = myDogs[0];

  const [when, setWhen] = useState('დღეს, 18:00');
  const [duration, setDuration] = useState<Duration>(30);
  const [address, setAddress] = useState('ვაკე, აბაშიძის 12');
  const [addressDraft, setAddressDraft] = useState(address);
  const [picker, setPicker] = useState<Picker>(null);
  const [submitting, setSubmitting] = useState(false);

  const walkPrice = useMemo(
    () => (walker ? priceFor(walker.price30, duration) : 0),
    [walker, duration]
  );
  const total = walkPrice + SERVICE_FEE;

  // Deep-linking straight to a removed walker shouldn't blow up the demo.
  if (!walker) {
    return (
      <Screen>
        <BookingHeader />
        <Text style={styles.missing}>გამსეირნებელი ვერ მოიძებნა.</Text>
        <GhostButton
          label="უკან დაბრუნება"
          tone="brand"
          onPress={() => router.back()}
        />
      </Screen>
    );
  }

  const confirm = () => {
    setSubmitting(true);
    // Stands in for the request the real app would send.
    setTimeout(() => {
      const id = `b${Date.now()}`;
      addBooking({
        id,
        dog,
        walkerId: walker.id,
        walkerName: walker.name,
        walkerPhoto: walker.photo,
        when,
        durationMin: duration,
        total,
        status: 'upcoming',
        address,
      });
      setSubmitting(false);
      router.replace({
        pathname: '/booking/success',
        params: { bookingId: id, name: walker.name, when },
      });
    }, 900);
  };

  return (
    <Screen padded={false} edges={['top']}>
      <View style={styles.headerWrap}>
        <BookingHeader />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: sizes.bottomCta + insets.bottom + spacing.xl * 2 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* 1 — the dog */}
        <Card style={styles.block}>
          <View style={styles.row}>
            <Avatar source={dog.photo} size={sizes.bookingDogPhoto} square />
            <View style={styles.rowText}>
              <Text style={styles.dogName}>{dog.name}</Text>
              <Text style={styles.muted}>{`${dog.breed} · ${dog.age}`}</Text>
            </View>
          </View>
        </Card>

        {/* 2 — the walker */}
        <Card style={styles.block}>
          <View style={styles.row}>
            <Avatar
              source={walker.photo}
              size={sizes.bookingAvatar}
              status={walker.availability.kind === 'now' ? 'online' : 'scheduled'}
            />
            <View style={styles.rowText}>
              <View style={styles.nameRow}>
                <Text style={styles.walkerName} numberOfLines={1}>
                  {walker.name}
                </Text>
                {walker.verified ? <VerifiedCheck /> : null}
              </View>
              <Rating rating={walker.rating} reviews={walker.reviews} />
            </View>
            <Pressable
              onPress={() => router.replace('/search')}
              hitSlop={hitSlop}
              accessibilityRole="button"
              accessibilityLabel="შეცვლა"
              style={({ pressed: p }) => pressed(p)}
            >
              <Text style={styles.change}>შეცვლა</Text>
            </Pressable>
          </View>
        </Card>

        {/* 3 — the details */}
        <Card style={styles.block}>
          <DetailRow icon="clock" value={when} onPress={() => setPicker('time')} />
          <DetailRow
            icon="activity"
            value={`${duration} წუთი`}
            divider
            onPress={() => setPicker('duration')}
          />
          <DetailRow
            icon="map-pin"
            value={address}
            divider
            onPress={() => {
              setAddressDraft(address);
              setPicker('address');
            }}
          />
        </Card>

        {/* 4 — where the walk goes */}
        <Card flush style={styles.block}>
          <MapPreview height={sizes.mapPreview} />
          <View style={styles.mapBar}>
            <StatusDot variant="online" size={sizes.inlineDot} />
            <Text style={styles.mapBarText}>სეირნობას რუკაზე გაჰყვები</Text>
          </View>
        </Card>

        {/* 5 — the money */}
        <Card style={styles.block}>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>სეირნობა</Text>
            <Text style={styles.priceValue}>{gel(walkPrice)}</Text>
          </View>
          <View style={styles.priceRow}>
            <Text style={styles.priceLabel}>სერვისის საფასური</Text>
            <Text style={styles.priceValue}>{gel(SERVICE_FEE)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>სულ:</Text>
            <Text style={styles.totalValue}>{gel(total)}</Text>
          </View>
        </Card>
      </ScrollView>

      {/* 6 — pinned CTA */}
      <View style={[styles.ctaBar, { paddingBottom: insets.bottom + spacing.md }]}>
        <PrimaryButton
          label={`დაჯავშნე · ${gel(total)}`}
          height={sizes.bottomCta}
          loading={submitting}
          haptic
          onPress={confirm}
        />
      </View>

      <Sheet
        visible={picker !== null}
        onClose={() => setPicker(null)}
        title={
          picker === 'time'
            ? 'როდის?'
            : picker === 'duration'
              ? 'რამდენ ხანს?'
              : 'სად?'
        }
      >
        {picker === 'time' ? (
          <View style={styles.optionList}>
            {TIMES.map((option) => {
              const active = option === when;
              return (
                <Pressable
                  key={option}
                  onPress={() => {
                    setWhen(option);
                    setPicker(null);
                  }}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  style={({ pressed: p }) => [
                    styles.option,
                    active && styles.optionActive,
                    pressed(p),
                  ]}
                >
                  <Text style={[styles.optionText, active && styles.optionTextActive]}>
                    {option}
                  </Text>
                  {active ? (
                    <Feather name="check" size={18} color={colors.primary} />
                  ) : null}
                </Pressable>
              );
            })}
          </View>
        ) : null}

        {picker === 'duration' ? (
          <View>
            <SegmentedControl
              segments={DURATIONS.map((d) => ({
                value: String(d) as `${Duration}`,
                label: `${d} წთ`,
              }))}
              value={String(duration) as `${Duration}`}
              onChange={(next) => setDuration(Number(next) as Duration)}
            />
            <Text style={styles.sheetHint}>
              {`${duration} წუთი · ${gel(priceFor(walker.price30, duration))}`}
            </Text>
            <PrimaryButton
              label="დადასტურება"
              height={56}
              onPress={() => setPicker(null)}
              style={styles.sheetConfirm}
            />
          </View>
        ) : null}

        {picker === 'address' ? (
          <View>
            <TextInput
              value={addressDraft}
              onChangeText={setAddressDraft}
              placeholder="უბანი, ქუჩა და ნომერი"
              placeholderTextColor={colors.textFaint}
              style={styles.input}
              autoCorrect={false}
              returnKeyType="done"
              onSubmitEditing={() => {
                setAddress(addressDraft.trim() || address);
                setPicker(null);
              }}
            />
            <PrimaryButton
              label="შენახვა"
              height={56}
              onPress={() => {
                setAddress(addressDraft.trim() || address);
                setPicker(null);
              }}
              style={styles.sheetConfirm}
            />
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

/** Back chevron in a white circle + the screen title. */
function BookingHeader() {
  return (
    <View style={styles.header}>
      <Pressable
        onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
        hitSlop={hitSlop}
        accessibilityRole="button"
        accessibilityLabel="უკან"
        style={({ pressed: p }) => [styles.backCircle, pressed(p)]}
      >
        <Feather name="chevron-left" size={22} color={colors.text} />
      </Pressable>
      <Text style={styles.headerTitle}>სეირნობის მოთხოვნა</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrap: { paddingHorizontal: spacing.screen },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  backCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  headerTitle: { ...type.h2, color: colors.text, flexShrink: 1 },
  missing: {
    ...type.body,
    color: colors.textMuted,
    marginBottom: spacing.lg,
  },

  scroll: { paddingHorizontal: spacing.screen },
  block: { marginBottom: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowText: { flex: 1, marginLeft: spacing.card, marginRight: spacing.sm },
  dogName: { ...type.h2, color: colors.text },
  muted: { ...type.body, color: colors.textMuted, marginTop: 2 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 5, marginBottom: 3 },
  walkerName: { ...type.title, color: colors.text, flexShrink: 1 },
  change: { ...type.body, color: colors.primary },

  mapBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: colors.card,
    paddingHorizontal: spacing.card,
    paddingVertical: spacing.md,
  },
  mapBarText: { ...type.metaStrong, color: colors.text },

  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  priceLabel: { ...type.body, color: colors.textMuted },
  priceValue: { ...type.body, color: colors.text },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: colors.divider,
    marginTop: spacing.md,
    paddingTop: spacing.md,
  },
  totalLabel: { ...type.title, color: colors.text },
  totalValue: { ...type.priceLarge, color: colors.text },

  ctaBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
    ...topShadow,
  },

  optionList: { gap: spacing.sm },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 52,
    paddingHorizontal: spacing.card,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  optionActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  optionText: { ...type.body, color: colors.text },
  optionTextActive: { color: colors.primaryDark },
  sheetHint: {
    ...type.body,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing.lg,
  },
  sheetConfirm: { marginTop: spacing.lg },
  input: {
    ...type.body,
    color: colors.text,
    minHeight: 56,
    paddingHorizontal: spacing.card,
    borderRadius: radius.button,
    borderWidth: 1,
    borderColor: colors.divider,
    backgroundColor: colors.bg,
  },
});
