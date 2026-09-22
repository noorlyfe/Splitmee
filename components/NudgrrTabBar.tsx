import { useMemo } from "react";
import type { ComponentProps } from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fonts, radii, spacing, touchTarget, typography, type AppColors } from "../constants/theme";
import { useLocale } from "../hooks/useLocale";
import { useColors } from "../hooks/useColors";
import { useTheme } from "../hooks/useTheme";
import { rtlRow } from "../lib/rtl";

type IoniconName = ComponentProps<typeof Ionicons>["name"];

const TAB_META: Record<
  string,
  { labelKey: "split" | "waiting" | "damageTab" | "peopleTab" | "theProject"; icon: IoniconName }
> = {
  index: { labelKey: "split", icon: "calculator-outline" },
  waiting: { labelKey: "waiting", icon: "time-outline" },
  damage: { labelKey: "damageTab", icon: "stats-chart-outline" },
  people: { labelKey: "peopleTab", icon: "people-outline" },
  projects: { labelKey: "theProject", icon: "folder-outline" },
};

export function NudgrrTabBar({ state, navigation }: BottomTabBarProps) {
  const colors = useColors();
  const { isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const insets = useSafeAreaInsets();
  const { t, isRTL } = useLocale();

  return (
    <View
      style={[
        styles.wrap,
        { paddingBottom: Math.max(insets.bottom, spacing.sm) + spacing.xs },
      ]}
      pointerEvents="box-none"
    >
      <View style={[styles.bar, rtlRow(isRTL)]}>
        {state.routes.map((route, index) => {
          const focused = state.index === index;
          const meta = TAB_META[route.name] ?? {
            labelKey: "split" as const,
            icon: "ellipse-outline" as IoniconName,
          };
          const label = t(meta.labelKey);

          return (
            <Pressable
              key={route.key}
              onPress={() => {
                const event = navigation.emit({
                  type: "tabPress",
                  target: route.key,
                  canPreventDefault: true,
                });
                if (!focused && !event.defaultPrevented) {
                  navigation.navigate(route.name);
                }
              }}
              style={({ pressed }) => [
                styles.tab,
                focused && styles.tabFocused,
                pressed && styles.tabPressed,
              ]}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
            >
              <Ionicons
                name={meta.icon}
                size={20}
                color={focused ? colors.accent : colors.textSecondary}
              />
              <Text
                style={[styles.label, focused && styles.labelFocused]}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.75}
              >
                {label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function createStyles(colors: AppColors, isDark: boolean) {
  const barShadow = Platform.select({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.28 : 0.05,
      shadowRadius: 14,
    },
    android: {
      elevation: 6,
    },
    default: {},
  });

  return StyleSheet.create({
    wrap: {
      backgroundColor: "transparent",
      paddingTop: spacing.xs,
      paddingHorizontal: spacing.md,
    },
    bar: {
      flexDirection: "row",
      alignItems: "stretch",
      gap: 2,
      backgroundColor: colors.surface,
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: spacing.xs,
      paddingHorizontal: spacing.xs,
      ...barShadow,
    },
    tab: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      minHeight: touchTarget.min,
      borderRadius: radii.lg,
      gap: 4,
      paddingVertical: spacing.xs,
      paddingHorizontal: 2,
    },
    tabFocused: {
      backgroundColor: colors.accentSoft,
    },
    tabPressed: {
      opacity: 0.85,
    },
    label: {
      ...typography.label,
      fontSize: 10,
      letterSpacing: 0.1,
      color: colors.textSecondary,
      textAlign: "center",
      opacity: 0.9,
    },
    labelFocused: {
      color: colors.textPrimary,
      fontFamily: fonts.bodySemiBold,
      opacity: 1,
    },
  });
}
