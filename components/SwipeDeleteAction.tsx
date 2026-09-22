import { Animated, Pressable, StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { fonts, spacing, typography } from "../constants/theme";
import { useColors } from "../hooks/useColors";
import { useTheme } from "../hooks/useTheme";

type Props = {
  onPress: () => void;
  label: string;
  progress: Animated.AnimatedInterpolation<number>;
};

/**
 * Shared swipe-to-delete rail: soft rose panel that matches card radius/height.
 */
export function SwipeDeleteAction({ onPress, label, progress }: Props) {
  const colors = useColors();
  const { isDark } = useTheme();

  const opacity = progress.interpolate({
    inputRange: [0, 0.35, 1],
    outputRange: [0, 0.7, 1],
    extrapolate: "clamp",
  });
  const translateX = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [16, 0],
    extrapolate: "clamp",
  });
  const scale = progress.interpolate({
    inputRange: [0, 1],
    outputRange: [0.94, 1],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.rail}>
      <Animated.View
        style={[
          styles.panel,
          {
            backgroundColor: isDark ? "rgba(168, 69, 69, 0.38)" : colors.destructive,
            opacity,
            transform: [{ translateX }, { scale }],
          },
        ]}
      >
        <Pressable
          onPress={onPress}
          style={({ pressed }) => [styles.hit, pressed && styles.hitPressed]}
          accessibilityRole="button"
          accessibilityLabel={label}
        >
          <View
            style={[
              styles.iconDisk,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.14)" : "rgba(255,255,255,0.2)",
              },
            ]}
          >
            <Ionicons
              name="trash-outline"
              size={18}
              color="#FFFFFF"
              accessibilityElementsHidden
              importantForAccessibility="no"
            />
          </View>
          <Text style={styles.label} numberOfLines={1}>
            {label}
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  rail: {
    width: 88,
    alignSelf: "stretch",
  },
  panel: {
    flex: 1,
  },
  hit: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: spacing.sm,
  },
  hitPressed: {
    opacity: 0.88,
    transform: [{ scale: 0.97 }],
  },
  iconDisk: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    ...typography.badge,
    fontFamily: fonts.bodySemiBold,
    color: "#FFFFFF",
    letterSpacing: 0.25,
  },
});
