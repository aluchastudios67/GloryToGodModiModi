import {
  NotoSansGeorgian_400Regular,
  NotoSansGeorgian_500Medium,
  NotoSansGeorgian_600SemiBold,
  NotoSansGeorgian_700Bold,
  NotoSansGeorgian_800ExtraBold,
  useFonts,
} from '@expo-google-fonts/noto-sans-georgian';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback } from 'react';
import { LogBox, Platform, UIManager, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Toast } from '../components';
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

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    NotoSansGeorgian_400Regular,
    NotoSansGeorgian_500Medium,
    NotoSansGeorgian_600SemiBold,
    NotoSansGeorgian_700Bold,
    NotoSansGeorgian_800ExtraBold,
  });

  const onLayout = useCallback(() => {
    // Hide the splash only once Georgian glyphs are ready — no flash of tofu.
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) return null;

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1, backgroundColor: colors.bg }} onLayout={onLayout}>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.bg },
            animation: 'slide_from_right',
          }}
        >
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
        <Toast />
      </View>
    </SafeAreaProvider>
  );
}
