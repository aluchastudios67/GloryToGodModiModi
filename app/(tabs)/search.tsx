import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  FlatList,
  LayoutAnimation,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  Chip,
  EmptyState,
  Screen,
  WalkerCard,
  WalkerCardSkeleton,
} from '../../components';
import {
  WalkerFilters,
  useDebounced,
  useWalkers,
} from '../../src/api/hooks';
import { colors, radius, spacing, type } from '../../theme';

type FilterKey = 'free' | 'cheap' | 'vake' | 'verified';

/**
 * The chips map one-to-one onto `GET /walkers` query parameters.
 *
 * The demo's "1 კმ-ში" chip is gone and a district chip stands in its place:
 * distance needs coordinates, the database has none yet, and a chip that
 * silently does nothing is worse than one that is honest about what it filters.
 * See DEFERRED.md.
 */
const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'free', label: 'ახლა თავისუფალი' },
  { key: 'cheap', label: '₾15-მდე' },
  { key: 'vake', label: 'ვაკეში' },
  { key: 'verified', label: 'დადასტურებული' },
];

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<FilterKey[]>([]);

  // Debounces the query *key*, so re-typing a previous search is served from
  // cache instead of refetching. Same 250 ms feel as before.
  const debouncedQuery = useDebounced(query, 250);

  const filters = useMemo<WalkerFilters>(
    () => ({
      q: debouncedQuery.trim() || undefined,
      availableNow: active.includes('free') || undefined,
      maxPrice30Tetri: active.includes('cheap') ? 1500 : undefined,
      district: active.includes('vake') ? 'ვაკე' : undefined,
      verified: active.includes('verified') || undefined,
    }),
    [debouncedQuery, active],
  );

  const { data, isPending, isError, isFetching, refetch } = useWalkers(filters);
  const results = data?.items ?? [];

  const toggle = (key: FilterKey) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActive((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  };

  const reset = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActive([]);
    setQuery('');
  };

  // Only the first load shows skeletons; a refetch keeps the old list visible
  // so the screen does not blink on every keystroke.
  const showSkeletons = isPending || (isFetching && results.length === 0);

  return (
    <Screen padded={false}>
      <View style={styles.top}>
        <View style={styles.searchBox}>
          <Feather name="search" size={18} color={colors.textFaint} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="მოძებნე გამსეირნებელი ან უბანი"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="ძებნა"
          />
          {query.length > 0 ? (
            <Feather
              name="x"
              size={18}
              color={colors.textFaint}
              onPress={() => setQuery('')}
              suppressHighlighting
            />
          ) : null}
        </View>

        <View style={styles.chips}>
          {FILTERS.map((filter) => (
            <Chip
              key={filter.key}
              label={filter.label}
              selected={active.includes(filter.key)}
              onPress={() => toggle(filter.key)}
            />
          ))}
        </View>
      </View>

      {showSkeletons ? (
        <View style={styles.list}>
          <WalkerCardSkeleton />
          <WalkerCardSkeleton />
          <WalkerCardSkeleton />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            results.length > 0 ? (
              <Text style={styles.count}>
                {`${results.length} გამსეირნებელი`}
              </Text>
            ) : null
          }
          ListEmptyComponent={
            isError ? (
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
                title="ვერაფერი მოიძებნა"
                body="სცადე სხვა ფილტრი ან სხვა უბანი."
                actionLabel="ფილტრების გასუფთავება"
                onAction={reset}
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
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: spacing.screen, paddingTop: spacing.md },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 54,
    paddingHorizontal: spacing.card,
    borderRadius: radius.button,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  input: { ...type.body, color: colors.text, flex: 1, paddingVertical: 0 },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  list: { paddingHorizontal: spacing.screen, paddingBottom: spacing.xl },
  count: { ...type.meta, color: colors.textMuted, marginBottom: spacing.md },
});
