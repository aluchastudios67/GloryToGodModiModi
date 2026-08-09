import {
  NotoSansGeorgian_400Regular,
  NotoSansGeorgian_500Medium,
  NotoSansGeorgian_600SemiBold,
  NotoSansGeorgian_700Bold,
  NotoSansGeorgian_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/noto-sans-georgian';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useRef } from 'react';
import { LogBox, Platform, UIManager, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toast } from '../components';
import { useAuthStore } from '../store/useAuthStore';
import { colors } from '../theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

// LayoutAnimation is opt-in on old-architecture Android.
if (
  Platform.OS === 'android' &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Remote photos occasionally warn about slow decode on Android; not actionable.
LogBox.ignoreLogs(['source.uri should not be an empty string']);

/**
 * TanStack Query owns server state from Phase 3 onward. Two retries, because a
 * scale-to-zero API's first request after idle can simply time out.
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 2, staleTime: 30_000, refetchOnWindowFocus: false },
  },
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    NotoSansGeorgian_400Regular,
    NotoSansGeorgian_500Medium,
    NotoSansGeorgian_600SemiBold,
    NotoSansGeorgian_700Bold,
    NotoSansGeorgian_800ExtraBold,
  });

  const status = useAuthStore((s) => s.status);
  const restore = useAuthStore((s) => s.restore);
  const restoredRef = useRef(false);

  useEffect(() => {
    if (restoredRef.current) return;
    restoredRef.current = true;
    void restore();
  }, [restore]);

  const fontsReady = fontsLoaded || fontError !== null;
  const authReady = status !== 'loading';

  const onLayout = useCallback(() => {
    // Both gates, not just fonts: showing the tab bar for a frame before
    // bouncing to login is worse than a slightly longer splash.
    if (fontsReady && authReady) SplashScreen.hideAsync().catch(() => {});
  }, [fontsReady, authReady]);

  if (!fontsReady || !authReady) return null;

  return (
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: colors.bg }} onLayout={onLayout}>
          <StatusBar style="dark" />
          <AuthGate />
          <Toast />
        </View>
      </SafeAreaProvider>
    </QueryClientProvider>
  );
}

/**
 * Redirects between the app and the sign-in screens as `status` changes.
 *
 * Done with an effect on the resolved segments rather than by rendering one
 * tree or the other, so a sign-out from deep inside the tabs unwinds properly
 * instead of leaving a stale screen mounted.
 */
function AuthGate() {
  const status = useAuthStore((s) => s.status);
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    const inAuthGroup = segments[0] === '(auth)';

    if (status === 'anon' && !inAuthGroup) {
      router.replace('/(auth)/login');
    } else if (status === 'authed' && inAuthGroup) {
      router.replace('/');
    }
  }, [status, segments, router]);

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: colors.bg },
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="(auth)" options={{ animation: 'fade' }} />
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="booking/[walkerId]" />
      <Stack.Screen
        name="booking/success"
        options={{ animation: 'fade', gestureEnabled: false }}
      />
      <Stack.Screen name="walk/[id]" />
      <Stack.Screen name="thread/[id]" />
      <Stack.Screen name="kitchen-sink" />
    </Stack>
  );
}
