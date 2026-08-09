import { Feather } from '@expo/vector-icons';
import { Tabs } from 'expo-router';
import React from 'react';
import { ColorValue, Platform, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, type } from '../../theme';

/** Active labels step up from w500 to w600 — hence the custom renderer. */
const label =
  (text: string) =>
  ({ focused, color }: { focused: boolean; color: ColorValue }) => (
    <Text
      // The height is pinned: the tab bar otherwise shrinks the box and
      // clips the descenders on ჯავშნები / პროფილი.
      style={[focused ? type.tabActive : type.tab, { color, height: 16, marginTop: 2 }]}
      numberOfLines={1}
      allowFontScaling={false}
    >
      {text}
    </Text>
  );

/** Five tabs, Georgian labels, teal when active. */
export default function TabsLayout() {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, Platform.OS === 'android' ? 10 : 0);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textFaint,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopWidth: 1,
          borderTopColor: colors.divider,
          height: 62 + bottom,
          paddingBottom: bottom,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarItemStyle: { paddingVertical: 0 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'მთავარი',
          tabBarLabel: label('მთავარი'),
          tabBarIcon: ({ color }) => (
            <Feather name="home" size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'ძებნა',
          tabBarLabel: label('ძებნა'),
          tabBarIcon: ({ color }) => (
            <Feather name="search" size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'ჯავშნები',
          tabBarLabel: label('ჯავშნები'),
          tabBarIcon: ({ color }) => (
            <Feather name="calendar" size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'ჩატი',
          tabBarLabel: label('ჩატი'),
          tabBarIcon: ({ color }) => (
            <Feather name="message-circle" size={21} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'პროფილი',
          tabBarLabel: label('პროფილი'),
          tabBarIcon: ({ color }) => (
            <Feather name="user" size={21} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
