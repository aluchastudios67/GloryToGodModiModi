import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Avatar,
  Card,
  Screen,
  SectionHeader,
  SegmentedControl,
} from '../../components';
import { PHOTOS, myDogs } from '../../data/mock';
import { Role, useAppStore } from '../../store/useAppStore';
import { colors, pressed, spacing, type } from '../../theme';

const ROLES = [
  { value: 'owner' as const, label: 'მფლობელი' },
  { value: 'walker' as const, label: 'გამსეირნებელი' },
];

const SETTINGS: { icon: keyof typeof Feather.glyphMap; label: string }[] = [
  { icon: 'credit-card', label: 'გადახდის მეთოდები' },
  { icon: 'bell', label: 'შეტყობინებები' },
  { icon: 'help-circle', label: 'დახმარება' },
  { icon: 'log-out', label: 'გასვლა' },
];

export default function ProfileScreen() {
  const role = useAppStore((s) => s.role);
  const setRole = useAppStore((s) => s.setRole);
  const showToast = useAppStore((s) => s.showToast);

  const switchRole = (next: Role) => {
    setRole(next);
    showToast(
      next === 'owner' ? 'მფლობელის რეჟიმი' : 'გამსეირნებლის რეჟიმი',
      'success'
    );
  };

  return (
    <Screen scroll>
      <Text style={styles.title}>პროფილი</Text>

      <Card style={styles.userCard}>
        <View style={styles.userRow}>
          <Avatar source={PHOTOS.me} size={62} verified />
          <View style={styles.userText}>
            <Text style={styles.userName}>ლევან ხ.</Text>
            <Text style={styles.userMeta}>ვაკე, თბილისი</Text>
          </View>
        </View>
      </Card>

      <View style={styles.roleBlock}>
        <Text style={styles.roleLabel}>რეჟიმი</Text>
        <SegmentedControl
          segments={ROLES}
          value={role}
          onChange={switchRole}
          haptic
        />
        <Text style={styles.roleHint}>
          {role === 'owner'
            ? 'ეძებ გამსეირნებელს შენი ძაღლისთვის.'
            : 'იღებ სეირნობის მოთხოვნებს შენს უბანში.'}
        </Text>
      </View>

      <SectionHeader title="ჩემი ძაღლები" />
      {myDogs.map((dog) => (
        <Card key={dog.id} style={styles.dogCard}>
          <View style={styles.userRow}>
            <Avatar source={dog.photo} size={54} square />
            <View style={styles.userText}>
              <Text style={styles.dogName}>{dog.name}</Text>
              <Text style={styles.userMeta}>{`${dog.breed} · ${dog.age}`}</Text>
            </View>
            <Feather name="chevron-right" size={20} color={colors.textFaint} />
          </View>
        </Card>
      ))}

      <Card style={styles.settings}>
        {SETTINGS.map((item, index) => (
          <Pressable
            key={item.label}
            onPress={() => showToast('დემოში მიუწვდომელია', 'neutral')}
            accessibilityRole="button"
            accessibilityLabel={item.label}
            style={({ pressed: p }) => [
              styles.settingRow,
              index > 0 && styles.settingDivider,
              pressed(p),
            ]}
          >
            <Feather name={item.icon} size={18} color={colors.primary} />
            <Text style={styles.settingLabel}>{item.label}</Text>
            <Feather name="chevron-right" size={18} color={colors.textFaint} />
          </Pressable>
        ))}
      </Card>

      <Pressable
        onPress={() => router.push('/kitchen-sink')}
        accessibilityRole="button"
        accessibilityLabel="კომპონენტების ნიმუშები"
        style={({ pressed: p }) => [styles.devLink, pressed(p)]}
      >
        <Text style={styles.devText}>ModiModi · დემო ვერსია 1.0</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  title: { ...type.h1, color: colors.text, marginBottom: spacing.lg },
  userCard: { marginBottom: spacing.xl },
  userRow: { flexDirection: 'row', alignItems: 'center' },
  userText: { flex: 1, marginLeft: spacing.card },
  userName: { ...type.h2, color: colors.text },
  userMeta: { ...type.body, color: colors.textMuted, marginTop: 2 },

  roleBlock: { marginBottom: spacing.xl },
  roleLabel: { ...type.title, color: colors.text, marginBottom: spacing.md },
  roleHint: {
    ...type.meta,
    color: colors.textMuted,
    marginTop: spacing.md,
    textAlign: 'center',
  },

  dogCard: { marginBottom: spacing.gap },
  dogName: { ...type.title, color: colors.text },

  settings: { marginTop: spacing.md, paddingVertical: 0 },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 56,
  },
  settingDivider: { borderTopWidth: 1, borderTopColor: colors.divider },
  settingLabel: { ...type.body, color: colors.text, flex: 1 },

  devLink: { alignItems: 'center', paddingVertical: spacing.xl },
  devText: { ...type.meta, color: colors.textFaint },
});
