import { useMemo } from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Pressable } from "react-native-gesture-handler";
import * as Haptics from "../lib/appHaptics";

import { fonts, radii, spacing, type AppColors } from "../constants/theme";
import { useColors } from "../hooks/useColors";
import { useLocale } from "../hooks/useLocale";
import { personNamesMatch, usePeople, type Person } from "../hooks/usePeople";
import { rtlRow } from "../lib/rtl";

type Props = {
  excludeNames: string[];
  onPick: (person: Person) => void;
};

export function CastPersonPicker({ excludeNames, onPick }: Props) {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);
  const { t, isRTL } = useLocale();
  const { people, loading } = usePeople();

  const available = useMemo(
    () =>
      people.filter(
        (person) => !excludeNames.some((name) => personNamesMatch(name, person.name))
      ),
    [excludeNames, people]
  );

  if (loading || people.length === 0 || available.length === 0) {
    return null;
  }

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{t("castPickLabel")}</Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.row, rtlRow(isRTL)]}
        keyboardShouldPersistTaps="handled"
      >
        {available.map((person) => (
          <Pressable
            key={person.id}
            onPress={() => {
              void Haptics.selectionAsync();
              onPick(person);
            }}
            style={styles.chip}
            accessibilityRole="button"
            accessibilityLabel={t("castPickPersonA11y", { name: person.name })}
          >
            <Text style={styles.chipText} numberOfLines={1}>
              {person.name}
            </Text>
          </Pressable>
        ))}
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
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: radii.pill,
      borderWidth: 1.5,
      borderColor: colors.border,
      backgroundColor: colors.background,
      maxWidth: 160,
    },
    chipText: {
      fontFamily: fonts.bodySemiBold,
      fontSize: 13,
      color: colors.textPrimary,
    },
  });
}
