import { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { Pressable, Swipeable } from "react-native-gesture-handler";
import { RoundedSwipeRow } from "../../components/RoundedSwipeRow";
import { StatusBar } from "expo-status-bar";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "../../lib/appHaptics";

import { AppAlert } from "../../components/AppAlert";
import { SwipeDeleteAction } from "../../components/SwipeDeleteAction";
import { fonts, radii, spacing, touchTarget, typography, type AppColors } from "../../constants/theme";
import { useAppPreferences } from "../../hooks/useAppPreferences";
import { useColors } from "../../hooks/useColors";
import { useLocale } from "../../hooks/useLocale";
import { usePeople, type Person } from "../../hooks/usePeople";
import { useSplitHistory } from "../../hooks/useSplitHistory";
import { useProjects } from "../../hooks/useProjects";
import { useTheme } from "../../hooks/useTheme";
import { MoneyByCurrency } from "../../components/MoneyByCurrency";
import {
  amountsMagnitude,
  type AmountsByCurrency,
} from "../../lib/moneyByCurrency";
import {
  daysOutstanding,
  getPersonOutstandingByCurrency,
  getPersonWaitingRows,
} from "../../lib/personWaitingEntries";
import {
  escalationLabelKey,
  getEscalationTier,
  patienceProgress,
} from "../../lib/escalation";
import { rtlRow } from "../../lib/rtl";

type PersonRow = Person & { outstanding: AmountsByCurrency; maxDays: number };

export default function PeopleScreen() {
  const colors = useColors();
  const { isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, isRTL } = useLocale();
  const { currency } = useAppPreferences();
  const { people, loading, reload, addPerson, deletePerson } = usePeople();
  const { items, reload: reloadSplits } = useSplitHistory();
  const { projects, reload: reloadProjects } = useProjects();

  const swipeRefs = useRef<Map<string, Swipeable>>(new Map());
  const [showAddModal, setShowAddModal] = useState(false);
  const [nameDraft, setNameDraft] = useState("");
  const [showDuplicateAlert, setShowDuplicateAlert] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Person | null>(null);

  useFocusEffect(
    useCallback(() => {
      void reload();
      void reloadSplits();
      void reloadProjects();
    }, [reload, reloadProjects, reloadSplits])
  );

  const rows = useMemo<PersonRow[]>(() => {
    return people
      .map((person) => {
        const waiting = getPersonWaitingRows(person.name, items, projects, currency).filter(
          (row) => !row.settled
        );
        const maxDays = waiting.reduce((max, row) => Math.max(max, daysOutstanding(row.sentAt)), 0);
        return {
          ...person,
          outstanding: getPersonOutstandingByCurrency(person.name, items, projects, currency),
          maxDays,
        };
      })
      .sort((a, b) => {
        const aMag = amountsMagnitude(a.outstanding);
        const bMag = amountsMagnitude(b.outstanding);
        if (bMag !== aMag) {
          return bMag - aMag;
        }
        if (b.maxDays !== a.maxDays) {
          return b.maxDays - a.maxDays;
        }
        return a.name.localeCompare(b.name);
      });
  }, [currency, items, people, projects]);

  const openAddModal = useCallback(() => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setNameDraft("");
    setShowAddModal(true);
  }, []);

  const closeAddModal = useCallback(() => {
    setShowAddModal(false);
    setNameDraft("");
  }, []);

  const submitPerson = useCallback(async () => {
    const created = await addPerson(nameDraft);
    if (!created) {
      setShowDuplicateAlert(true);
      return;
    }
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    closeAddModal();
  }, [addPerson, closeAddModal, nameDraft]);

  const requestDelete = useCallback((person: Person) => {
    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    swipeRefs.current.get(person.id)?.close();
    setDeleteTarget(person);
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
    void deletePerson(id);
  }, [deletePerson, deleteTarget]);

  const renderRow = useCallback(
    ({ item }: { item: PersonRow }) => {
      const hasDebt = amountsMagnitude(item.outstanding) > 0;
      const progress = hasDebt ? patienceProgress(item.maxDays) : 0;
      const initial = (item.name.trim().charAt(0) || "?").toUpperCase();
      const waitingLabel =
        !hasDebt
          ? t("castSettled")
          : item.maxDays <= 0
            ? t("sentToday")
            : item.maxDays === 1
              ? t("oneDayWaiting")
              : t("maxDaysWaiting", { days: item.maxDays });

      const renderRightActions = (swipeProgress: Animated.AnimatedInterpolation<number>) => (
        <SwipeDeleteAction
          progress={swipeProgress}
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
          style={styles.rowShell}
          renderRightActions={renderRightActions}
          overshootRight={false}
          friction={2}
          rightThreshold={40}
        >
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              router.push(`/person/${item.id}` as Href);
            }}
            style={({ pressed }) => [styles.rowCard, pressed && styles.rowPressed]}
          >
            <View style={[styles.rowMain, rtlRow(isRTL)]}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initial}</Text>
              </View>
              <View style={styles.rowCopy}>
                <Text style={styles.rowName} numberOfLines={1}>
                  {item.name}
                </Text>
                <Text style={styles.metaText} numberOfLines={1}>
                  {hasDebt
                    ? `${t(escalationLabelKey(getEscalationTier(item.maxDays)))}, ${waitingLabel}`
                    : waitingLabel}
                </Text>
              </View>
              <MoneyByCurrency
                amounts={item.outstanding}
                size="compact"
                align={isRTL ? "left" : "right"}
                color={hasDebt ? colors.textPrimary : colors.textSecondary}
                style={!hasDebt ? styles.rowAmountMuted : undefined}
              />
            </View>
            {hasDebt ? (
              <View style={styles.patienceTrack}>
                <View
                  style={[
                    styles.patienceFill,
                    {
                      width: `${Math.max(8, Math.round(progress * 100))}%`,
                    },
                  ]}
                />
              </View>
            ) : null}
          </Pressable>
        </RoundedSwipeRow>
      );
    },
    [colors.textPrimary, colors.textSecondary, isRTL, requestDelete, router, styles, t]
  );

  const bottomPad = Math.max(insets.bottom, spacing.sm) + 88;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={[styles.topBar, rtlRow(isRTL)]}>
        <View style={styles.topBarSpacer} />
        <Pressable
          onPress={openAddModal}
          style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
          accessibilityRole="button"
          accessibilityLabel={t("addPerson")}
        >
          <Text style={styles.addButtonText}>+</Text>
        </Pressable>
      </View>

      {loading && rows.length === 0 ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : rows.length === 0 ? (
        <View style={[styles.emptyWrap, { paddingBottom: bottomPad }]}>
          <Text style={styles.emptyText}>{t("peopleCastEmpty")}</Text>
        </View>
      ) : (
        <FlatList
          data={rows}
          keyExtractor={(item) => item.id}
          renderItem={renderRow}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      )}

      <Modal visible={showAddModal} transparent animationType="fade" onRequestClose={closeAddModal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={styles.modalOverlay}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeAddModal} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t("addPerson")}</Text>
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder={t("personNamePlaceholder")}
              placeholderTextColor={colors.textSecondary}
              style={styles.modalInput}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={() => void submitPerson()}
            />
            <View style={[styles.modalActions, rtlRow(isRTL)]}>
              <Pressable onPress={closeAddModal} style={styles.modalCancel}>
                <Text style={styles.modalCancelText}>{t("cancel")}</Text>
              </Pressable>
              <Pressable
                onPress={() => void submitPerson()}
                style={[styles.modalSave, !nameDraft.trim() && styles.modalSaveDisabled]}
                disabled={!nameDraft.trim()}
              >
                <Text style={styles.modalSaveText}>{t("addPerson")}</Text>
              </Pressable>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <AppAlert
        visible={showDuplicateAlert}
        title={t("personAlreadyExists")}
        message={t("personAlreadyExistsBody")}
        buttons={[{ text: t("ok"), onPress: () => setShowDuplicateAlert(false) }]}
        onRequestClose={() => setShowDuplicateAlert(false)}
      />

      <AppAlert
        visible={deleteTarget != null}
        title={t("personDeleteConfirmTitle")}
        message={
          deleteTarget
            ? t("personDeleteConfirmBody", { name: deleteTarget.name })
            : ""
        }
        buttons={[
          { text: t("cancel"), style: "cancel", onPress: dismissDeleteAlert },
          { text: t("delete"), style: "destructive", onPress: confirmDelete },
        ]}
        onRequestClose={dismissDeleteAlert}
      />
    </View>
  );
}

