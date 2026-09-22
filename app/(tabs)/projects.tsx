import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Platform,
  SectionList,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Pressable, Swipeable } from "react-native-gesture-handler";
import { RoundedSwipeRow } from "../../components/RoundedSwipeRow";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "../../lib/appHaptics";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppAlert } from "../../components/AppAlert";
import { ProGate } from "../../components/ProGate";
import { SwipeDeleteAction } from "../../components/SwipeDeleteAction";
import { fonts, radii, spacing, touchTarget, typography, type AppColors } from "../../constants/theme";
import { useAppPreferences } from "../../hooks/useAppPreferences";
import { useColors } from "../../hooks/useColors";
import { useLocale } from "../../hooks/useLocale";
import { useProStatus } from "../../hooks/useProStatus";
import type { Project } from "../../hooks/useProjects";
import { projectTotalSpent, useProjects } from "../../hooks/useProjects";
import { useTheme } from "../../hooks/useTheme";
import { formatCurrency } from "../../lib/currency";
import { isProjectFeatureLocked } from "../../lib/projectLimits";
import { rtlRow } from "../../lib/rtl";

export default function ProjectsTab() {
  const colors = useColors();
  const { isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, isRTL } = useLocale();
  const { isPro, loading: proLoading } = useProStatus();
  const { currency } = useAppPreferences();
  const { projects, loading, reload, deleteProject } = useProjects();

  const locked = isProjectFeatureLocked(isPro);

  const swipeRefs = useRef<Map<string, Swipeable>>(new Map());
  const [deleteTarget, setDeleteTarget] = useState<Project | null>(null);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  const openCount = useMemo(() => projects.filter((p) => p.status === "open").length, [projects]);
  const closedCount = useMemo(() => projects.filter((p) => p.status === "closed").length, [projects]);

  const sections = useMemo(() => {
    const open = projects.filter((p) => p.status === "open");
    const closed = projects.filter((p) => p.status === "closed");
    const out: { title: string; data: Project[] }[] = [];
    if (open.length > 0) {
      out.push({ title: t("projectSectionOpen"), data: open });
    }
    if (closed.length > 0) {
      out.push({ title: t("projectSectionClosed"), data: closed });
    }
    return out;
  }, [projects, t]);

  const onCreate = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/project/new" as Href);
  }, [router]);

  const requestDelete = useCallback((project: Project) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    swipeRefs.current.get(project.id)?.close();
    setDeleteTarget(project);
  }, []);

  const dismissDeleteAlert = useCallback(() => {
    setDeleteTarget(null);
  }, []);

  const confirmDelete = useCallback(() => {
    if (!deleteTarget) {
      return;
    }
    const id = deleteTarget.id;
    setDeleteTarget(null);
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    void deleteProject(id);
  }, [deleteProject, deleteTarget]);

  const renderProject = useCallback(
    ({ item }: { item: Project }) => {
      const total = projectTotalSpent(item);
      const isOpen = item.status === "open";
      const statusLabel = isOpen ? t("projectStatusOpen") : t("projectStatusClosed");

      const renderRightActions = (progress: Animated.AnimatedInterpolation<number>) => (
        <SwipeDeleteAction
          progress={progress}
          label={t("delete")}
          onPress={() => requestDelete(item)}
        />
      );

      return (
        <RoundedSwipeRow
          swipeableRef={(ref) => {
            if (ref) {
              swipeRefs.current.set(item.id, ref);
            } else {
              swipeRefs.current.delete(item.id);
            }
          }}
          style={styles.cardShell}
          renderRightActions={renderRightActions}
          overshootRight={false}
          friction={2}
          rightThreshold={40}
          enabled={!locked}
        >
          <Pressable
            onPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push(`/project/${item.id}` as Href);
            }}
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            accessibilityRole="button"
            accessibilityLabel={item.name}
          >
            <View style={styles.cardBody}>
              <View style={[styles.cardTop, rtlRow(isRTL)]}>
                <Text style={styles.cardTitle} numberOfLines={2}>
                  {item.name}
                </Text>
                <View style={[styles.statusPill, !isOpen && styles.statusPillClosed]}>
                  <Text style={[styles.statusPillText, !isOpen && styles.statusPillTextClosed]}>
                    {statusLabel}
                  </Text>
                </View>
              </View>
              <View style={[styles.statsRow, rtlRow(isRTL)]}>
                <View style={styles.statChip}>
                  <Text style={styles.statChipText}>
                    {t("projectParticipantsCount", { count: item.participants.length })}
                  </Text>
                </View>
                <View style={styles.statChip}>
                  <Text style={styles.statChipText}>
                    {`${item.expenses.length} ${t("projectExpensesTitle")}`}
                  </Text>
                </View>
                <Text style={styles.cardTotal}>{formatCurrency(total, currency)}</Text>
              </View>
            </View>
          </Pressable>
        </RoundedSwipeRow>
      );
    },
    [currency, locked, requestDelete, router, styles, t, isRTL]
  );

  const bottomPad = Math.max(insets.bottom, spacing.sm) + 88;

  const listHeader =
    projects.length > 0 ? (
      <View style={styles.headerBlock}>
        <View style={styles.summaryCard}>
          <View style={[styles.summaryRow, rtlRow(isRTL)]}>
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>{openCount}</Text>
              <Text style={styles.summaryLabel}>{t("projectSectionOpen")}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={styles.summaryValue}>{closedCount}</Text>
              <Text style={styles.summaryLabel}>{t("projectSectionClosed")}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryStat}>
              <Text style={[styles.summaryValue, styles.summaryTotal]}>{projects.length}</Text>
              <Text style={styles.summaryLabel}>{t("theProject")}</Text>
            </View>
          </View>
        </View>
      </View>
    ) : null;

  const createFooter = (
    <View style={[styles.footer, { paddingBottom: bottomPad }]}>
      <Pressable
        onPress={onCreate}
        style={({ pressed }) => [styles.createBtn, pressed && styles.createBtnPressed]}
        accessibilityRole="button"
        accessibilityLabel={t("projectCreateNew")}
      >
        <Text style={styles.createBtnText}>+ {t("projectCreateNew")}</Text>
      </Pressable>
    </View>
  );

  const listBody =
    loading && projects.length === 0 ? (
      <View style={styles.loader}>
        <ActivityIndicator color={colors.accent} size="large" />
      </View>
    ) : projects.length === 0 ? (
      <View style={styles.emptyWrap}>
        {listHeader}
        <View style={styles.emptyCenter}>
          <Text style={styles.emptyTitle}>{t("projectEmpty")}</Text>
        </View>
        {createFooter}
      </View>
    ) : (
      <View style={styles.listWrap}>
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderProject}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionPill}>
              <Text style={styles.sectionLabel}>{title}</Text>
            </View>
          )}
          ListHeaderComponent={listHeader}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={styles.listContent}
          style={styles.list}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.itemGap} />}
        />
        {createFooter}
      </View>
    );

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      {proLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : (
        <ProGate locked={locked} messageKey="projectProGateBody">
          {listBody}
        </ProGate>
      )}

      <AppAlert
        visible={deleteTarget !== null}
        title={t("projectDeleteConfirmTitle")}
        message={
          deleteTarget
            ? t("projectDeleteConfirmBody", { name: deleteTarget.name.trim() || t("projectDefaultName") })
            : undefined
        }
        onRequestClose={dismissDeleteAlert}
        buttons={[
          { text: t("cancel"), style: "cancel", onPress: dismissDeleteAlert },
          { text: t("delete"), style: "destructive", onPress: confirmDelete },
        ]}
      />
    </View>
  );
}

