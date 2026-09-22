import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Pressable } from "react-native-gesture-handler";
import * as Haptics from "../lib/appHaptics";

import { fonts, radii, spacing, type AppColors } from "../constants/theme";
import { useColors } from "../hooks/useColors";
import { useLocale } from "../hooks/useLocale";
import { SPLIT_CATEGORIES, type SplitCategoryId } from "../lib/categories";
import { rtlRow } from "../lib/rtl";

type Props = {
  value: SplitCategoryId;
  onChange: (id: SplitCategoryId) => void;
};

export function CategoryChips({ value, onChange }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t, isRTL } = useLocale();

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{t("categoryLabel")}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, rtlRow(isRTL)]}
        keyboardShouldPersistTaps="handled"
      >
        {SPLIT_CATEGORIES.map((cat) => {
          const active = value === cat.id;
          return (
            <Pressable
              key={cat.id}
              onPress={() => {
                void Haptics.selectionAsync();
                onChange(cat.id);
              }}
              style={[styles.chip, active ? styles.chipActive : styles.chipIdle]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={t(cat.labelKey)}
            >
              <Text style={styles.emoji}>{cat.emoji}</Text>
              <Text style={[styles.chipText, active && styles.chipTextActive]} numberOfLines={1}>
                {t(cat.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    wrap: {
      gap: spacing.sm,
    },
    label: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
    row: {
      flexDirection: "row",
      gap: spacing.sm,
      paddingVertical: 2,
    },
    chip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radii.pill,
      borderWidth: 1.5,
    },
    chipIdle: {
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    chipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    emoji: {
      fontSize: 14,
    },
    chipText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: colors.textSecondary,
    },
    chipTextActive: {
      color: colors.textPrimary,
    },
  });
}
