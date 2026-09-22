import { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "../../lib/appHaptics";
import { useFocusEffect, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppAlert } from "../../components/AppAlert";
import { ProLockedBlurOverlay } from "../../components/ProLockedBlurOverlay";
import { fonts, radii, spacing, touchTarget, typography, type AppColors } from "../../constants/theme";
import { useAppPreferences } from "../../hooks/useAppPreferences";
import { useColors } from "../../hooks/useColors";
import { useLocale } from "../../hooks/useLocale";
import { useProStatus } from "../../hooks/useProStatus";
import { useProjects } from "../../hooks/useProjects";
import { useSplitHistory } from "../../hooks/useSplitHistory";
import { useTheme } from "../../hooks/useTheme";
import { categoryMeta } from "../../lib/categories";
import { MoneyByCurrency } from "../../components/MoneyByCurrency";
import {
  buildDamageExportText,
  computeCategoryBreakdown,
  computeDamageStats,
} from "../../lib/insights";
import { formatAmountsByCurrency } from "../../lib/moneyByCurrency";
import { rtlRow } from "../../lib/rtl";
import { trackEvent } from "../../lib/analytics";

export default function DamageScreen() {
  const colors = useColors();
  const { isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, isRTL } = useLocale();
  const { isPro } = useProStatus();
  const { currency } = useAppPreferences();
  const { items, loading: splitsLoading, reload: reloadSplits } = useSplitHistory();
  const { projects, loading: projectsLoading, reload: reloadProjects } = useProjects();
  const [exportBusy, setExportBusy] = useState(false);
  const [showProAlert, setShowProAlert] = useState(false);

  useFocusEffect(
    useCallback(() => {
      void reloadSplits();
      void reloadProjects();
    }, [reloadProjects, reloadSplits])
  );

  const stats = useMemo(
    () => computeDamageStats(items, projects, currency),
    [currency, items, projects]
  );
  const categories = useMemo(() => computeCategoryBreakdown(items, currency), [currency, items]);
  const loading = splitsLoading || projectsLoading;

  const onExport = useCallback(async () => {
    if (!isPro) {
      setShowProAlert(true);
      return;
    }
    setExportBusy(true);
    try {
      const body = buildDamageExportText(stats, {
        title: t("damageExportTitle"),
        outstanding: t("damageOutstanding"),
        recovered: t("damageRecovered"),
        collection: t("damageCollection"),
        avgDays: t("damageAvgDays"),
        maxWait: t("damageMaxWait"),
        monthSplits: t("damageMonthSplits"),
        footer: t("damageExportFooter"),
      });
      await Share.share({ message: body });
      void trackEvent("damage_export");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setExportBusy(false);
    }
  }, [isPro, stats, t]);

  const bottomPad = Math.max(insets.bottom, spacing.sm) + 88;
  const collectionPct = `${Math.round(stats.collectionRate * 100)}%`;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: bottomPad }]}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={colors.accent} size="large" />
          </View>
        ) : (
          <>
            <View style={styles.heroCard}>
              <MoneyByCurrency
                amounts={stats.outstanding}
                size={stats.outstanding.mixed ? "body" : "hero"}
                align="center"
                color={colors.textPrimary}
              />
              <Text style={styles.heroLabel}>{t("damageOutstanding")}</Text>
              <View style={styles.heatTrack}>
                <View
                  style={[
                    styles.heatFill,
                    {
                      width: `${Math.max(6, Math.round(stats.heatScore * 100))}%`,
                    },
                  ]}
                />
              </View>
              <Text style={styles.heatCaption}>
                {t("damageHeatCaption", { days: stats.maxDaysWaiting })}
              </Text>
            </View>

            <View style={styles.grid}>
              <View style={styles.statTile}>
                <MoneyByCurrency
                  amounts={stats.recovered}
                  size="body"
                  align="left"
                  color={colors.textPrimary}
                  style={styles.statMoney}
                />
                <Text style={styles.statLabel}>{t("damageRecovered")}</Text>
                <Text style={styles.statHint}>{`${stats.paidCount}`}</Text>
              </View>
              <StatTile
                styles={styles}
                label={t("damageCollection")}
                value={collectionPct}
                hint={t("damageCollectionHint")}
              />
              <StatTile
                styles={styles}
                label={t("damageAvgDays")}
                value={stats.avgDaysToPay == null ? "?" : String(stats.avgDaysToPay)}
                hint={t("damageAvgDaysHint")}
              />
              <StatTile
                styles={styles}
                label={t("damageMonthSplits")}
                value={String(stats.splitsThisMonth)}
                hint={t("damageMonthSplitsHint")}
              />
            </View>

            <ProLockedBlurOverlay
              locked={!isPro}
              unlockMessage={t("damageProUnlock")}
              style={styles.proBlock}
            >
              <View style={styles.sectionCard}>
                <Text style={styles.sectionTitle}>{t("damageByCategory")}</Text>
                {categories.length === 0 ? (
                  <Text style={styles.emptyCat}>{t("damageNoCategories")}</Text>
                ) : (
                  categories.slice(0, 6).map((cat) => {
                    const meta = categoryMeta(cat.id);
                    const max = categories[0]?.total || 1;
                    const pct = Math.max(8, Math.round((cat.total / max) * 100));
                    return (
                      <View key={cat.id} style={styles.catRow}>
                        <View style={[styles.catTop, rtlRow(isRTL)]}>
                          <Text style={styles.catName}>{t(meta.labelKey)}</Text>
                          <Text style={styles.catAmount}>
                            {formatAmountsByCurrency(cat.amounts, { joiner: "  " })}
                          </Text>
                        </View>
                        <View style={styles.catTrack}>
                          <View style={[styles.catFill, { width: `${pct}%` }]} />
                        </View>
                      </View>
                    );
                  })
                )}
              </View>
            </ProLockedBlurOverlay>

            <Pressable
              onPress={() => void onExport()}
              disabled={exportBusy}
              style={({ pressed }) => [
                styles.exportBtn,
                pressed && styles.pressed,
                exportBusy && styles.disabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t("damageExport")}
            >
              {exportBusy ? (
                <ActivityIndicator color={colors.pillActiveText} />
              ) : (
                <Text style={styles.exportBtnText}>
                  {isPro ? t("damageExport") : t("damageExportPro")}
                </Text>
              )}
            </Pressable>
          </>
        )}
      </ScrollView>

      <AppAlert
        visible={showProAlert}
        title={t("nudgrrUnlimited")}
        message={t("damageProUnlock")}
        onRequestClose={() => setShowProAlert(false)}
        buttons={[
          { text: t("cancel"), onPress: () => setShowProAlert(false), style: "cancel" },
          {
            text: t("unlockNudgrr"),
            onPress: () => {
              setShowProAlert(false);
              router.push("/paywall");
            },
          },
        ]}
      />
    </View>
  );
}

