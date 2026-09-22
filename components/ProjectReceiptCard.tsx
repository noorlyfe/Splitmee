import { memo, useMemo } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";

import { fonts, getReceiptColors, typography } from "../constants/theme";
import {
  computeParticipantBalances,
  computeSettlementTransfers,
  getExpensePayments,
  type ProjectExpense,
  type ProjectParticipant,
  type ProjectSettlement,
  type ProjectTransfer,
} from "../hooks/useProjects";
import { useLocale } from "../hooks/useLocale";
import { useTheme } from "../hooks/useTheme";
import { formatCurrency } from "../lib/currency";
import { ReceiptCustomFooter } from "./ReceiptCustomFooter";
import { resolveReceiptFooterText } from "../lib/receiptFooter";
import { rtlRow } from "../lib/rtl";

export type ProjectReceiptCardProps = {
  width: number;
  projectName: string;
  dateRangeLabel: string;
  currencyCode: string;
  isPro: boolean;
  hideReceiptBranding?: boolean;
  customFooter?: string;
  participants: ProjectParticipant[];
  expenses: ProjectExpense[];
  settlements: ProjectSettlement[];
  transfers?: ProjectTransfer[];
  /** Emphasizes one person's balance (individual share receipt). */
  focusParticipantId?: string;
};

type ReceiptColors = {
  background: string;
  text: string;
  accent: string;
  divider: string;
  muted: string;
  surface: string;
  accentSoft: string;
};

function receiptColorsForTheme(isDark: boolean): ReceiptColors {
  return getReceiptColors(isDark);
}

