import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Avatar,
  Card,
  Chip,
  DetailRow,
  DogRequestCard,
  EmptyState,
  GhostButton,
  LocationPill,
  Logo,
  MapPreview,
  PriceTag,
  PrimaryButton,
  Rating,
  Screen,
  SecondaryButton,
  SectionHeader,
  SegmentedControl,
  Sheet,
  Skeleton,
  StatusDot,
  VerifiedCheck,
  WalkerCard,
  WalkerCardSkeleton,
} from '../components';
import { PHOTOS, dogRequests, walkers } from '../data/mock';
import { useAppStore } from '../store/useAppStore';
import { colors, hitSlop, pressed, spacing, type } from '../theme';

/**
 * Every component, once, at its real size. Not part of the product flow —
 * reachable from the version line at the bottom of the profile tab.
 * Use it to eyeball the library after a theme change.
 */
export default function KitchenSinkScreen() {
  const showToast = useAppStore((s) => s.showToast);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [segment, setSegment] = useState<'a' | 'b'>('a');
  const [chip, setChip] = useState(true);

  return (
    <Screen scroll>
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))}
          hitSlop={hitSlop}
          accessibilityRole="button"
          accessibilityLabel="უკან"
          style={({ pressed: p }) => pressed(p)}
        >
          <Feather name="chevron-left" size={24} color={colors.text} />
        </Pressable>
        <Text style={styles.h2}>კომპონენტები</Text>
      </View>

      <Group label="Logo / LocationPill">
        <View style={styles.row}>
          <Logo size={34} />
          <Logo size={48} />
          <LocationPill label="ვაკე, თბილისი" />
        </View>
      </Group>

      <Group label="Type scale">
        <Text style={type.h1}>ვინ გაასეირნებს?</Text>
        <Text style={type.h2}>სეირნობის მოთხოვნა</Text>
        <Text style={type.title}>ახლოს არიან</Text>
        <Text style={type.body}>გამსეირნებლის პოვნა</Text>
        <Text style={[type.meta, styles.muted]}>გოლდენ რეტრივერი · 5 წ.</Text>
        <Text style={[type.caption, styles.muted]}>ახლა თავისუფალი</Text>
      </Group>

      <Group label="Buttons">
        <PrimaryButton
          label="გამსეირნებლის პოვნა"
          icon="search"
          onPress={() => showToast('PrimaryButton')}
        />
        <PrimaryButton label="იტვირთება" loading />
        <PrimaryButton label="გამორთული" disabled />
        <SecondaryButton label="მოგვიანებით" icon="clock" />
        <GhostButton label="უარი" />
        <GhostButton label="ჩატი" icon="message-circle" tone="brand" />
      </Group>

      <Group label="Avatar / StatusDot / Rating / PriceTag">
        <View style={styles.row}>
          <Avatar source={PHOTOS.nino} size={60} status="online" />
          <Avatar source={PHOTOS.davit} size={60} status="scheduled" />
          <Avatar source={PHOTOS.me} size={60} verified />
          <Avatar source={PHOTOS.bobi} size={60} square />
        </View>
        <View style={styles.row}>
          <StatusDot variant="online" />
          <StatusDot variant="scheduled" hollow />
          <VerifiedCheck />
          <Rating rating={4.9} reviews={127} trailing="0.8 კმ" />
        </View>
        <View style={styles.row}>
          <PriceTag amount={15} />
          <PriceTag amount={18} large unit={null} />
        </View>
      </Group>

      <Group label="Chip / SegmentedControl">
        <View style={styles.wrapRow}>
          <Chip label="ახლა თავისუფალი" selected={chip} onPress={() => setChip(!chip)} />
          <Chip label="₾15-მდე" />
          <Chip label="1 კმ-ში" icon="map-pin" />
        </View>
        <SegmentedControl
          segments={[
            { value: 'a', label: 'მფლობელი' },
            { value: 'b', label: 'გამსეირნებელი' },
          ]}
          value={segment}
          onChange={setSegment}
        />
      </Group>

      <Group label="SectionHeader / DetailRow">
        <SectionHeader title="ახლოს არიან" action="ყველა" />
        <Card>
          <DetailRow icon="clock" value="დღეს, 18:00" onPress={() => {}} />
          <DetailRow icon="activity" value="30 წუთი" divider onPress={() => {}} />
          <DetailRow icon="map-pin" value="ვაკე, აბაშიძის 12" divider />
        </Card>
      </Group>

      <Group label="WalkerCard / DogRequestCard">
        <WalkerCard walker={walkers[0]} onPress={() => {}} />
        <WalkerCard walker={walkers[2]} onPress={() => {}} />
        <DogRequestCard request={dogRequests[0]} onPress={() => {}} />
        <DogRequestCard request={dogRequests[3]} onPress={() => {}} />
      </Group>

      <Group label="MapPreview">
        <Card flush>
          <MapPreview />
        </Card>
      </Group>

      <Group label="Skeleton">
        <WalkerCardSkeleton />
        <Skeleton width="60%" height={14} />
      </Group>

      <Group label="Sheet / Toast">
        <PrimaryButton label="Sheet გახსნა" onPress={() => setSheetOpen(true)} />
        <GhostButton
          label="Toast ჩვენება"
          tone="brand"
          onPress={() => showToast('შენახულია', 'success')}
        />
      </Group>

      <Group label="EmptyState">
        <EmptyState
          title="ჯერ ჯავშანი არ გაქვს"
          body="იპოვე გამსეირნებელი და დაჯავშნე პირველი სეირნობა."
          actionLabel="გამსეირნებლის პოვნა"
          onAction={() => router.push('/search')}
        />
      </Group>

      <Sheet visible={sheetOpen} onClose={() => setSheetOpen(false)} title="ნიმუში">
        <Text style={[type.body, styles.muted]}>
          ეს არის ქვედა ფანჯრის შიგთავსი.
        </Text>
        <PrimaryButton
          label="დახურვა"
          height={56}
          onPress={() => setSheetOpen(false)}
          style={styles.sheetButton}
        />
      </Sheet>
    </Screen>
  );
}

function Group({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.group}>
      <Text style={styles.groupLabel}>{label}</Text>
      <View style={styles.groupBody}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingBottom: spacing.lg,
  },
  h2: { ...type.h2, color: colors.text },
  group: { marginBottom: spacing.xl },
  groupLabel: {
    ...type.caption,
    color: colors.textFaint,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
  },
  groupBody: { gap: spacing.md },
  row: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm },
  muted: { color: colors.textMuted },
  sheetButton: { marginTop: spacing.lg },
});
