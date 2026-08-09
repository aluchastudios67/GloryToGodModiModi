import { Feather } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Avatar, Screen } from '../../components';
import { conversations } from '../../data/mock';
import { useAppStore } from '../../store/useAppStore';
import {
  cardShadow,
  colors,
  hitSlop,
  pressed,
  radius,
  spacing,
  type,
} from '../../theme';

/** One conversation. Sending appends locally — nothing leaves the device. */
export default function ThreadScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const listRef = useRef<FlatList>(null);

  const conversation =
    conversations.find((c) => c.id === id) ?? conversations[0];
  const messages = useAppStore((s) => s.threads[conversation.id]) ?? [];
  const sendMessage = useAppStore((s) => s.sendMessage);

  const [draft, setDraft] = useState('');

  const send = () => {
    if (!draft.trim()) return;
    sendMessage(conversation.id, draft);
    setDraft('');
    requestAnimationFrame(() =>
      listRef.current?.scrollToEnd({ animated: true })
    );
  };

  return (
    <Screen padded={false} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/chat'))}
          hitSlop={hitSlop}
          accessibilityRole="button"
          accessibilityLabel="უკან"
          style={({ pressed: p }) => [styles.back, pressed(p)]}
        >
          <Feather name="chevron-left" size={22} color={colors.text} />
        </Pressable>
        <Avatar source={conversation.photo} size={38} />
        <Text style={styles.name} numberOfLines={1}>
          {conversation.name}
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={insets.top + 8}
      >
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messages}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          onContentSizeChange={() =>
            listRef.current?.scrollToEnd({ animated: false })
          }
          renderItem={({ item }) => {
            const mine = item.from === 'me';
            return (
              <View style={[styles.bubbleRow, mine && styles.bubbleRowMine]}>
                <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                  <Text style={mine ? styles.textMine : styles.textTheirs}>
                    {item.text}
                  </Text>
                  <Text style={mine ? styles.timeMine : styles.timeTheirs}>
                    {item.time}
                  </Text>
                </View>
              </View>
            );
          }}
        />

        <View style={[styles.composer, { paddingBottom: insets.bottom + spacing.md }]}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="დაწერე შეტყობინება"
            placeholderTextColor={colors.textFaint}
            style={styles.input}
            multiline
            accessibilityLabel="შეტყობინების ველი"
            onSubmitEditing={send}
          />
          <Pressable
            onPress={send}
            disabled={!draft.trim()}
            accessibilityRole="button"
            accessibilityLabel="გაგზავნა"
            style={({ pressed: p }) => [
              styles.send,
              !draft.trim() && styles.sendDisabled,
              pressed(p),
            ]}
          >
            <Feather name="arrow-up" size={20} color={colors.card} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  back: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.card,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  name: { ...type.title, color: colors.text, flexShrink: 1 },

  messages: {
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    paddingBottom: spacing.lg,
    gap: spacing.sm,
  },
  bubbleRow: { flexDirection: 'row', justifyContent: 'flex-start' },
  bubbleRowMine: { justifyContent: 'flex-end' },
  bubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.card,
  },
  mine: { backgroundColor: colors.primary, borderBottomRightRadius: 8 },
  theirs: {
    backgroundColor: colors.card,
    borderBottomLeftRadius: 8,
    ...cardShadow,
  },
  textMine: { ...type.body, color: colors.card },
  textTheirs: { ...type.body, color: colors.text },
  timeMine: {
    ...type.priceUnit,
    color: colors.primarySoft,
    marginTop: 3,
    textAlign: 'right',
  },
  timeTheirs: { ...type.priceUnit, color: colors.textFaint, marginTop: 3 },

  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: spacing.sm,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    backgroundColor: colors.bg,
    borderTopWidth: 1,
    borderTopColor: colors.divider,
  },
  input: {
    ...type.body,
    color: colors.text,
    flex: 1,
    minHeight: 48,
    maxHeight: 120,
    paddingHorizontal: spacing.card,
    paddingTop: 13,
    paddingBottom: 13,
    borderRadius: radius.button,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.divider,
  },
  send: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendDisabled: { opacity: 0.4 },
});
