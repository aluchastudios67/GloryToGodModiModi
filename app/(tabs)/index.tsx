import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  LayoutAnimation,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {
  AppHeader,
  Avatar,
  DogRequestCard,
  EmptyState,
  GhostButton,
  LocationPill,
  PrimaryButton,
  Screen,
  SectionHeader,
  Sheet,
  WalkerCard,
  WalkerCardSkeleton,
} from '../../components';
import {
  DogRequest,
  currentLocation,
  dogRequests,
  gel,
  km,
} from '../../data/mock';
import { useInvalidateWalkers, useWalkers } from '../../src/api/hooks';
import { useAppStore } from '../../store/useAppStore';
import {
  alpha,
  colors,
  radius,
  sizes,
  spacing,
  type,
} from '../../theme';

export default function HomeScreen() {
  const role = useAppStore((s) => s.role);
  return role === 'owner' ? <OwnerHome /> : <WalkerHome />;
}

/* ------------------------------------------------------------------ owner */

function OwnerHome() {
  const { data, isPending, isError, refetch } = useWalkers();
  const invalidate = useInvalidateWalkers();
  const walkers = data?.items ?? [];

  return (
    <Screen padded={false}>
      <FlatList
        data={walkers}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <AppHeader right={<LocationPill label={currentLocation} />} />

            <Text style={styles.headline}>
              ვინ გაასეირნებს შენს ძაღლს დღეს?
            </Text>

            <PrimaryButton
              label="გამსეირნებლის პოვნა"
              icon="search"
              onPress={() => router.push('/search')}
              style={styles.cta}
            />

            <SectionHeader
              title="ახლოს არიან"
              action="ყველა"
              onActionPress={() => router.push('/search')}
            />

            {/* Skeletons, never a spinner on a blank screen. */}
            {isPending ? (
              <View>
                <WalkerCardSkeleton />
                <WalkerCardSkeleton />
                <WalkerCardSkeleton />
              </View>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          isPending ? null : isError ? (
            <EmptyState
              tone="error"
              icon="wifi-off"
              title="ვერ ჩაიტვირთა"
              body="შეამოწმე ინტერნეტი და სცადე ხელახლა."
              actionLabel="ხელახლა ცდა"
              onAction={() => void refetch()}
            />
          ) : (
            <EmptyState
              icon="search"
              title="ახლოს გამსეირნებელი არ არის"
              body="სცადე ძებნა სხვა ფილტრებით."
              actionLabel="ძებნა"
              onAction={() => {
                void invalidate();
                router.push('/search');
              }}
            />
          )
        }
        renderItem={({ item }) => (
          <WalkerCard
            walker={item}
            onPress={() => router.push(`/booking/${item.id}`)}
          />
        )}
      />
    </Screen>
  );
}

/* ----------------------------------------------------------------- walker */

function WalkerHome() {
  const isAvailable = useAppStore((s) => s.isAvailable);
  const setAvailable = useAppStore((s) => s.setAvailable);
  const showToast = useAppStore((s) => s.showToast);
  const declinedIds = useAppStore((s) => s.declinedRequestIds);
  const acceptedIds = useAppStore((s) => s.acceptedRequestIds);
  const acceptRequest = useAppStore((s) => s.acceptRequest);
  const declineRequest = useAppStore((s) => s.declineRequest);

  const [selected, setSelected] = useState<DogRequest | null>(null);

  const visible = useMemo(() => {
    const handled = new Set([...declinedIds, ...acceptedIds]);
    return dogRequests
      .filter((r) => !handled.has(r.id))
      // Going online means you want a walk right now — show only those.
      .filter((r) => (isAvailable ? r.when.kind === 'now' : true));
  }, [declinedIds, acceptedIds, isAvailable]);

  const toggleAvailability = (next: boolean) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    setAvailable(next);
    showToast(
      next ? 'ახლა თავისუფალი ხარ' : 'სტატუსი: დაკავებული',
      next ? 'success' : 'neutral'
    );
  };

  const onAccept = () => {
    if (!selected) return;
    acceptRequest(selected);
    setSelected(null);
    showToast(`${selected.dog.name} შენია — იხილე ჯავშნებში`, 'success');
  };

  const onDecline = () => {
    if (!selected) return;
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    declineRequest(selected.id);
    setSelected(null);
  };

  return (
    <Screen padded={false}>
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View>
            <AppHeader right={<LocationPill label={currentLocation} />} />

            <Text style={styles.headline}>
              ვინ ელოდება სეირნობას შენს გვერდით?
            </Text>

            <AvailabilityBar
              value={isAvailable}
              onChange={toggleAvailability}
            />

            <SectionHeader
              title="ელოდებიან სეირნობას"
              action="ფილტრი"
              onActionPress={() =>
                showToast('ფილტრები დემოში გამორთულია', 'neutral')
              }
            />
          </View>
        }
        ListEmptyComponent={
          <EmptyState
            icon="coffee"
            title="ახლა მოთხოვნები არ არის"
            body={
              isAvailable
                ? 'როგორც კი ახლოს ძაღლს სეირნობა დასჭირდება, შეტყობინებას მიიღებ.'
                : 'გახდი თავისუფალი, რომ სასწრაფო მოთხოვნები დაინახო.'
            }
            actionLabel={isAvailable ? undefined : 'ახლა თავისუფალი ვარ'}
            onAction={() => toggleAvailability(true)}
          />
        }
        renderItem={({ item }) => (
          <DogRequestCard request={item} onPress={() => setSelected(item)} />
        )}
      />

      <Sheet
        visible={selected !== null}
        onClose={() => setSelected(null)}
        title="სეირნობის მოთხოვნა"
      >
        {selected ? (
          <View>
            <View style={styles.sheetRow}>
              <Avatar source={selected.dog.photo} size={64} square />
              <View style={styles.sheetText}>
                <Text style={styles.sheetName}>{selected.dog.name}</Text>
                <Text style={styles.sheetMeta}>
                  {`${selected.dog.breed} · ${selected.dog.age}`}
                </Text>
                <Text style={styles.sheetMeta}>
                  {`${selected.address} • ${km(selected.distanceKm)}`}
                </Text>
              </View>
              <Text style={styles.sheetPrice}>{gel(selected.payout)}</Text>
            </View>

            <View style={styles.sheetActions}>
              <PrimaryButton
                label="მიღება"
                icon="check"
                haptic
                height={58}
                onPress={onAccept}
                style={styles.sheetPrimary}
              />
              <GhostButton label="უარი" height={58} onPress={onDecline} />
            </View>
          </View>
        ) : null}
      </Sheet>
    </Screen>
  );
}

