import { memo, useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { fonts, spacing } from "../constants/theme";
import { useLocale } from "../hooks/useLocale";
import { useTheme } from "../hooks/useTheme";
import {
  escalationHeaderKey,
  escalationStampKey,
  getEscalationVisual,
} from "../lib/escalation";

export type StoryDebtCardProps = {
  /** Capture width; height is derived as 16:9 portrait (9:16). */
  width: number;
  title: string;
  subtitle?: string;
  amountLabel: string;
  days: number;
  paymentHint?: string;
  showBranding?: boolean;
};

/**
 * Story-native (9:16) debt drop: designed for Messages / Instagram / TikTok share sheets.
 */
export const StoryDebtCard = memo(function StoryDebtCard({
  width,
  title,
  subtitle,
  amountLabel,
  days,
  paymentHint,
  showBranding = true,
}: StoryDebtCardProps) {
  const { t } = useLocale();
  const { isDark } = useTheme();
  const visual = useMemo(() => getEscalationVisual(days), [days]);
  const height = Math.round((width * 16) / 9);

  const dayLabel =
    days <= 0 ? t("dueToday") : days === 1 ? t("storyDayOne") : t("storyDayCount", { days });

  const bg = isDark ? "#121211" : "#F3F2EE";
  const fg = isDark ? "#F2F1EC" : "#1A1A17";
  const muted = isDark ? "rgba(242,241,236,0.5)" : "rgba(26,26,23,0.48)";

  return (
    <View
      style={[
        styles.root,
        {
          width,
          height,
          backgroundColor: bg,
          borderColor: visual.border,
          borderWidth: 1.5,
        },
      ]}
    >
      <View style={styles.top}>
        <View
          style={[
            styles.stamp,
            {
              borderColor: visual.accent,
              transform: [{ rotate: visual.stampRotate }],
              backgroundColor: isDark ? "rgba(0,0,0,0.35)" : "rgba(255,255,255,0.55)",
            },
          ]}
        >
          <Text style={[styles.stampText, { color: visual.accent }]}>
            {t(escalationStampKey(visual.tier))}
          </Text>
        </View>
        <Text style={[styles.header, { color: visual.accent }]}>
          {t(escalationHeaderKey(visual.tier))}
        </Text>
      </View>

      <View style={styles.center}>
        <Text style={[styles.dayCount, { color: visual.accent }]}>{dayLabel}</Text>
        <Text style={[styles.emoji]}>{visual.emoji}</Text>
        <Text style={[styles.amount, { color: fg }]} numberOfLines={1}>
          {amountLabel}
        </Text>
        <Text style={[styles.title, { color: fg }]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: muted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>

      <View style={styles.bottom}>
        {paymentHint ? (
          <View style={[styles.hintBox, { borderColor: visual.border, backgroundColor: visual.accentSoft }]}>
            <Text style={[styles.hintLabel, { color: visual.accent }]}>{t("paymentHint")}</Text>
            <Text style={[styles.hintBody, { color: fg }]} numberOfLines={3}>
              {paymentHint}
            </Text>
          </View>
        ) : null}
        {showBranding ? (
          <Text style={[styles.brand, { color: muted }]}>{t("madeWithNudgrr")}</Text>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    alignSelf: "center",
    overflow: "hidden",
    borderRadius: 18,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    justifyContent: "space-between",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOpacity: 0.18,
        shadowRadius: 20,
        shadowOffset: { width: 0, height: 12 },
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  top: {
    alignItems: "center",
    gap: spacing.md,
    zIndex: 1,
  },
  stamp: {
    borderWidth: 3,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
  },
  stampText: {
    fontFamily: fonts.mono,
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  header: {
    fontFamily: fonts.mono,
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 2.2,
    textTransform: "uppercase",
    textAlign: "center",
  },
  center: {
    alignItems: "center",
    zIndex: 1,
    gap: spacing.sm,
    paddingVertical: spacing.md,
  },
  dayCount: {
    fontFamily: fonts.monoBold,
    fontWeight: "700",
    fontSize: 42,
    letterSpacing: -1.5,
    textAlign: "center",
  },
  emoji: {
    fontSize: 36,
    lineHeight: 44,
    textAlign: "center",
  },
  amount: {
    fontFamily: fonts.monoBold,
    fontWeight: "700",
    fontSize: 40,
    letterSpacing: -1.2,
    textAlign: "center",
    marginTop: spacing.sm,
  },
  title: {
    fontFamily: fonts.bodyBold,
    fontSize: 22,
    lineHeight: 28,
    textAlign: "center",
    letterSpacing: -0.3,
    marginTop: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  subtitle: {
    fontFamily: fonts.mono,
    fontSize: 13,
    textAlign: "center",
  },
  bottom: {
    zIndex: 1,
    alignItems: "center",
    gap: spacing.md,
  },
  hintBox: {
    width: "100%",
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  hintLabel: {
    fontFamily: fonts.mono,
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    textAlign: "center",
  },
  hintBody: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 14,
    lineHeight: 20,
    textAlign: "center",
  },
  brand: {
    fontFamily: fonts.mono,
    fontSize: 10,
    letterSpacing: 0.6,
    textAlign: "center",
  },
});
