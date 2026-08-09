import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  Easing,
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Svg, { Circle, Line, Polyline, Rect } from 'react-native-svg';
import { colors, radius, sizes } from '../theme';

/**
 * A drawn map, not a real one.
 *
 * react-native-maps needs a native module and an API key, which would put the
 * demo behind a custom dev client. This renders the same picture with SVG so it
 * looks identical on both platforms and cannot fail to load. Everything map-ish
 * in the app goes through this file, so dropping in react-native-maps later is a
 * one-file change.
 */

/** The walk route, in 0–1 coordinates so it scales to any container. */
export const ROUTE: readonly { x: number; y: number }[] = [
  { x: 0.12, y: 0.86 },
  { x: 0.2, y: 0.71 },
  { x: 0.19, y: 0.55 },
  { x: 0.35, y: 0.5 },
  { x: 0.5, y: 0.54 },
  { x: 0.57, y: 0.36 },
  { x: 0.72, y: 0.29 },
  { x: 0.87, y: 0.19 },
];

const H_ROADS = [0.22, 0.55, 0.84];
const V_ROADS = [0.19, 0.5, 0.78];
const BLOCKS = [
  { x: 0.02, y: 0.03, w: 0.13, h: 0.14 },
  { x: 0.25, y: 0.03, w: 0.19, h: 0.14 },
  { x: 0.56, y: 0.03, w: 0.16, h: 0.14 },
  { x: 0.84, y: 0.03, w: 0.14, h: 0.14 },
  { x: 0.02, y: 0.28, w: 0.13, h: 0.21 },
  { x: 0.25, y: 0.28, w: 0.19, h: 0.21 },
  { x: 0.56, y: 0.28, w: 0.16, h: 0.21 },
  { x: 0.84, y: 0.28, w: 0.14, h: 0.21 },
  { x: 0.02, y: 0.61, w: 0.13, h: 0.17 },
  { x: 0.25, y: 0.61, w: 0.19, h: 0.17 },
  { x: 0.56, y: 0.61, w: 0.16, h: 0.17 },
  { x: 0.84, y: 0.61, w: 0.14, h: 0.17 },
  { x: 0.25, y: 0.9, w: 0.19, h: 0.14 },
  { x: 0.56, y: 0.9, w: 0.16, h: 0.14 },
];

type MapPreviewProps = {
  /** Fixed height. Ignored when `fill` is set. */
  height?: number;
  /** Stretch to the parent instead of using a fixed height. */
  fill?: boolean;
  /** 0–1 along the route. Drives the moving dot on the tracking screen. */
  progress?: Animated.Value;
  /** Pulsing ring at the start pin. */
  pulse?: boolean;
  /** Pin at the end of the route — the walk's destination. */
  showDestination?: boolean;
  rounded?: number;
  style?: StyleProp<ViewStyle>;
};

export function MapPreview({
  height = sizes.mapPreview,
  fill = false,
  progress,
  pulse = true,
  showDestination = true,
  rounded = 0,
  style,
}: MapPreviewProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const pulseValue = useRef(new Animated.Value(0)).current;

  const onLayout = (event: LayoutChangeEvent) => {
    const { width, height: h } = event.nativeEvent.layout;
    setSize((prev) =>
      prev.width === width && prev.height === h ? prev : { width, height: h }
    );
  };

  useEffect(() => {
    if (!pulse) return;
    const loop = Animated.loop(
      Animated.timing(pulseValue, {
        toValue: 1,
        duration: 2000,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      })
    );
    loop.start();
    return () => loop.stop();
  }, [pulse, pulseValue]);

  // Route in pixels, recomputed only when the container resizes.
  const points = useMemo(
    () => ROUTE.map((p) => ({ x: p.x * size.width, y: p.y * size.height })),
    [size.width, size.height]
  );

  const steps = useMemo(
    () => ROUTE.map((_, i) => i / (ROUTE.length - 1)),
    []
  );

  const ready = size.width > 0 && size.height > 0;
  const stroke = Math.max(2.5, Math.min(size.width, size.height) * 0.018);

  const start = points[0] ?? { x: 0, y: 0 };
  const end = points[points.length - 1] ?? { x: 0, y: 0 };

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.wrap,
        fill ? styles.fill : { height },
        { borderRadius: rounded },
        style,
      ]}
    >
      {ready ? (
        <Svg width={size.width} height={size.height}>
          <Rect
            x={0}
            y={0}
            width={size.width}
            height={size.height}
            fill={colors.primarySoft}
          />

          {BLOCKS.map((b, i) => (
            <Rect
              key={`b${i}`}
              x={b.x * size.width}
              y={b.y * size.height}
              width={b.w * size.width}
              height={b.h * size.height}
              rx={4}
              fill={colors.card}
              opacity={0.75}
            />
          ))}

          {H_ROADS.map((y, i) => (
            <Line
              key={`h${i}`}
              x1={0}
              y1={y * size.height}
              x2={size.width}
              y2={y * size.height}
              stroke={colors.bg}
              strokeWidth={stroke * 2.2}
            />
          ))}
          {V_ROADS.map((x, i) => (
            <Line
              key={`v${i}`}
              x1={x * size.width}
              y1={0}
              x2={x * size.width}
              y2={size.height}
              stroke={colors.bg}
              strokeWidth={stroke * 2.2}
            />
          ))}

          <Polyline
            points={points.map((p) => `${p.x},${p.y}`).join(' ')}
            fill="none"
            stroke={colors.primary}
            strokeWidth={stroke * 1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {showDestination ? (
            <>
              <Circle cx={end.x} cy={end.y} r={stroke * 2.6} fill={colors.primary} />
              <Circle cx={end.x} cy={end.y} r={stroke * 1.1} fill={colors.card} />
            </>
          ) : null}

          {/* start pin: white circle, teal ring */}
          <Circle
            cx={start.x}
            cy={start.y}
            r={stroke * 2.6}
            fill={colors.card}
            stroke={colors.primary}
            strokeWidth={stroke}
          />
        </Svg>
      ) : null}

      {ready && pulse ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pulse,
            {
              left: start.x - 18,
              top: start.y - 18,
              opacity: pulseValue.interpolate({
                inputRange: [0, 1],
                outputRange: [0.45, 0],
              }),
              transform: [
                {
                  scale: pulseValue.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0.4, 1.6],
                  }),
                },
              ],
            },
          ]}
        />
      ) : null}

      {ready && progress ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.walker,
            {
              transform: [
                {
                  translateX: progress.interpolate({
                    inputRange: steps,
                    outputRange: points.map((p) => p.x - 9),
                  }),
                },
                {
                  translateY: progress.interpolate({
                    inputRange: steps,
                    outputRange: points.map((p) => p.y - 9),
                  }),
                },
              ],
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: '100%',
    overflow: 'hidden',
    backgroundColor: colors.primarySoft,
  },
  fill: { flex: 1 },
  pulse: {
    position: 'absolute',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
  },
  walker: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: 18,
    height: 18,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    borderWidth: 3,
    borderColor: colors.card,
  },
});
