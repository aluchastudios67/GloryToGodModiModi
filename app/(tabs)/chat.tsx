import { router } from 'expo-router';
import React from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Avatar, Card, EmptyState, Screen } from '../../components';
import { conversations } from '../../data/mock';
import { useAppStore } from '../../store/useAppStore';
import { colors, radius, spacing, type } from '../../theme';

export default function ChatListScreen() {
  const threads = useAppStore((s) => s.threads);

  return (
    <Screen padded={false}>
      <View style={styles.top}>
        <Text style={styles.title}>ჩატი</Text>
      </View>

      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <EmptyState
            icon="message-circle"
            title="მიმოწერა ცარიელია"
            body="დაჯავშნე სეირნობა და გამსეირნებელს პირდაპირ მისწერ."
            actionLabel="გამსეირნებლის პოვნა"
            onAction={() => router.push('/search')}
          />
        }
        renderItem={({ item }) => {
          const messages = threads[item.id] ?? item.messages;
          const last = messages[messages.length - 1];

          return (
            <Card
              onPress={() => router.push(`/thread/${item.id}`)}
              accessibilityLabel={`${item.name}, ${last?.text ?? ''}`}
              style={styles.card}
            >
              <View style={styles.row}>
                <Avatar source={item.photo} size={52} />
                <View style={styles.middle}>
                  <Text style={styles.name}>{item.name}</Text>
                  <Text style={styles.preview} numberOfLines={1}>
                    {last?.text ?? ''}
                  </Text>
                </View>
                <View style={styles.right}>
                  <Text style={styles.time}>{last?.time ?? item.time}</Text>
                  {item.unread > 0 ? (
                    <View style={styles.badge}>
                      <Text style={styles.badgeText}>{item.unread}</Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </Card>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  top: { paddingHorizontal: spacing.screen, paddingTop: spacing.sm },
  title: { ...type.h1, color: colors.text, marginBottom: spacing.md },
  list: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xl,
  },
  card: { marginBottom: spacing.gap },
  row: { flexDirection: 'row', alignItems: 'center' },
  middle: { flex: 1, marginLeft: spacing.md, marginRight: spacing.sm },
  name: { ...type.title, color: colors.text },
  preview: { ...type.meta, color: colors.textMuted, marginTop: 3 },
  right: { alignItems: 'flex-end', gap: 6 },
  time: { ...type.meta, color: colors.textFaint },
  badge: {
    minWidth: 22,
    height: 22,
    borderRadius: radius.pill,
    paddingHorizontal: 6,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { ...type.caption, color: colors.card },
});
