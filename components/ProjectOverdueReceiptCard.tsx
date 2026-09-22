import { memo, useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import type { NudgeTone } from "../constants/messages";
import { getLocalizedReceiptTonePack } from "../constants/receiptTone";
import { fonts, getReceiptColors, spacing } from "../constants/theme";
import type { ProjectWaitingEntry } from "../hooks/useProjects";
import { useLocale } from "../hooks/useLocale";
import { useTheme } from "../hooks/useTheme";
import { formatCurrency } from "../lib/currency";
import {
  escalationHeaderKey,
  escalationStampKey,
  getEscalationVisual,
} from "../lib/escalation";
import { buildProjectReminderMessage } from "../lib/projectReminders";
import { ReceiptCustomFooter } from "./ReceiptCustomFooter";
import { resolveReceiptFooterText } from "../lib/receiptFooter";
import { rtlRow } from "../lib/rtl";

export type ProjectOverdueReceiptCardProps = {
  width: number;
  entry: ProjectWaitingEntry;
  daysOverdue: number;
  dateLabel: string;
  currencyCode: string;
  nudgeTone: NudgeTone;
  isPro: boolean;
  hideReceiptBranding?: boolean;
  customFooter?: string;
  paymentHint?: string;
  compact?: boolean;
};

function receiptColorsForTheme(isDark: boolean) {
  return getReceiptColors(isDark);
}

export const ProjectOverdueReceiptCard = memo(function ProjectOverdueReceiptCard({
  width,
  entry,
  daysOverdue,
  dateLabel,
  currencyCode,
  nudgeTone,
  isPro,
  hideReceiptBranding = false,
  customFooter = "",
  paymentHint = "",
  compact = false,
}: ProjectOverdueReceiptCardProps) {
  const { t, isRTL } = useLocale();
  const { isDark } = useTheme();
  const colors = useMemo(() => receiptColorsForTheme(isDark), [isDark]);
  const visual = useMemo(() => getEscalationVisual(daysOverdue), [daysOverdue]);
  const accent = visual.accent;
  const showBranding = !(isPro && hideReceiptBranding);
  const footerText = useMemo(
    () => resolveReceiptFooterText(isPro, customFooter),
    [customFooter, isPro]
  );
  const displayHint = isPro && paymentHint.trim() ? paymentHint.trim() : "";
  const pack = useMemo(() => getLocalizedReceiptTonePack(nudgeTone, t), [nudgeTone, t]);
  const amountFormatted = formatCurrency(entry.amount, currencyCode);
  const projectTitle = entry.projectName.trim() || t("projectDefaultName");

  const reminderBody = useMemo(
    () =>
      buildProjectReminderMessage(t, nudgeTone, daysOverdue, {
        amount: amountFormatted,
        project: projectTitle,
        payee: entry.toParticipantName,
      }),
    [amountFormatted, daysOverdue, entry.toParticipantName, nudgeTone, projectTitle, t]
  );

  const overduePillLabel =
    daysOverdue === 0
      ? t("dueToday")
      : daysOverdue === 1
        ? t("oneDayOverdue")
        : t("daysOverdue", { days: daysOverdue });

  const CARD_PAD_H = compact ? 20 : 24;
  const ruleWidth = Math.max(40, width - CARD_PAD_H * 2);

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

        <View style={[styles.column, compact && styles.columnCompact]}>
          <View
            style={[
              styles.stamp,
              {
                borderColor: accent,
                backgroundColor: visual.accentSoft,
                transform: [{ rotate: visual.stampRotate }],
              },
            ]}
          >
            <Text style={[styles.stampText, { color: accent }]}>
              {t(escalationStampKey(visual.tier))}
            </Text>
          </View>

          <Text style={[styles.brand, { color: colors.accent }]}>{t("receiptBrandLabel")}</Text>
          <Text style={[styles.tagline, { color: colors.muted }]}>{pack.tagline}</Text>
          <Text style={[styles.date, { color: colors.muted }]}>{dateLabel}</Text>

          <Text style={[styles.secondNoticeLabel, { color: accent }]}>
            {t(escalationHeaderKey(visual.tier))}
          </Text>
          <Text style={[styles.projectTitle, { color: colors.text }]} numberOfLines={3}>
            {projectTitle}
          </Text>
          <Text style={[styles.debtorLine, { color: colors.muted }]}>
            {t("projectOverdueDebtor", { name: entry.participantName })}
          </Text>

          <View style={[styles.messageBox, { borderColor: colors.divider, backgroundColor: colors.surface }]}>
            <Text style={[styles.messageText, { color: colors.text }]} numberOfLines={10}>
              {reminderBody}
            </Text>
          </View>

          <View style={[styles.hairlineRule, { width: ruleWidth, backgroundColor: colors.divider }]} />

          <View style={[styles.amountBox, { borderColor: colors.divider, backgroundColor: colors.surface }]}>
            <Text style={[styles.amountLabel, { color: colors.muted }]}>{t("projectOverdueAmountLabel")}</Text>
            <View style={[styles.amountRow, rtlRow(isRTL)]}>
              <Text style={[styles.amountValue, { color: accent }]}>{amountFormatted}</Text>
              <View style={[styles.overduePill, { borderColor: accent, backgroundColor: visual.accentSoft }]}>
                <Text style={[styles.overduePillText, { color: accent }]}>{overduePillLabel}</Text>
              </View>
            </View>
            <Text style={[styles.payeeLine, { color: colors.muted }]}>
              {t("projectOverduePayee", { name: entry.toParticipantName })}
            </Text>
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

          <ReceiptCustomFooter text={footerText} color={colors.muted} />
          {showBranding ? (
            <Text style={[styles.madeWith, { color: colors.muted }]}>{t("madeWithNudgrr")}</Text>
          ) : null}
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
  body: {
    position: "relative",
    paddingVertical: 28,
    paddingHorizontal: 24,
    overflow: "hidden",
  },
  bodyCompact: {
    paddingVertical: 18,
    paddingHorizontal: 20,
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
    textTransform: "uppercase",
  },
  column: {
    zIndex: 1,
    alignItems: "center",
    gap: spacing.md,
    width: "100%",
  },
  columnCompact: {
    gap: spacing.sm,
  },
  stamp: {
    borderWidth: 3,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 4,
  },
  stampText: {
    fontFamily: fonts.mono,
    fontWeight: "700",
    fontSize: 11,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  brand: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 2.6,
    marginTop: spacing.xs,
    textTransform: "uppercase",
  },
  tagline: {
    fontFamily: fonts.body,
    fontSize: 12,
    letterSpacing: 0.2,
    textAlign: "center",
  },
  date: {
    fontFamily: fonts.mono,
    fontSize: 10,
    textAlign: "center",
  },
  secondNoticeLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.4,
    textTransform: "uppercase",
    marginTop: spacing.sm,
  },
  projectTitle: {
    fontFamily: fonts.mono,
    fontSize: 16,
    fontWeight: "500",
    letterSpacing: 1,
    textAlign: "center",
  },
  debtorLine: {
    fontFamily: fonts.mono,
    fontSize: 10,
    textAlign: "center",
  },
  messageBox: {
    width: "100%",
    borderWidth: 0.5,
    borderRadius: 4,
    padding: 12,
    marginTop: spacing.xs,
  },
  messageText: {
    fontFamily: fonts.mono,
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
  },
  hairlineRule: {
    alignSelf: "center",
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.sm,
  },
  amountBox: {
    width: "100%",
    borderWidth: 0.5,
    borderRadius: 4,
    padding: 14,
    alignItems: "center",
    gap: 6,
  },
  amountLabel: {
    fontFamily: fonts.mono,
    fontSize: 9,
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  amountValue: {
    fontFamily: fonts.mono,
    fontSize: 22,
    fontWeight: "600",
  },
  overduePill: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  overduePillText: {
    fontFamily: fonts.mono,
    fontSize: 8,
    textTransform: "uppercase",
  },
  payeeLine: {
    fontFamily: fonts.mono,
    fontSize: 10,
    textAlign: "center",
  },
  hintBox: {
    width: "100%",
    borderWidth: 1.5,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    fontSize: 11,
    lineHeight: 16,
    textAlign: "center",
  },
  madeWith: {
    fontFamily: fonts.mono,
    fontSize: 8,
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
});
