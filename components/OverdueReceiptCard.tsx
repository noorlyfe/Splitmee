import { memo, useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { getLocalizedReceiptTonePack } from "../constants/receiptTone";
import { NUDGE_TEMPLATES, fillNudgeTemplate, type NudgeTone } from "../constants/messages";
import { fonts, getReceiptColors, radii, receipt, spacing } from "../constants/theme";
import type { SplitRecord } from "../hooks/useSplitHistory";
import { useLocale } from "../hooks/useLocale";
import { useTheme } from "../hooks/useTheme";
import { formatCurrency } from "../lib/currency";
import {
  escalationHeaderKey,
  escalationStampKey,
  getEscalationVisual,
  suggestedToneForDays,
} from "../lib/escalation";
import { ReceiptCustomFooter } from "./ReceiptCustomFooter";
import { resolveReceiptFooterText } from "../lib/receiptFooter";
import { rtlRow } from "../lib/rtl";

export type OverdueReceiptCardProps = {
  width: number;
  record: SplitRecord;
  daysOverdue: number;
  dateLabel: string;
  isPro: boolean;
  hideReceiptBranding?: boolean;
  customFooter?: string;
  paymentHint?: string;
  /** When set, shown in the message box instead of auto-escalated template text. */
  previewText?: string;
  /** Waiting Game reminder capture: tighter vertical spacing. */
  compact?: boolean;
};

function simpleHash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) {
    h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function pickEscalatedTemplate(record: SplitRecord, daysOverdue: number): string {
  const tone: NudgeTone = suggestedToneForDays(daysOverdue);
  const list = NUDGE_TEMPLATES[tone] ?? NUDGE_TEMPLATES.passiveAggressive;
  const h = simpleHash(`${record.id}:${daysOverdue}:${tone}`);
  if (tone === "serious") {
    const bluntStart = Math.max(0, list.length - 14);
    const span = Math.max(1, list.length - bluntStart);
    return list[bluntStart + (h % span)] ?? list[list.length - 1]!;
  }
  return list[h % list.length] ?? list[0]!;
}

function HairlineRule({
  w,
  color,
  compact = false,
}: {
  w: number;
  color: string;
  compact?: boolean;
}) {
  return (
    <View
      style={[
        styles.hairlineRule,
        compact && styles.hairlineRuleCompact,
        { backgroundColor: color, width: w },
      ]}
    />
  );
}

function receiptColorsForTheme(isDark: boolean) {
  return getReceiptColors(isDark);
}

export const OverdueReceiptCard = memo(function OverdueReceiptCard({
  width,
  record,
  daysOverdue,
  dateLabel,
  isPro = false,
  hideReceiptBranding = false,
  customFooter = "",
  paymentHint = "",
  previewText,
  compact = false,
}: OverdueReceiptCardProps) {
  const { t, isRTL } = useLocale();
  const { isDark } = useTheme();
  const colors = useMemo(() => receiptColorsForTheme(isDark), [isDark]);
  const visual = useMemo(() => getEscalationVisual(daysOverdue), [daysOverdue]);
  const tier = visual.tier;
  const showBranding = !(isPro && hideReceiptBranding);
  const footerText = useMemo(
    () => resolveReceiptFooterText(isPro, customFooter),
    [customFooter, isPro]
  );
  const displayHint = isPro && paymentHint.trim() ? paymentHint.trim() : "";
  const originalTone = record.nudgeTone ?? "funny";
  const pack = useMemo(() => getLocalizedReceiptTonePack(originalTone, t), [originalTone, t]);
  const title = record.restaurant.trim() || t("dinner");
  const currencyCode = record.currency ?? "USD";
  const amountFormatted = useMemo(
    () => formatCurrency(record.totalPerPerson, currencyCode),
    [currencyCode, record.totalPerPerson]
  );
  const reminderBody = useMemo(() => {
    if (previewText != null && previewText.length > 0) {
      return previewText;
    }
    return fillNudgeTemplate(pickEscalatedTemplate(record, daysOverdue), amountFormatted);
  }, [amountFormatted, daysOverdue, previewText, record]);

  const tipPctLabel =
    Math.abs(record.tipPercent - Math.round(record.tipPercent)) < 0.001
      ? `${Math.round(record.tipPercent)}`
      : `${record.tipPercent}`;

  const overduePillLabel =
    daysOverdue === 0
      ? t("dueToday")
      : daysOverdue === 1
        ? t("oneDayOverdue")
        : t("daysOverdue", { days: daysOverdue });

  const CARD_PAD_H = 24;
  const ruleWidth = Math.max(40, width - CARD_PAD_H * 2);
  const accent = visual.accent;

  return (
    <View
      style={[
        styles.root,
        {
          width,
          backgroundColor: colors.background,
          borderColor: visual.border,
          borderWidth: visual.borderWidth,
        },
      ]}
    >
      <View style={[styles.accentBar, { backgroundColor: colors.accent }]} />
      <View style={[styles.body, compact && styles.bodyCompact, { width }]}>
        <View style={[styles.watermarkLayer, { opacity: visual.watermarkOpacity }]} pointerEvents="none">
          <View style={[styles.watermarkStamp, { borderColor: accent }]}>
            <Text style={[styles.watermarkStampText, { color: accent }]}>{t("pastDue")}</Text>
          </View>
        </View>

        <View style={[styles.fillColumn, compact && styles.fillColumnCompact]}>
          <View style={[styles.topSection, compact && styles.topSectionCompact]}>
            <View style={[styles.stampRow, compact && styles.stampRowCompact]}>
              <View
                style={[
                  styles.stamp,
                  {
                    borderColor: accent,
                    transform: [{ rotate: visual.stampRotate }],
                    backgroundColor: visual.accentSoft,
                  },
                ]}
              >
                <Text style={[styles.stampText, { color: accent }]}>
                  {t(escalationStampKey(tier))}
                </Text>
              </View>
            </View>

            <View style={[styles.header, compact && styles.headerCompact]}>
              <Text style={[styles.brand, { color: colors.accent }]}>{t("receiptBrandLabel")}</Text>
              <Text style={[styles.tagline, { color: colors.muted }]}>{pack.tagline}</Text>
              <Text style={[styles.date, { color: colors.muted }]}>{dateLabel}</Text>
              <Text style={[styles.dateFlavor, { color: colors.muted }]}>{pack.dateFlavor}</Text>
            </View>

            <View style={[styles.noticeHeader, compact && styles.noticeHeaderCompact]}>
              <Text style={[styles.secondNoticeLabel, { color: accent }]}>
                {t(escalationHeaderKey(tier))}
              </Text>
              <Text style={[styles.restaurant, { color: colors.text }]} numberOfLines={3}>
                {title}
              </Text>
            </View>

            <View
              style={[
                styles.messageBox,
                compact && styles.messageBoxCompact,
                { borderColor: colors.divider, backgroundColor: colors.surface },
              ]}
            >
              <Text style={[styles.messageText, { color: colors.text }]} numberOfLines={10}>
                {reminderBody}
              </Text>
            </View>
          </View>

          <View style={[styles.midSection, compact && styles.midSectionCompact]}>
            <HairlineRule w={ruleWidth} color={colors.divider} compact={compact} />

            <View style={[styles.padH, compact && styles.padHCompact]}>
              <View style={[styles.row, rtlRow(isRTL)]}>
                <Text style={[styles.lineLabel, { color: colors.muted }]}>{pack.billLabel}</Text>
                <Text style={[styles.lineVal, { color: accent }]}>
                  {formatCurrency(record.billAmount, currencyCode)}
                </Text>
              </View>
              <View style={[styles.row, rtlRow(isRTL)]}>
                <Text style={[styles.lineLabel, { color: colors.muted }]}>
                  {pack.tipLabel(tipPctLabel)}
                </Text>
                <Text style={[styles.lineVal, { color: accent }]}>
                  {formatCurrency(record.tipAmount, currencyCode)}
                </Text>
              </View>
              <View style={[styles.row, rtlRow(isRTL)]}>
                <Text style={[styles.lineLabelStrong, { color: colors.text }]}>{pack.totalLabel}</Text>
                <Text style={[styles.lineValStrong, { color: accent }]}>
                  {formatCurrency(record.totalAmount, currencyCode)}
                </Text>
              </View>
            </View>

            <HairlineRule w={ruleWidth} color={colors.divider} compact={compact} />

            <View
              style={[
                styles.padH,
                compact && styles.padHCompact,
                styles.splitBox,
                compact && styles.splitBoxCompact,
                { borderColor: colors.divider, backgroundColor: colors.surface },
              ]}
            >
              <Text style={[styles.eachLabel, { color: colors.muted }]}>{pack.eachTitle}</Text>
              <View style={[styles.amountRow, rtlRow(isRTL)]}>
                <Text style={[styles.eachAmount, { color: accent }]}>
                  {formatCurrency(record.totalPerPerson, currencyCode)}
                </Text>
                <View
                  style={[
                    styles.overduePill,
                    { backgroundColor: visual.accentSoft, borderColor: visual.border },
                  ]}
                >
                  <Text style={[styles.overduePillText, { color: accent }]}>{overduePillLabel}</Text>
                </View>
              </View>
              <Text style={[styles.splitMeta, { color: colors.muted }]}>{pack.splitCaption(record.people)}</Text>
            </View>

            {displayHint ? (
              <View
                style={[
                  styles.hintBox,
                  { borderColor: visual.border, backgroundColor: visual.accentSoft },
                ]}
              >
                <Text style={[styles.hintLabel, { color: accent }]}>{t("paymentHint")}</Text>
                <Text style={[styles.hintBody, { color: colors.text }]} numberOfLines={4}>
                  {displayHint}
                </Text>
              </View>
            ) : null}
          </View>

          <View style={[styles.bottomSection, compact && styles.bottomSectionCompact]}>
            <ReceiptCustomFooter text={footerText} color={colors.muted} />
            {showBranding ? (
              <Text style={[styles.madeWith, { color: colors.muted }]}>{t("madeWithNudgrr")}</Text>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    alignSelf: "center",
    flexShrink: 0,
    borderRadius: 22,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#12141A",
        shadowOpacity: 0.14,
        shadowRadius: 24,
        shadowOffset: { width: 0, height: 14 },
      },
      android: { elevation: 8 },
      default: {},
    }),
  },
  accentBar: {
    height: 4,
    width: "100%",
  },
  bodyCompact: {
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  body: {
    position: "relative",
    paddingVertical: 32,
    paddingHorizontal: 24,
    overflow: "hidden",
  },
  watermarkLayer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 0,
  },
  watermarkStamp: {
    width: 168,
    height: 168,
    borderRadius: 84,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    transform: [{ rotate: "15deg" }],
  },
  watermarkStampText: {
    fontFamily: fonts.mono,
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 1.6,
    textTransform: "uppercase" as const,
  },
  fillColumn: {
    flexShrink: 0,
    zIndex: 1,
    gap: spacing.lg,
  },
  fillColumnCompact: {
    gap: spacing.sm,
  },
  topSection: {
    width: "100%",
    alignItems: "center",
    gap: spacing.xl,
    marginBottom: spacing.sm,
  },
  topSectionCompact: {
    gap: spacing.md,
    marginBottom: 0,
  },
  midSection: {
    width: "100%",
    alignItems: "center",
    gap: spacing.xl,
    marginBottom: spacing.md,
  },
  midSectionCompact: {
    gap: spacing.md,
    marginBottom: spacing.xs,
  },
  bottomSection: {
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-end",
    minHeight: spacing.xl,
    paddingTop: spacing.sm,
  },
  bottomSectionCompact: {
    minHeight: 0,
    paddingTop: 0,
  },
  stampRow: {
    alignItems: "center",
    minHeight: 48,
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  stampRowCompact: {
    minHeight: 36,
    marginBottom: 0,
  },
  stamp: {
    borderWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
  },
  stampText: {
    fontFamily: fonts.mono,
    fontWeight: "700",
    fontSize: 13,
    letterSpacing: 1.2,
  },
  header: { alignItems: "center", gap: spacing.xs, marginBottom: spacing.sm },
  headerCompact: {
    marginBottom: 0,
  },
  noticeHeader: {
    width: "100%",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  noticeHeaderCompact: {
    gap: spacing.sm,
    marginTop: spacing.xs,
    marginBottom: 0,
  },
  secondNoticeLabel: {
    fontFamily: fonts.mono,
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 2,
    textAlign: "center",
    textTransform: "uppercase" as const,
  },
  brand: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 2.6,
    textAlign: "center",
    textTransform: "uppercase" as const,
  },
  tagline: {
    fontFamily: fonts.body,
    fontWeight: "400",
    fontSize: 12,
    color: receipt.branding,
    textAlign: "center",
    marginTop: 4,
  },
  date: {
    fontFamily: fonts.mono,
    fontSize: 11,
    color: receipt.branding,
    textAlign: "center",
    marginTop: 8,
  },
  dateFlavor: {
    fontFamily: fonts.mono,
    fontSize: 9,
    color: receipt.branding,
    textAlign: "center",
    marginTop: 4,
    opacity: 0.9,
  },
  restaurant: {
    fontFamily: fonts.monoBold,
    fontWeight: "700",
    fontSize: 15,
    color: receipt.text,
    textAlign: "center",
  },
  messageBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
    marginBottom: spacing.md,
  },
  messageBoxCompact: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    marginTop: 0,
    marginBottom: spacing.sm,
  },
  messageText: {
    fontFamily: fonts.body,
    fontSize: 13,
    lineHeight: 18,
  },
  hairlineRule: {
    alignSelf: "center",
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.sm,
  },
  hairlineRuleCompact: {
    marginVertical: spacing.xs,
  },
  padH: { width: "100%", gap: spacing.md },
  padHCompact: {
    gap: spacing.sm,
  },
  splitBox: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 14,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginTop: spacing.xs,
  },
  splitBoxCompact: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    marginTop: 0,
  },
  hintBox: {
    width: "100%",
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: 4,
  },
  hintLabel: {
    fontFamily: fonts.mono,
    fontWeight: "700",
    fontSize: 9,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    textAlign: "center",
  },
  hintBody: {
    fontFamily: fonts.mono,
    fontSize: 12,
    lineHeight: 17,
    textAlign: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lineLabel: {
    fontFamily: fonts.mono,
    fontSize: 13,
    flex: 1,
    paddingRight: 8,
  },
  lineLabelStrong: {
    fontFamily: fonts.monoBold,
    fontWeight: "700",
    fontSize: 13,
    flex: 1,
    paddingRight: 8,
  },
  lineVal: {
    fontFamily: fonts.mono,
    fontSize: 13,
  },
  lineValStrong: {
    fontFamily: fonts.monoBold,
    fontWeight: "700",
    fontSize: 13,
  },
  eachLabel: {
    fontFamily: fonts.monoBold,
    fontWeight: "700",
    fontSize: 13,
    marginTop: 4,
    textAlign: "center",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "wrap",
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  eachAmount: {
    fontFamily: fonts.monoBold,
    fontWeight: "700",
    fontSize: 26,
    letterSpacing: -1,
    textAlign: "center",
  },
  overduePill: {
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
    borderRadius: radii.pill,
    borderWidth: 1,
  },
  overduePillText: {
    fontFamily: fonts.mono,
    fontWeight: "700",
    fontSize: 9,
    letterSpacing: 0.8,
    textTransform: "uppercase" as const,
  },
  splitMeta: {
    fontFamily: fonts.mono,
    fontSize: 12,
    marginTop: spacing.sm,
    textAlign: "center",
  },
  madeWith: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 0.5,
    textAlign: "center",
    marginTop: 4,
  },
});
