import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { Pressable } from "react-native-gesture-handler";
import * as Haptics from "../lib/appHaptics";

import { fonts, radii, spacing, typography, type AppColors } from "../constants/theme";
import { useColors } from "../hooks/useColors";
import { useLocale } from "../hooks/useLocale";
import { formatCurrency, getSplitQuickCurrencies } from "../lib/currency";
import { convertAmount, type FxRateTable } from "../lib/fx";
import { rtlRow } from "../lib/rtl";

type Props = {
  appCurrency: string;
  billCurrency: string;
  onBillCurrencyChange: (code: string) => void;
  rates: FxRateTable;
  billAmount: number | null;
};

export function FxBillRow({
  appCurrency,
  billCurrency,
  onBillCurrencyChange,
  rates,
  billAmount,
}: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t, isRTL } = useLocale();
  const quick = useMemo(() => getSplitQuickCurrencies(appCurrency), [appCurrency]);

  const sameAsApp = billCurrency === appCurrency;
  const converted =
    billAmount != null && !sameAsApp
      ? convertAmount(billAmount, billCurrency, appCurrency, rates)
      : null;

  return (
    <View style={styles.wrap}>
      <View style={[styles.header, rtlRow(isRTL)]}>
        <Text style={styles.label}>{t("fxBillCurrency")}</Text>
        <Text style={styles.selectedHint} numberOfLines={1}>
          {sameAsApp ? t("fxSameCurrency") : billCurrency}
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipRow}
        keyboardShouldPersistTaps="handled"
      >
        {quick.map((code) => {
          const active = billCurrency === code;
          const isApp = code === appCurrency;
          return (
            <Pressable
              key={code}
              onPress={() => {
                void Haptics.selectionAsync();
                onBillCurrencyChange(code);
              }}
              style={[styles.chip, active ? styles.chipOn : styles.chipOff]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={isApp ? `${code}, ${t("fxSameCurrency")}` : code}
            >
              <Text style={[styles.chipText, active && styles.chipTextOn]}>{code}</Text>
              {isApp && !active ? <View style={styles.appDot} /> : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {converted != null ? (
        <View style={styles.convertCard}>
          <Text style={styles.convertAmount}>{formatCurrency(converted, appCurrency)}</Text>
          <Text style={styles.convertHint}>{t("fxInAppCurrency")}</Text>
        </View>
      ) : null}
    </View>
  );
}

/** Compact manual rate editor for settings. */
export function FxRateEditor({
  code,
  rate,
  onChange,
}: {
  code: string;
  rate: number;
  onChange: (rate: number) => void;
}) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  return (
    <View style={[styles.rateRow, rtlRow(false)]}>
      <Text style={styles.rateCode}>{code}</Text>
      <TextInput
        value={String(rate)}
        onChangeText={(raw) => {
          const n = parseFloat(raw.replace(/[^\d.]/g, ""));
          if (Number.isFinite(n) && n > 0) {
            onChange(n);
          }
        }}
        keyboardType="decimal-pad"
        style={styles.rateInput}
      />
      <Text style={styles.rateHint}>USD</Text>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    wrap: { gap: spacing.sm },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    label: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
    selectedHint: {
      fontFamily: fonts.body,
      fontSize: 12,
      color: colors.textSecondary,
      flexShrink: 1,
      textAlign: "right",
    },
    chipRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      paddingVertical: 2,
      paddingRight: spacing.sm,
    },
    chip: {
      minWidth: 52,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: radii.pill,
      borderWidth: StyleSheet.hairlineWidth,
      alignItems: "center",
      justifyContent: "center",
      flexDirection: "row",
      gap: 6,
    },
    chipOff: {
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipOn: {
      borderColor: colors.accent,
      backgroundColor: colors.accent,
    },
    chipText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      letterSpacing: 0.3,
      color: colors.textSecondary,
    },
    chipTextOn: {
      color: colors.pillActiveText,
    },
    appDot: {
      width: 5,
      height: 5,
      borderRadius: 3,
      backgroundColor: colors.accent,
    },
    convertCard: {
      marginTop: 2,
      borderRadius: radii.lg,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm + 2,
      gap: 2,
    },
    convertAmount: {
      fontFamily: fonts.bodyBold,
      fontSize: 16,
      letterSpacing: -0.3,
      color: colors.textPrimary,
    },
    convertHint: {
      ...typography.badge,
      color: colors.textSecondary,
    },
    rateRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 },
    rateCode: { width: 44, fontFamily: fonts.bodyBold, color: colors.textPrimary },
    rateInput: {
      flex: 1,
      minHeight: 40,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: 10,
      fontFamily: fonts.mono,
      color: colors.textPrimary,
    },
    rateHint: { width: 36, color: colors.textSecondary, fontFamily: fonts.bodySemiBold },
  });
}