function createStyles(colors: AppColors, isDark: boolean) {
  const cardShadow = Platform.select({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.24 : colors.cardShadowOpacity + 0.04,
      shadowRadius: 12,
    },
    android: { elevation: 3 },
    default: {},
  });

  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "flex-end",
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      paddingBottom: spacing.sm,
    },
    topBarSpacer: {
      flex: 1,
    },
    addButton: {
      width: touchTarget.min,
      height: touchTarget.min,
      borderRadius: radii.pill,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    addButtonPressed: {
      opacity: 0.88,
      transform: [{ scale: 0.96 }],
    },
    addButtonText: {
      fontSize: 28,
      lineHeight: 30,
      color: colors.pillActiveText,
      fontFamily: fonts.bodyBold,
      marginTop: -2,
    },
    loader: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    listContent: {
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.xs,
    },
    rowShell: {
      borderRadius: radii.xl,
      backgroundColor: colors.surface,
      ...cardShadow,
    },
    rowCard: {
      borderRadius: radii.xl,
      backgroundColor: colors.surface,
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.lg,
      gap: spacing.sm,
      overflow: "hidden",
    },
    rowPressed: {
      opacity: 0.92,
    },
    rowMain: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    avatar: {
      width: 40,
      height: 40,
      borderRadius: radii.pill,
      backgroundColor: colors.accentSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    avatarText: {
      ...typography.body,
      fontFamily: fonts.bodySemiBold,
      fontSize: 15,
      color: colors.accent,
    },
    rowCopy: {
      flex: 1,
      gap: 4,
    },
    rowName: {
      ...typography.body,
      fontFamily: fonts.bodyBold,
      fontSize: 17,
      color: colors.textPrimary,
    },
    metaText: {
      ...typography.badge,
      color: colors.textSecondary,
    },
    rowAmount: {
      ...typography.resultSecondary,
      fontSize: 18,
      color: colors.textPrimary,
      fontFamily: fonts.bodyBold,
    },
    rowAmountMuted: {
      color: colors.textSecondary,
      opacity: 0.7,
    },
    patienceTrack: {
      height: 5,
      borderRadius: 999,
      backgroundColor: colors.accentSoft,
      overflow: "hidden",
    },
    patienceFill: {
      height: "100%",
      borderRadius: 999,
      backgroundColor: colors.accent,
      opacity: 0.85,
    },
    separator: {
      height: spacing.sm,
    },
    emptyWrap: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.xl,
      gap: spacing.md,
    },
    emptyText: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 22,
    },
    modalOverlay: {
      flex: 1,
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
    },
    modalBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.4)",
    },
    modalCard: {
      backgroundColor: colors.surface,
      borderRadius: radii.xl,
      padding: spacing.lg,
      gap: spacing.md,
      overflow: "hidden",
      ...cardShadow,
    },
    modalTitle: {
      ...typography.body,
      fontFamily: fonts.bodyBold,
      color: colors.textPrimary,
      fontSize: 18,
    },
    modalInput: {
      ...typography.body,
      color: colors.textPrimary,
      borderWidth: 1.5,
      borderColor: colors.border,
      borderRadius: radii.lg,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minHeight: touchTarget.min,
    },
    modalActions: {
      flexDirection: "row",
      justifyContent: "flex-end",
      gap: spacing.sm,
    },
    modalCancel: {
      minHeight: touchTarget.min,
      justifyContent: "center",
      paddingHorizontal: spacing.md,
    },
    modalCancelText: {
      ...typography.body,
      color: colors.textSecondary,
    },
    modalSave: {
      minHeight: touchTarget.min,
      justifyContent: "center",
      paddingHorizontal: spacing.lg,
      borderRadius: radii.pill,
      backgroundColor: colors.accent,
    },
    modalSaveDisabled: {
      opacity: 0.45,
    },
    modalSaveText: {
      ...typography.body,
      fontFamily: fonts.bodySemiBold,
      color: colors.pillActiveText,
    },
  });
}
