import { useMemo } from "react";
import { StyleSheet, Text, View, type StyleProp, type TextStyle } from "react-native";

import { fonts, spacing, type AppColors } from "../constants/theme";
import { useColors } from "../hooks/useColors";
import { formatCurrency } from "../lib/currency";
import type { AmountsByCurrency } from "../lib/moneyByCurrency";
import { rtlRow } from "../lib/rtl";
import { useLocale } from "../hooks/useLocale";

type Size = "hero" | "body" | "compact";
type Align = "left" | "right" | "center";

type Props = {
  amounts: AmountsByCurrency;
  size?: Size;
  align?: Align;
  color?: string;
  mutedColor?: string;
  /** Applied to every amount Text (single and mixed). */
  style?: StyleProp<TextStyle>;
  /** Show ISO code beside amount when mixed (always for mixed). */
  showCodeWhenMixed?: boolean;
};

/**
 * Single currency → one amount (current look).
 * Multiple → stacked lines, one per currency. Never merges codes.
 */
export function MoneyByCurrency({
  amounts,
  size = "body",
  align = "right",
  color,
  mutedColor,
  style,
  showCodeWhenMixed = true,
}: Props) {
  const colors = useColors();
  const { isRTL } = useLocale();
  const styles = useMemo(() => createStyles(colors, size, align), [align, colors, size]);
  const textColor = color ?? colors.textPrimary;
  const codeColor = mutedColor ?? colors.textSecondary;

  const lines =
    amounts.lines.length > 0
      ? amounts.lines
      : amounts.single
        ? [amounts.single]
        : [{ currency: "USD", amount: 0 }];

  const mixed = amounts.mixed && lines.length > 1;

  if (!mixed) {
    const line = lines[0]!;
    return (
      <Text style={[styles.amount, { color: textColor, textAlign: align }, style]}>
        {formatCurrency(line.amount, line.currency)}
      </Text>
    );
  }

  return (
    <View style={styles.stack}>
      {lines.map((line) => (
        <View key={line.currency} style={[styles.row, rtlRow(isRTL)]}>
          {showCodeWhenMixed ? (
            <Text style={[styles.code, { color: codeColor }]}>{line.currency}</Text>
          ) : null}
          <Text style={[styles.amount, { color: textColor }, style]}>
            {formatCurrency(line.amount, line.currency)}
          </Text>
        </View>
      ))}
    </View>
  );
}

function createStyles(colors: AppColors, size: Size, align: Align) {
  const amountSize = size === "hero" ? 28 : size === "compact" ? 14 : 18;
  const codeSize = size === "hero" ? 12 : size === "compact" ? 10 : 11;
  const gap = size === "hero" ? 6 : size === "compact" ? 2 : 4;

  return StyleSheet.create({
    stack: {
      gap,
      alignItems: align === "left" ? "flex-start" : align === "center" ? "center" : "flex-end",
    },
    row: {
      flexDirection: "row",
      alignItems: "baseline",
      gap: spacing.xs,
      justifyContent:
        align === "left" ? "flex-start" : align === "center" ? "center" : "flex-end",
    },
    code: {
      fontFamily: fonts.bodySemiBold,
      fontSize: codeSize,
      letterSpacing: 0.6,
      textTransform: "uppercase",
      minWidth: size === "compact" ? 28 : 34,
    },
    amount: {
      fontFamily: fonts.bodyBold,
      fontSize: amountSize,
      letterSpacing: size === "hero" ? -0.8 : -0.3,
      color: colors.textPrimary,
      fontVariant: ["tabular-nums"],
    },
  });
}