export const ProjectReceiptCard = memo(function ProjectReceiptCard({
  width,
  projectName,
  dateRangeLabel,
  currencyCode,
  isPro,
  hideReceiptBranding = false,
  customFooter = "",
  participants,
  expenses,
  settlements,
  transfers: transfersProp,
  focusParticipantId,
}: ProjectReceiptCardProps) {
  const { t, isRTL } = useLocale();
  const { isDark } = useTheme();
  const colors = useMemo(() => receiptColorsForTheme(isDark), [isDark]);
  const showBranding = !(isPro && hideReceiptBranding);
  const footerText = useMemo(
    () => resolveReceiptFooterText(isPro, customFooter),
    [customFooter, isPro]
  );

  const title = projectName.trim() || t("projectDefaultName");
  const total = useMemo(
    () => expenses.reduce((sum, e) => sum + (Number.isFinite(e.amount) ? e.amount : 0), 0),
    [expenses]
  );

  const participantIds = useMemo(() => participants.map((p) => p.id), [participants]);

  const balances = useMemo(
    () => computeParticipantBalances(participants, expenses),
    [expenses, participants]
  );

  const transfers = useMemo(() => {
    if (transfersProp && transfersProp.length > 0) {
      return transfersProp;
    }
    return computeSettlementTransfers(participants, balances);
  }, [balances, participants, transfersProp]);

  const focusTransfer = useMemo(
    () => transfers.find((tr) => tr.fromParticipantId === focusParticipantId),
    [focusParticipantId, transfers]
  );

  const settlementByParticipant = useMemo(() => {
    const map = new Map<string, ProjectSettlement>();
    for (const s of settlements) {
      map.set(s.participantId, s);
    }
    return map;
  }, [settlements]);

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const p of participants) {
      map.set(p.id, p.name);
    }
    return map;
  }, [participants]);

  return (
    <View
      style={[
        styles.root,
        {
          width,
          backgroundColor: colors.background,
          borderColor: colors.divider,
        },
      ]}
    >
      <View style={[styles.accentBar, { backgroundColor: colors.accent }]} />

      <View style={styles.inner}>
        {showBranding ? (
          <Text style={[styles.brand, { color: colors.accent }]}>{t("receiptBrandLabel")}</Text>
        ) : null}
        <Text style={[styles.titleMain, { color: colors.text }]} numberOfLines={3}>
          {title}
        </Text>
        <Text style={[styles.date, { color: colors.muted }]}>{dateRangeLabel}</Text>

        <View style={[styles.hairline, { backgroundColor: colors.divider }]} />

        <View style={styles.block}>
          {expenses.length === 0 ? (
            <Text style={[styles.mutedLine, { color: colors.muted }]}>{t("projectNoExpenses")}</Text>
          ) : (
            expenses.map((expense) => {
              const payments = getExpensePayments(expense, participantIds).filter((p) => p.amount > 0);
              return (
                <View key={expense.id} style={styles.expenseItem}>
                  <View style={[styles.row, rtlRow(isRTL)]}>
                    <Text style={[styles.lineLabel, { color: colors.text }]} numberOfLines={2}>
                      {expense.description}
                    </Text>
                    <Text style={[styles.lineVal, { color: colors.text }]}>
                      {formatCurrency(expense.amount, currencyCode)}
                    </Text>
                  </View>
                  {payments.map((payment) => (
                    <Text
                      key={`${expense.id}-${payment.participantId}`}
                      style={[styles.paidByLine, { color: colors.muted }]}
                    >
                      {t("projectExpensePaidLine", {
                        name: nameById.get(payment.participantId) ?? "",
                        amount: formatCurrency(payment.amount, currencyCode),
                      })}
                    </Text>
                  ))}
                </View>
              );
            })
          )}
        </View>

        <View style={[styles.hairline, { backgroundColor: colors.divider }]} />

        <View style={[styles.row, rtlRow(isRTL)]}>
          <Text style={[styles.lineLabelBold, { color: colors.text }]}>{t("projectReceiptTotalLabel")}</Text>
          <Text style={[styles.lineValBold, { color: colors.text }]}>
            {formatCurrency(total, currencyCode)}
          </Text>
        </View>

        <View style={[styles.hairline, { backgroundColor: colors.divider }]} />

        {focusTransfer ? (
          <View style={[styles.focusBox, { backgroundColor: colors.accentSoft ?? colors.surface }]}>
            <Text style={[styles.focusAmount, { color: colors.accent }]}>
              {t("projectReceiptTransferLine", {
                from: focusTransfer.fromParticipantName,
                to: focusTransfer.toParticipantName,
                amount: formatCurrency(focusTransfer.amount, currencyCode),
              })}
            </Text>
          </View>
        ) : null}

        <Text style={[styles.sectionHeading, { color: colors.muted }]}>{t("projectReceiptWhoPaidTitle")}</Text>
        <View style={styles.block}>
          {balances.map((row) => (
            <View key={`paid-${row.participantId}`} style={[styles.row, rtlRow(isRTL)]}>
              <Text style={[styles.lineLabel, { color: colors.text }]} numberOfLines={1}>
                {row.participantName}
              </Text>
              <Text style={[styles.lineVal, { color: colors.text }]}>
                {formatCurrency(row.paid, currencyCode)}
              </Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionHeading, { color: colors.muted }]}>{t("projectReceiptBalancesTitle")}</Text>
        <View style={styles.block}>
          {balances.map((row) => {
            const isFocus = row.participantId === focusParticipantId;
            const statusText =
              row.netBalance > 0.005
                ? t("projectReceiptCredit", { amount: formatCurrency(row.netBalance, currencyCode) })
                : row.netBalance < -0.005
                  ? t("projectReceiptNetOwes", { amount: formatCurrency(-row.netBalance, currencyCode) })
                  : t("projectReceiptSettled");
            return (
              <View
                key={`bal-${row.participantId}`}
                style={[
                  styles.row,
                  rtlRow(isRTL),
                  isFocus && styles.rowFocus,
                  isFocus && { backgroundColor: colors.surface },
                ]}
              >
                <Text
                  style={[styles.lineLabel, isFocus && styles.lineLabelFocus, { color: colors.text }]}
                  numberOfLines={1}
                >
                  {row.participantName}
                </Text>
                <Text
                  style={[
                    styles.lineVal,
                    row.netBalance < -0.005 && styles.lineValOwed,
                    {
                      color:
                        row.netBalance < -0.005
                          ? colors.accent
                          : row.netBalance > 0.005
                            ? colors.muted
                            : colors.muted,
                    },
                  ]}
                >
                  {statusText}
                </Text>
              </View>
            );
          })}
        </View>

        {transfers.length > 0 ? (
          <>
            <Text style={[styles.sectionHeading, { color: colors.muted }]}>
              {t("projectReceiptSettlementTitle")}
            </Text>
            <View style={styles.block}>
              {transfers.map((transfer) => (
                <Text
                  key={transfer.id}
                  style={[styles.transferLine, { color: colors.text }]}
                  numberOfLines={2}
                >
                  {t("projectReceiptTransferLine", {
                    from: transfer.fromParticipantName,
                    to: transfer.toParticipantName,
                    amount: formatCurrency(transfer.amount, currencyCode),
                  })}
                </Text>
              ))}
            </View>
          </>
        ) : (
          <View style={styles.block}>
            {balances.map((row) => {
              const owed = settlementByParticipant.get(row.participantId)?.totalOwed ?? 0;
              if (owed <= 0.005) {
                return null;
              }
              return (
                <View key={`legacy-${row.participantId}`} style={[styles.row, rtlRow(isRTL)]}>
                  <Text style={[styles.lineLabel, { color: colors.text }]} numberOfLines={1}>
                    {row.participantName}
                  </Text>
                  <Text style={[styles.lineVal, styles.lineValOwed, { color: colors.accent }]}>
                    {t("projectReceiptOwes", { amount: formatCurrency(owed, currencyCode) })}
                  </Text>
                </View>
              );
            })}
          </View>
        )}

        <ReceiptCustomFooter text={footerText} color={colors.muted} />
        {showBranding ? (
          <Text style={[styles.madeWith, { color: colors.muted }]}>{t("projectReceiptMadeWith")}</Text>
        ) : null}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  root: {
    alignSelf: "center",
    flexShrink: 0,
    borderWidth: StyleSheet.hairlineWidth,
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
  brand: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 2.6,
    textTransform: "uppercase",
    textAlign: "center",
    marginBottom: 6,
  },
  inner: {
    paddingHorizontal: 22,
    paddingTop: 18,
    paddingBottom: 16,
    gap: 10,
  },
  hairline: {
    height: StyleSheet.hairlineWidth,
    width: "100%",
    marginVertical: 4,
  },
  titleMain: {
    fontFamily: fonts.bodyBold,
    fontSize: 22,
    letterSpacing: -0.5,
    textAlign: "center",
    lineHeight: 28,
  },
  date: {
    fontFamily: fonts.body,
    fontSize: 12,
    textAlign: "center",
    marginBottom: 4,
  },
  block: {
    gap: 8,
    width: "100%",
  },
  expenseItem: {
    gap: 2,
  },
  paidByLine: {
    fontFamily: fonts.body,
    fontSize: 11,
    paddingLeft: 4,
  },
  transferLine: {
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
  },
  mutedLine: {
    fontFamily: fonts.body,
    fontSize: 13,
    textAlign: "center",
  },
  sectionHeading: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 11,
    letterSpacing: 1.2,
    textTransform: "uppercase",
    textAlign: "center",
    marginTop: 6,
    marginBottom: 4,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
    paddingVertical: 3,
  },
  rowFocus: {
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  lineLabel: {
    fontFamily: fonts.body,
    fontSize: 13,
    flex: 1,
    paddingRight: 8,
  },
  lineLabelFocus: {
    fontFamily: fonts.bodySemiBold,
  },
  lineVal: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 13,
    flexShrink: 0,
  },
  lineValOwed: {
    fontFamily: fonts.bodyBold,
  },
  lineLabelBold: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
    flex: 1,
  },
  lineValBold: {
    fontFamily: fonts.bodyBold,
    fontSize: 14,
  },
  focusBox: {
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  focusAmount: {
    fontFamily: fonts.bodyBold,
    fontSize: typography.resultPrimary.fontSize,
    letterSpacing: typography.resultPrimary.letterSpacing,
    textAlign: "center",
  },
  madeWith: {
    fontFamily: fonts.body,
    fontSize: 10,
    letterSpacing: 0.3,
    textAlign: "center",
    marginTop: 8,
  },
});
