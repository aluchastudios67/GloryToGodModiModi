import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
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
import { walkers } from '../../data/mock';
import { colors, radius, spacing, type } from '../../theme';

type FilterKey = 'free' | 'cheap' | 'near' | 'verified';

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: 'free', label: 'ახლა თავისუფალი' },
  { key: 'cheap', label: '₾15-მდე' },
  { key: 'near', label: '1 კმ-ში' },
  { key: 'verified', label: 'დადასტურებული' },
];

export default function SearchScreen() {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState<FilterKey[]>([]);
  const [filtering, setFiltering] = useState(false);

  // Debounce so the list settles instead of flickering on every keystroke.
  useEffect(() => {
    if (!query) return;
    setFiltering(true);
    const timer = setTimeout(() => setFiltering(false), 250);
    return () => clearTimeout(timer);
  }, [query]);

  const results = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return walkers.filter((w) => {
      if (needle && !`${w.name} ${w.district}`.toLowerCase().includes(needle)) {
        return false;
      }
      if (active.includes('free') && w.availability.kind !== 'now') return false;
      if (active.includes('cheap') && w.price30 > 15) return false;
      if (active.includes('near') && w.distanceKm > 1) return false;
      if (active.includes('verified') && !w.verified) return false;
      return true;
    });
  }, [query, active]);

  const toggle = (key: FilterKey) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActive((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const reset = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setActive([]);
    setQuery('');
  };

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

      {filtering ? (
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
              <Text style={styles.count}>{`${results.length} გამსეირნებელი`}</Text>
            ) : null
          }
          ListEmptyComponent={
            <EmptyState
              icon="search"
              title="ვერაფერი მოიძებნა"
              body="სცადე სხვა ფილტრი ან სხვა უბანი."
              actionLabel="ფილტრების გასუფთავება"
              onAction={reset}
            />
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