function createStyles(colors: AppColors, isDark: boolean) {
  const cardShadow = Platform.select({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: isDark ? 0.28 : colors.cardShadowOpacity + 0.04,
      shadowRadius: 14,
    },
    android: { elevation: 4 },
    default: {},
  });

  const heroShadow = Platform.select({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.22 : colors.cardShadowOpacity,
      shadowRadius: 10,
    },
    android: { elevation: 3 },
    default: {},
  });

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    loader: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
    },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingBottom: spacing.sm,
    },
    listWrap: {
      flex: 1,
    },
    list: {
      flex: 1,
    },
    emptyWrap: {
      flex: 1,
      paddingHorizontal: spacing.lg,
    },
    footer: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.md,
      backgroundColor: "transparent",
    },
    headerBlock: {
      paddingTop: spacing.sm,
      paddingBottom: spacing.md,
    },
    summaryCard: {
      width: "100%",
      borderRadius: radii.xl,
      backgroundColor: colors.surface,
      padding: spacing.md,
      ...heroShadow,
    },
    summaryRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    summaryStat: {
      flex: 1,
      alignItems: "center",
      gap: 2,
    },
    summaryValue: {
      ...typography.resultSecondary,
      fontSize: 22,
      fontFamily: fonts.bodyBold,
      color: colors.textPrimary,
    },
    summaryTotal: {
      color: colors.accent,
    },
    summaryLabel: {
      ...typography.badge,
      fontSize: 10,
      color: colors.textSecondary,
      textAlign: "center",
    },
    summaryDivider: {
      width: 1,
      height: 32,
      backgroundColor: colors.border,
    },
    createBtn: {
      minHeight: touchTarget.min,
      borderRadius: radii.pill,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
      ...heroShadow,
    },
    createBtnPressed: {
      opacity: 0.92,
      transform: [{ scale: 0.98 }],
    },
    createBtnText: {
      ...typography.body,
      fontFamily: fonts.bodySemiBold,
      color: colors.pillActiveText,
    },
    sectionPill: {
      alignSelf: "flex-start",
      backgroundColor: colors.accentSoft,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.border,
      paddingVertical: 6,
      paddingHorizontal: spacing.md,
      marginBottom: spacing.sm,
      marginTop: spacing.xs,
    },
    sectionLabel: {
      ...typography.label,
      color: colors.textPrimary,
      letterSpacing: 0.1,
    },
    cardShell: {
      borderRadius: radii.xl,
      backgroundColor: colors.surface,
      ...cardShadow,
    },
    card: {
      borderRadius: radii.xl,
      backgroundColor: colors.surface,
      overflow: "hidden",
      position: "relative",
    },
    cardBody: {
      padding: spacing.md,
      gap: spacing.sm,
    },
    cardPressed: {
      opacity: 0.92,
      transform: [{ scale: 0.99 }],
    },
    cardTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing.sm,
    },
    cardTitle: {
      ...typography.body,
      fontFamily: fonts.bodyBold,
      fontSize: 17,
      color: colors.textPrimary,
      flex: 1,
    },
    statusPill: {
      borderRadius: radii.pill,
      paddingHorizontal: spacing.sm,
      paddingVertical: 4,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.surface,
    },
    statusPillClosed: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      opacity: 0.85,
    },
    statusPillText: {
      ...typography.badge,
      fontFamily: fonts.bodySemiBold,
      color: colors.textSecondary,
    },
    statusPillTextClosed: {
      color: colors.textSecondary,
      opacity: 0.8,
    },
    statsRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.xs,
      flexWrap: "wrap",
    },
    statChip: {
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.accentSoft,
      paddingVertical: 3,
      paddingHorizontal: spacing.sm,
    },
    statChipText: {
      ...typography.badge,
      color: colors.textSecondary,
    },
    cardTotal: {
      ...typography.body,
      fontFamily: fonts.bodyBold,
      color: colors.accent,
      marginLeft: "auto",
    },
    itemGap: {
      height: spacing.sm,
    },
    emptyCenter: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      gap: spacing.sm,
    },
    emptyTitle: {
      ...typography.body,
      fontFamily: fonts.bodyBold,
      fontSize: 17,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 24,
      paddingHorizontal: spacing.md,
    },
  });
}
