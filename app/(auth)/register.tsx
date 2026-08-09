import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Logo, PrimaryButton, Screen, TextField } from '../../components';
import { messageFor } from '../../src/api/error-messages';
import { useAuthStore } from '../../store/useAuthStore';
import { colors, hitSlop, pressed, spacing, type } from '../../theme';

export default function RegisterScreen() {
  const signUp = useAuthStore((s) => s.signUp);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (busy) return;
    setError(null);

    if (!name.trim() || !email.trim() || !password) {
      setError('შეავსე ყველა ველი');
      return;
    }

    setBusy(true);
    try {
      await signUp({ name: name.trim(), email: email.trim(), password });
      // The root layout notices `status: authed` and redirects; navigating here
      // too would race it.
    } catch (caught) {
      setError(messageFor(caught));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.brand}>
            <Logo size={56} />
            <Text style={styles.wordmark}>ModiModi</Text>
          </View>

          <Text style={styles.title}>შექმენი ანგარიში</Text>
          <Text style={styles.subtitle}>
            ერთი ანგარიში — შეგიძლია დაჯავშნო სეირნობა და თვითონაც გაასეირნო.
          </Text>

          <TextField
            label="სახელი"
            value={name}
            onChangeText={setName}
            placeholder="ლევან ხ."
            autoCapitalize="words"
            autoCorrect={false}
            textContentType="name"
            returnKeyType="next"
          />

          <TextField
            label="ელფოსტა"
            value={email}
            onChangeText={setEmail}
            placeholder="you@example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            textContentType="emailAddress"
            returnKeyType="next"
          />

          <TextField
            label="პაროლი"
            value={password}
            onChangeText={setPassword}
            placeholder="მინიმუმ 10 სიმბოლო"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="newPassword"
            returnKeyType="go"
            onSubmitEditing={() => void submit()}
            error={error}
          />

          <PrimaryButton
            label="რეგისტრაცია"
            loading={busy}
            haptic
            onPress={() => void submit()}
            style={styles.cta}
          />

          <Pressable
            onPress={() => router.replace('/(auth)/login')}
            hitSlop={hitSlop}
            accessibilityRole="button"
            accessibilityLabel="შესვლა"
            style={({ pressed: p }) => [styles.switch, pressed(p)]}
          >
            <Text style={styles.switchText}>
              უკვე გაქვს ანგარიში?{' '}
              <Text style={styles.switchLink}>შედი</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { flexGrow: 1, justifyContent: 'center', paddingVertical: spacing.xl },
  brand: { alignItems: 'center', marginBottom: spacing.xl },
  wordmark: {
    ...type.h2,
    color: colors.text,
    marginTop: spacing.md,
    letterSpacing: -0.2,
  },
  title: { ...type.h1, color: colors.text, marginBottom: spacing.sm },
  subtitle: {
    ...type.body,
    color: colors.textMuted,
    marginBottom: spacing.xl,
  },
  cta: { marginTop: spacing.sm },
  switch: { alignItems: 'center', paddingVertical: spacing.lg },
  switchText: { ...type.body, color: colors.textMuted },
  switchLink: { color: colors.primary },
});
