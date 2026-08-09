import { Stack } from 'expo-router';
import React from 'react';
import { colors } from '../../theme';

/** Sign-in and sign-up. No tab bar — there is nothing to navigate to yet. */
export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'fade',
      }}
    />
  );
}