function StatTile({
  styles,
  label,
  value,
  hint,
}: {
  styles: ReturnType<typeof createStyles>;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue} numberOfLines={1}>
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statHint}>{hint}</Text>
    </View>
  );
}

function createStyles(colors: AppColors, isDark: boolean) {
  const shadow = Platform.select({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.28 : colors.cardShadowOpacity,
      shadowRadius: 14,
    },
    android: { elevation: 3 },
    default: {},
  });

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      gap: spacing.lg,
    },
    loader: {
      paddingVertical: spacing.xxl,
      alignItems: "center",
    },
    heroCard: {
      borderRadius: radii.xl,
      backgroundColor: colors.surface,
      padding: spacing.lg,
      alignItems: "center",
      gap: spacing.sm,
      ...shadow,
    },
    heroAmount: {
      fontFamily: fonts.bodyBold,
      fontSize: 36,
      letterSpacing: -1,
      color: colors.accent,
      fontVariant: ["tabular-nums"],
    },
    heroLabel: {
      ...typography.badge,
      color: colors.textSecondary,
    },
    heatTrack: {
      width: "100%",
      height: 6,
      borderRadius: 999,
      backgroundColor: colors.accentSoft,
      overflow: "hidden",
      marginTop: spacing.xs,
    },
    heatFill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: colors.accent,
      opacity: 0.85,
    },
    heatCaption: {
      ...typography.badge,
      color: colors.textSecondary,
      textAlign: "center",
    },
    grid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    statTile: {
      width: "48%",
      flexGrow: 1,
      borderRadius: radii.xl,
      backgroundColor: colors.surface,
      padding: spacing.md,
      gap: 4,
      ...shadow,
    },
    statValue: {
      fontFamily: fonts.bodyBold,
      fontSize: 22,
      color: colors.textPrimary,
      fontVariant: ["tabular-nums"],
    },
    statMoney: {
      fontSize: 22,
      letterSpacing: -0.3,
    },
    statLabel: {
      ...typography.badge,
      fontFamily: fonts.bodySemiBold,
      color: colors.textPrimary,
    },
    statHint: {
      ...typography.badge,
      color: colors.textSecondary,
      fontSize: 11,
    },
    proBlock: {
      borderRadius: radii.xl,
      overflow: "hidden",
      minHeight: 168,
    },
    sectionCard: {
      borderRadius: radii.xl,
      backgroundColor: colors.surface,
      padding: spacing.lg,
      gap: spacing.md,
      // Avoid stacking a second clip that shaves the overlay at the edges.
      overflow: "visible",
      minHeight: 168,
    },
    sectionTitle: {
      ...typography.body,
      fontFamily: fonts.bodyBold,
      color: colors.textPrimary,
    },
    emptyCat: {
      ...typography.badge,
      color: colors.textSecondary,
    },
    catRow: {
      gap: 6,
    },
    catTop: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
    },
    catName: {
      ...typography.body,
      fontFamily: fonts.bodySemiBold,
      color: colors.textPrimary,
      fontSize: 14,
    },
    catAmount: {
      fontFamily: fonts.bodyBold,
      fontSize: 13,
      color: colors.textSecondary,
      fontVariant: ["tabular-nums"],
    },
    catTrack: {
      height: 6,
      borderRadius: 999,
      backgroundColor: colors.accentSoft,
      overflow: "hidden",
    },
    catFill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: colors.accent,
      opacity: 0.85,
    },
    exportBtn: {
      minHeight: touchTarget.min,
      borderRadius: radii.pill,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    exportBtnText: {
      ...typography.body,
      fontFamily: fonts.bodySemiBold,
      color: colors.pillActiveText,
    },
    pressed: { opacity: 0.9 },
    disabled: { opacity: 0.65 },
  });
}
