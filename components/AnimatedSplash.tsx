import { useCallback, useEffect, useRef } from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from "react-native-reanimated";

import { SPLASH_BG, SPLASH_TEXT, SPLASH_TEXT_MUTED } from "../constants/splashMark";
import { typography } from "../constants/theme";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const splash = require("../constants/splashTypography.js") as {
  titleText: string;
  taglineText: string;
};

// Transparent mark (no field) — same art as the app icon glyph.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const splashMark = require("../assets/splash-mark.png");

const MARK_SIZE = 168;

type Props = {
  fontsLoaded: boolean;
  onReady: () => void;
  onFinish: () => void;
};

export function AnimatedSplash({ fontsLoaded, onReady, onFinish }: Props) {
  const markScale = useSharedValue(0.78);
  const markOpacity = useSharedValue(0);
  const wordmarkOpacity = useSharedValue(0);
  const wordmarkY = useSharedValue(14);
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
    markOpacity.value = withTiming(1, { duration: 280, easing: Easing.out(Easing.cubic) });
    markScale.value = withSpring(1, { damping: 14, stiffness: 180, mass: 0.7 });
  }, [markOpacity, markScale]);

  useEffect(() => {
    if (!fontsLoaded) {
      return;
    }
    wordmarkOpacity.value = withDelay(
      380,
      withTiming(1, { duration: 440, easing: Easing.out(Easing.cubic) })
    );
    wordmarkY.value = withDelay(380, withSpring(0, { damping: 17, stiffness: 150 }));
    taglineOpacity.value = withDelay(
      560,
      withTiming(1, { duration: 400, easing: Easing.out(Easing.cubic) })
    );
  }, [fontsLoaded, taglineOpacity, wordmarkOpacity, wordmarkY]);

  useEffect(() => {
    const holdMs = fontsLoaded ? 2300 : 1800;
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

  const markStyle = useAnimatedStyle(() => ({
    opacity: markOpacity.value,
    transform: [{ scale: markScale.value }],
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
        <Animated.View style={[styles.markWrap, markStyle]}>
          <Image source={splashMark} style={styles.markImage} resizeMode="contain" />
        </Animated.View>

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
  markWrap: {
    width: MARK_SIZE,
    height: MARK_SIZE,
    alignItems: "center",
    justifyContent: "center",
  },
  markImage: {
    width: MARK_SIZE,
    height: MARK_SIZE,
  },
  textBlock: {
    alignItems: "center",
    marginTop: 36,
  },
  wordmark: {
    ...typography.wordmark,
    fontSize: 34,
    letterSpacing: -0.8,
    color: SPLASH_TEXT,
  },
  tagline: {
    ...typography.label,
    fontSize: 12,
    letterSpacing: 2.2,
    color: SPLASH_TEXT_MUTED,
    marginTop: 12,
    textTransform: "uppercase",
  },
});