/* -------------------------------------------------- availability bar (teal) */

/** The walker's "I'm free now" switch. Custom pill so both platforms match. */
function AvailabilityBar({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <Pressable
      onPress={() => onChange(!value)}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel="ახლა თავისუფალი ვარ"
      style={({ pressed }) => [styles.availability, pressed && styles.dim]}
    >
      <Text style={styles.availabilityLabel}>ახლა თავისუფალი ვარ</Text>
      <View style={[styles.track, value && styles.trackOn]}>
        <View style={[styles.thumb, value && styles.thumbOn]}>
          {value ? (
            <Feather name="check" size={13} color={colors.primary} />
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: spacing.screen,
    paddingBottom: spacing.xl,
  },
  headline: { ...type.h1, color: colors.text, marginBottom: spacing.lg },
  cta: { marginBottom: spacing.xl },

  availability: {
    height: sizes.availabilityBar,
    borderRadius: radius.button,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: spacing.lg,
    paddingRight: spacing.card,
    marginBottom: spacing.xl,
  },
  dim: { opacity: 0.9 },
  availabilityLabel: { ...type.title, color: colors.card, flexShrink: 1 },
  track: {
    width: 54,
    height: 32,
    borderRadius: radius.pill,
    backgroundColor: alpha.white18,
    padding: 3,
    justifyContent: 'center',
  },
  trackOn: { backgroundColor: alpha.white32 },
  thumb: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thumbOn: { transform: [{ translateX: 22 }] },

  sheetRow: { flexDirection: 'row', alignItems: 'center' },
  sheetText: { flex: 1, marginLeft: spacing.md, marginRight: spacing.sm },
  sheetName: { ...type.title, color: colors.text },
  sheetMeta: { ...type.meta, color: colors.textMuted, marginTop: 2 },
  sheetPrice: { ...type.price, color: colors.text },
  sheetActions: { gap: spacing.md, marginTop: spacing.xl },
  sheetPrimary: {},
});
