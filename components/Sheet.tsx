import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Easing,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { alpha, colors, radius, spacing, topShadow, type } from '../theme';

/**
 * Bottom sheet. Slides up over a scrim; tapping the scrim closes it.
 *
 * @param title  optional heading rendered under the grab handle
 */
export function Sheet({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
}) {
  const insets = useSafeAreaInsets();
  const slide = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(slide, {
      toValue: visible ? 1 : 0,
      duration: visible ? 260 : 180,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [visible, slide]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <Animated.View style={[styles.scrim, { opacity: slide }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="დახურვა"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.sheet,
            { paddingBottom: insets.bottom + spacing.lg },
            {
              transform: [
                {
                  translateY: slide.interpolate({
                    inputRange: [0, 1],
                    outputRange: [420, 0],
                  }),
                },
              ],
            },
          ]}
        >
          <View style={styles.handle} />
          {title ? <Text style={styles.title}>{title}</Text> : null}
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, justifyContent: 'flex-end' },
  scrim: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: alpha.scrim,
  },
  sheet: {
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingHorizontal: spacing.screen,
    paddingTop: spacing.md,
    ...topShadow,
  },
  handle: {
    alignSelf: 'center',
    width: 44,
    height: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.divider,
    marginBottom: spacing.md,
  },
  title: {
    ...type.h2,
    color: colors.text,
    marginBottom: spacing.md,
  },
});
