import { useMemo } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Pressable } from "react-native-gesture-handler";
import * as Haptics from "../lib/appHaptics";

import { CastPersonPicker } from "./CastPersonPicker";
import { fonts, radii, spacing, touchTarget, typography, type AppColors } from "../constants/theme";
import { useColors } from "../hooks/useColors";
import { useLocale } from "../hooks/useLocale";
import { isDefaultPersonLabel, type Person } from "../hooks/usePeople";
import type { ShareLine } from "../lib/customShares";
import { sharesSum } from "../lib/customShares";
import { formatCurrency } from "../lib/currency";
import { rtlRow } from "../lib/rtl";

type Props = {
  enabled: boolean;
  onEnabledChange: (enabled: boolean) => void;
  lines: ShareLine[];
  onChangeLine: (id: string, patch: Partial<ShareLine>) => void;
  totalAmount: number;
  currencyCode: string;
  isPro: boolean;
  onRequirePro: () => void;
  balanced: boolean;
};

export function ShareAssigner({
  enabled,
  onEnabledChange,
  lines,
  onChangeLine,
  totalAmount,
  currencyCode,
  isPro,
  onRequirePro,
  balanced,
}: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t, isRTL } = useLocale();
  const sum = sharesSum(lines);

  const toggle = () => {
    if (!enabled && !isPro) {
      onRequirePro();
      return;
    }
    void Haptics.selectionAsync();
    onEnabledChange(!enabled);
  };

  return (
    <View style={styles.wrap}>
      <View style={[styles.header, rtlRow(isRTL)]}>
        <View style={styles.headerCopy}>
          <Text style={styles.title}>{t("customSharesTitle")}</Text>
          <Text style={styles.sub}>{t("customSharesSubtitle")}</Text>
        </View>
        <Pressable
          onPress={toggle}
          style={[styles.toggle, enabled ? styles.toggleOn : styles.toggleOff]}
          accessibilityRole="switch"
          accessibilityState={{ checked: enabled }}
          accessibilityLabel={t("customSharesTitle")}
        >
          <Text style={[styles.toggleText, enabled && styles.toggleTextOn]}>
            {enabled ? t("customSharesOn") : t("customSharesOff")}
          </Text>
        </Pressable>
      </View>

      {enabled ? (
        <View style={styles.list}>
          <CastPersonPicker
            excludeNames={lines
              .filter(
                (line) =>
                  !isDefaultPersonLabel(line.name, t("sharePersonPrefix")) &&
                  !isDefaultPersonLabel(line.name, "P")
              )
              .map((line) => line.name)}
            onPick={(person: Person) => {
              const target = lines.find(
                (line) =>
                  isDefaultPersonLabel(line.name, t("sharePersonPrefix")) ||
                  isDefaultPersonLabel(line.name, "P")
              );
              if (target) {
                onChangeLine(target.id, { name: person.name });
              }
            }}
          />
          {lines.map((line) => (
            <View key={line.id} style={[styles.row, rtlRow(isRTL)]}>
              <TextInput
                value={line.name}
                onChangeText={(name) => onChangeLine(line.id, { name })}
                style={styles.nameInput}
                placeholder={t("personNamePlaceholder")}
                placeholderTextColor={colors.textSecondary}
              />
              <TextInput
                value={line.amount > 0 ? String(line.amount) : ""}
                onChangeText={(raw) => {
                  const cleaned = raw.replace(/[^\d.]/g, "");
                  const n = parseFloat(cleaned);
                  onChangeLine(line.id, {
                    amount: Number.isFinite(n) ? n : 0,
                  });
                }}
                keyboardType="decimal-pad"
                style={styles.amountInput}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
              />
            </View>
          ))}
          <View style={[styles.footer, rtlRow(isRTL)]}>
            <Text style={[styles.footerLabel, balanced ? styles.ok : styles.bad]}>
              {balanced
                ? t("customSharesBalanced")
                : t("customSharesMismatch", {
                    sum: formatCurrency(sum, currencyCode),
                    total: formatCurrency(totalAmount, currencyCode),
                  })}
            </Text>
          </View>
        </View>
      ) : null}
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    wrap: {
      gap: spacing.sm,
      padding: spacing.md,
      borderRadius: radii.xl,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    headerCopy: {
      flex: 1,
      gap: 2,
    },
    title: {
      ...typography.body,
      fontFamily: fonts.bodyBold,
      color: colors.textPrimary,
      fontSize: 15,
    },
    sub: {
      ...typography.badge,
      color: colors.textSecondary,
      lineHeight: 16,
    },
    toggle: {
      minHeight: touchTarget.min - 8,
      paddingHorizontal: 14,
      borderRadius: radii.pill,
      borderWidth: 1.5,
      alignItems: "center",
      justifyContent: "center",
    },
    toggleOff: {
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    toggleOn: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    toggleText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: colors.textSecondary,
    },
    toggleTextOn: {
      color: colors.textPrimary,
    },
    list: {
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    row: {
      flexDirection: "row",
      gap: spacing.sm,
    },
    nameInput: {
      flex: 1.4,
      minHeight: 44,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.sm,
      fontFamily: fonts.body,
      color: colors.textPrimary,
    },
    amountInput: {
      flex: 1,
      minHeight: 44,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.sm,
      fontFamily: fonts.mono,
      color: colors.textPrimary,
      textAlign: "right",
    },
    footer: {
      paddingTop: spacing.xs,
    },
    footerLabel: {
      ...typography.badge,
      fontFamily: fonts.bodySemiBold,
    },
    ok: {
      color: "#2F9E44",
    },
    bad: {
      color: "#C92A2A",
    },
  });
}
