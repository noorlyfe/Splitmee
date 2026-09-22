import { useMemo, useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";
import { Pressable } from "react-native-gesture-handler";
import * as Haptics from "../lib/appHaptics";

import { CastPersonPicker } from "./CastPersonPicker";
import { fonts, radii, spacing, touchTarget, typography, type AppColors } from "../constants/theme";
import { useColors } from "../hooks/useColors";
import { useLocale } from "../hooks/useLocale";
import { isDefaultPersonLabel, type Person } from "../hooks/usePeople";
import {
  computeItemizedSplit,
  computePercentSplit,
  createBillItem,
  percentSum,
  type BillItem,
  type ItemizedPerson,
} from "../lib/itemized";
import { formatCurrency } from "../lib/currency";
import { rtlRow } from "../lib/rtl";

export type SplitMode = "even" | "items" | "percent";

type Props = {
  mode: SplitMode;
  onModeChange: (mode: SplitMode) => void;
  people: ItemizedPerson[];
  onChangePersonName: (id: string, name: string) => void;
  items: BillItem[];
  onChangeItems: (items: BillItem[]) => void;
  percents: Record<string, number>;
  onChangePercent: (id: string, percent: number) => void;
  tipAmount: number;
  totalWithTip: number;
  currencyCode: string;
  isPro: boolean;
  onRequirePro: () => void;
};

export function ItemizedEditor({
  mode,
  onModeChange,
  people,
  onChangePersonName,
  items,
  onChangeItems,
  percents,
  onChangePercent,
  tipAmount,
  totalWithTip,
  currencyCode,
  isPro,
  onRequirePro,
}: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t, isRTL } = useLocale();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const setMode = (next: SplitMode) => {
    if (next !== "even" && !isPro) {
      onRequirePro();
      return;
    }
    void Haptics.selectionAsync();
    onModeChange(next);
  };

  const itemized = useMemo(
    () => computeItemizedSplit(items, people, tipAmount),
    [items, people, tipAmount]
  );

  const percentPeople = people.map((p) => ({
    ...p,
    percent: percents[p.id] ?? roundEven(people.length),
  }));
  const pctOk = Math.abs(percentSum(percentPeople) - 100) <= 0.5;
  const percentTotals = computePercentSplit(percentPeople, totalWithTip);

  return (
    <View style={styles.wrap}>
      <Text style={styles.title}>{t("itemizedTitle")}</Text>
      <Text style={styles.sub}>{t("itemizedSubtitle")}</Text>

      <View style={[styles.modeRow, rtlRow(isRTL)]}>
        {(
          [
            ["even", t("itemizedModeEven")],
            ["items", t("itemizedModeItems")],
            ["percent", t("itemizedModePercent")],
          ] as const
        ).map(([id, label]) => {
          const active = mode === id;
          return (
            <Pressable
              key={id}
              onPress={() => setMode(id)}
              style={[styles.modeChip, active ? styles.modeOn : styles.modeOff]}
            >
              <Text style={[styles.modeText, active && styles.modeTextOn]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>

      {mode !== "even" ? (
        <View style={styles.peopleBlock}>
          <CastPersonPicker
            excludeNames={people
              .filter(
                (p) =>
                  !isDefaultPersonLabel(p.name, t("sharePersonPrefix")) &&
                  !isDefaultPersonLabel(p.name, "P")
              )
              .map((p) => p.name)}
            onPick={(person: Person) => {
              const target = people.find(
                (p) =>
                  isDefaultPersonLabel(p.name, t("sharePersonPrefix")) ||
                  isDefaultPersonLabel(p.name, "P")
              );
              if (target) {
                onChangePersonName(target.id, person.name);
              }
            }}
          />
          {people.map((p) => (
            <TextInput
              key={p.id}
              value={p.name}
              onChangeText={(name) => onChangePersonName(p.id, name)}
              style={styles.nameInput}
              placeholder={t("personNamePlaceholder")}
              placeholderTextColor={colors.textSecondary}
            />
          ))}
        </View>
      ) : null}

      {mode === "items" ? (
        <View style={styles.list}>
          {items.map((item) => {
            const open = expandedItem === item.id;
            return (
              <View key={item.id} style={styles.itemCard}>
                <View style={[styles.itemRow, rtlRow(isRTL)]}>
                  <TextInput
                    value={item.name}
                    onChangeText={(name) =>
                      onChangeItems(items.map((it) => (it.id === item.id ? { ...it, name } : it)))
                    }
                    style={styles.itemName}
                    placeholder={t("itemizedItemName")}
                    placeholderTextColor={colors.textSecondary}
                  />
                  <TextInput
                    value={item.amount > 0 ? String(item.amount) : ""}
                    onChangeText={(raw) => {
                      const n = parseFloat(raw.replace(/[^\d.]/g, ""));
                      onChangeItems(
                        items.map((it) =>
                          it.id === item.id ? { ...it, amount: Number.isFinite(n) ? n : 0 } : it
                        )
                      );
                    }}
                    keyboardType="decimal-pad"
                    style={styles.itemAmt}
                    placeholder="0"
                    placeholderTextColor={colors.textSecondary}
                  />
                </View>
                <Pressable
                  onPress={() => setExpandedItem(open ? null : item.id)}
                  style={styles.assignToggle}
                >
                  <Text style={styles.assignToggleText}>
                    {item.assignedIds.length === 0
                      ? t("itemizedEveryone")
                      : t("itemizedAssignedCount", { count: item.assignedIds.length })}
                  </Text>
                </Pressable>
                {open ? (
                  <View style={[styles.assignRow, rtlRow(isRTL)]}>
                    {people.map((p) => {
                      const on = item.assignedIds.includes(p.id);
                      return (
                        <Pressable
                          key={p.id}
                          onPress={() => {
                            void Haptics.selectionAsync();
                            const next = on
                              ? item.assignedIds.filter((id) => id !== p.id)
                              : [...item.assignedIds, p.id];
                            onChangeItems(
                              items.map((it) =>
                                it.id === item.id ? { ...it, assignedIds: next } : it
                              )
                            );
                          }}
                          style={[styles.personChip, on ? styles.personOn : styles.personOff]}
                        >
                          <Text style={styles.personChipText} numberOfLines={1}>
                            {p.name}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                ) : null}
              </View>
            );
          })}
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              onChangeItems([...items, createBillItem()]);
            }}
            style={styles.addBtn}
          >
            <Text style={styles.addBtnText}>{t("itemizedAddItem")}</Text>
          </Pressable>
          <Text style={styles.footer}>
            {t("itemizedItemsTotal", {
              total: formatCurrency(itemized.itemTotal, currencyCode),
            })}
          </Text>
          {people.map((p) => (
            <Text key={p.id} style={styles.perLine}>
              {p.name}: {formatCurrency(itemized.grandPerPerson[p.id] ?? 0, currencyCode)}
            </Text>
          ))}
        </View>
      ) : null}

      {mode === "percent" ? (
        <View style={styles.list}>
          {people.map((p) => (
            <View key={p.id} style={[styles.pctRow, rtlRow(isRTL)]}>
              <Text style={styles.pctName} numberOfLines={1}>
                {p.name}
              </Text>
              <TextInput
                value={String(percents[p.id] ?? "")}
                onChangeText={(raw) => {
                  const n = parseFloat(raw.replace(/[^\d.]/g, ""));
                  onChangePercent(p.id, Number.isFinite(n) ? n : 0);
                }}
                keyboardType="decimal-pad"
                style={styles.pctInput}
                placeholder="0"
                placeholderTextColor={colors.textSecondary}
              />
              <Text style={styles.pctSym}>%</Text>
              <Text style={styles.pctAmt}>
                {formatCurrency(percentTotals[p.id] ?? 0, currencyCode)}
              </Text>
            </View>
          ))}
          <Text style={[styles.footer, pctOk ? styles.ok : styles.bad]}>
            {pctOk
              ? t("itemizedPercentOk")
              : t("itemizedPercentBad", { sum: String(percentSum(percentPeople)) })}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

function roundEven(n: number): number {
  return Math.round((100 / Math.max(1, n)) * 100) / 100;
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
      marginBottom: spacing.xs,
    },
    modeRow: { flexDirection: "row", gap: spacing.sm, flexWrap: "wrap" },
    modeChip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radii.pill,
      borderWidth: 1.5,
      minHeight: touchTarget.min - 8,
      justifyContent: "center",
    },
    modeOff: { borderColor: colors.border, backgroundColor: colors.background },
    modeOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    modeText: { fontFamily: fonts.bodySemiBold, fontSize: 12, color: colors.textSecondary },
    modeTextOn: { color: colors.textPrimary },
    peopleBlock: { gap: spacing.sm },
    nameInput: {
      minHeight: 44,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.sm,
      fontFamily: fonts.body,
      color: colors.textPrimary,
    },
    list: { gap: spacing.sm },
    itemCard: {
      gap: 6,
      padding: spacing.sm,
      borderRadius: radii.lg,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
    },
    itemRow: { flexDirection: "row", gap: spacing.sm },
    itemName: {
      flex: 1.4,
      minHeight: 40,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.sm,
      fontFamily: fonts.body,
      color: colors.textPrimary,
    },
    itemAmt: {
      flex: 0.8,
      minHeight: 40,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: spacing.sm,
      fontFamily: fonts.mono,
      color: colors.textPrimary,
      textAlign: "right",
    },
    assignToggle: { paddingVertical: 4 },
    assignToggleText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 12,
      color: colors.accent,
    },
    assignRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
    personChip: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: radii.pill,
      borderWidth: 1.5,
      maxWidth: 120,
    },
    personOff: { borderColor: colors.border },
    personOn: { borderColor: colors.accent, backgroundColor: colors.accentSoft },
    personChipText: { fontSize: 12, fontFamily: fonts.bodySemiBold, color: colors.textPrimary },
    addBtn: {
      minHeight: 44,
      alignItems: "center",
      justifyContent: "center",
      borderRadius: radii.lg,
      borderWidth: 1.5,
      borderColor: colors.accent,
      borderStyle: "dashed",
    },
    addBtnText: { fontFamily: fonts.bodySemiBold, color: colors.accent },
    footer: { ...typography.badge, fontFamily: fonts.bodySemiBold, color: colors.textSecondary },
    perLine: { fontFamily: fonts.mono, fontSize: 12, color: colors.textPrimary },
    pctRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    pctName: { flex: 1, fontFamily: fonts.bodySemiBold, color: colors.textPrimary },
    pctInput: {
      width: 64,
      minHeight: 40,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radii.md,
      paddingHorizontal: 8,
      textAlign: "right",
      fontFamily: fonts.mono,
      color: colors.textPrimary,
    },
    pctSym: { color: colors.textSecondary, fontFamily: fonts.bodySemiBold },
    pctAmt: { width: 88, textAlign: "right", fontFamily: fonts.mono, color: colors.textPrimary },
    ok: { color: "#2F9E44" },
    bad: { color: "#C92A2A" },
  });
}
