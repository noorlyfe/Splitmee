import { useCallback, useEffect, useMemo, useRef } from "react";
import { StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { getMarkSquareLayouts, SPLASH_BG, SPLASH_MARK } from "../constants/splashMark";
import { typography } from "../constants/theme";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const splash = require("../constants/splashTypography.js") as {
  titleText: string;
  taglineText: string;
};

const MARK_SIZE = 168;
const SQUARE_DELAYS = [0, 110, 220];

type Props = {
  fontsLoaded: boolean;
  onReady: () => void;
  onFinish: () => void;
};

function Square({
  layout,
  delay,
}: {
  layout: ReturnType<typeof getMarkSquareLayouts>[number];
  delay: number;
}) {
  const scale = useSharedValue(0.9);
  const translateX = useSharedValue(-6);
  const translateY = useSharedValue(8);

  useEffect(() => {
    scale.value = withDelay(
      delay,
      withSpring(1, { damping: 15, stiffness: 170, mass: 0.75 })
    );
    translateX.value = withDelay(delay, withSpring(0, { damping: 17, stiffness: 150 }));
    translateY.value = withDelay(delay, withSpring(0, { damping: 17, stiffness: 150 }));
  }, [delay, scale, translateX, translateY]);

  const style = useAnimatedStyle(() => ({
    opacity: 1,
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <Animated.View
      style={[
        styles.square,
        {
          left: layout.left,
          top: layout.top,
          width: layout.size,
          height: layout.size,
          borderRadius: layout.radius,
        },
        style,
      ]}
    />
  );
}

export function AnimatedSplash({ fontsLoaded, onReady, onFinish }: Props) {
  const layouts = useMemo(() => getMarkSquareLayouts(MARK_SIZE), []);
  const wordmarkOpacity = useSharedValue(0);
  const wordmarkY = useSharedValue(12);
  const taglineOpacity = useSharedValue(0);
  const overlayOpacity = useSharedValue(1);
  const readyNotified = useRef(false);

  const handleOverlayLayout = useCallback(() => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (readyNotified.current) {
          return;
        }
        readyNotified.current = true;
        onReady();
      });
    });
  }, [onReady]);

  useEffect(() => {
    if (!fontsLoaded) {
      return;
    }
    wordmarkOpacity.value = withDelay(
      560,
      withTiming(1, { duration: 480, easing: Easing.out(Easing.cubic) })
    );
    wordmarkY.value = withDelay(560, withSpring(0, { damping: 18, stiffness: 140 }));
    taglineOpacity.value = withDelay(
      760,
      withTiming(1, { duration: 420, easing: Easing.out(Easing.cubic) })
    );
  }, [fontsLoaded, taglineOpacity, wordmarkOpacity, wordmarkY]);

  useEffect(() => {
    const holdMs = fontsLoaded ? 1700 : 1250;
    const fadeTimer = setTimeout(() => {
      overlayOpacity.value = withTiming(
        0,
        { duration: 420, easing: Easing.inOut(Easing.cubic) },
        (done) => {
          if (done) {
            runOnJS(onFinish)();
          }
        }
      );
    }, holdMs);

    return () => clearTimeout(fadeTimer);
  }, [fontsLoaded, onFinish, overlayOpacity]);

  const overlayStyle = useAnimatedStyle(() => ({
    opacity: overlayOpacity.value,
  }));

  const wordmarkStyle = useAnimatedStyle(() => ({
    opacity: wordmarkOpacity.value,
    transform: [{ translateY: wordmarkY.value }],
  }));

  const taglineStyle = useAnimatedStyle(() => ({
    opacity: taglineOpacity.value,
  }));

  return (
    <Animated.View
      style={[styles.overlay, overlayStyle]}
      pointerEvents="none"
      onLayout={handleOverlayLayout}
    >
      <View style={styles.stack}>
        <View style={[styles.mark, { width: MARK_SIZE, height: MARK_SIZE }]}>
          {layouts.map((layout, index) => (
            <Square key={index} layout={layout} delay={SQUARE_DELAYS[index] ?? 0} />
          ))}
        </View>

        {fontsLoaded ? (
          <Animated.View style={[styles.textBlock, wordmarkStyle]}>
            <Text style={styles.wordmark}>{splash.titleText}</Text>
            <Animated.Text style={[styles.tagline, taglineStyle]}>
              {splash.taglineText}
            </Animated.Text>
          </Animated.View>
        ) : null}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SPLASH_BG,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 100,
  },
  stack: {
    alignItems: "center",
  },
  mark: {
    position: "relative",
  },
  square: {
    position: "absolute",
    backgroundColor: SPLASH_MARK,
  },
  textBlock: {
    alignItems: "center",
    marginTop: 28,
  },
  wordmark: {
    ...typography.wordmark,
    fontSize: 32,
    letterSpacing: -0.8,
    color: "#1C1917",
  },
  tagline: {
    ...typography.label,
    fontSize: 11,
    letterSpacing: 2.8,
    color: "#6F6557",
    marginTop: 10,
    textTransform: "uppercase",
  },
});
