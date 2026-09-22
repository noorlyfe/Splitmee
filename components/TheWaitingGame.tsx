import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  Image,
  Modal,
  Platform,
  ScrollView as RNScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Pressable } from "react-native-gesture-handler";
import { RoundedSwipeRow } from "./RoundedSwipeRow";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "../lib/appHaptics";
import * as Sharing from "expo-sharing";
import { shareReceiptImage } from "../lib/shareReceiptImage";
import { useFocusEffect, useRouter, type Href } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ViewShot, { captureRef } from "react-native-view-shot";

import { AppAlert } from "./AppAlert";
import { ProLockedBlurOverlay } from "./ProLockedBlurOverlay";
import { OverdueReceiptCard } from "./OverdueReceiptCard";
import { ProjectOverdueReceiptCard } from "./ProjectOverdueReceiptCard";
import { StoryDebtCard } from "./StoryDebtCard";
import { SwipeDeleteAction } from "./SwipeDeleteAction";
import type { NudgeTone } from "../constants/messages";
import { fonts, radii, spacing, touchTarget, typography, type AppColors } from "../constants/theme";
import { useAppPreferences } from "../hooks/useAppPreferences";
import { useEscalationAlerts } from "../hooks/useEscalationAlerts";
import { useOverdueNotifications } from "../hooks/useOverdueNotifications";
import { useReceiptFooter } from "../hooks/useReceiptFooter";
import { useLocale } from "../hooks/useLocale";
import { useColors } from "../hooks/useColors";
import { useTheme } from "../hooks/useTheme";
import { useProStatus } from "../hooks/useProStatus";
import type { SplitRecord } from "../hooks/useSplitHistory";
import { useSplitHistory } from "../hooks/useSplitHistory";
import type { ProjectWaitingEntry } from "../hooks/useProjects";
import { useNudgeQuota } from "../hooks/useNudgeQuota";
import { getUnpaidProjectDebts, useProjects } from "../hooks/useProjects";
import {
  escalationLabelKey,
  getEscalationTier,
} from "../lib/escalation";
import { buildProjectReminderMessage } from "../lib/projectReminders";
import { formatCurrency } from "../lib/currency";
import { sumByCurrency } from "../lib/moneyByCurrency";
import { MoneyByCurrency } from "./MoneyByCurrency";
import { categoryMeta } from "../lib/categories";
import { formatDateMedium } from "../lib/i18n";
import {
  computeReceiptPreviewLayout,
  getReceiptCaptureExportWidth,
  getReceiptCaptureWidth,
} from "../lib/receiptPreviewLayout";
import { rtlRow } from "../lib/rtl";
import { trackDaysWaiting } from "../lib/oneSignal";
import { safeRouterBack } from "../lib/safeRouterBack";

const MS_PER_DAY = 86_400_000;
const FREE_UNPAID_LIMIT = 3;

type WaitingListItem =
  | { kind: "split"; record: SplitRecord }
  | { kind: "project"; entry: ProjectWaitingEntry };

type CaptureFormat = "receipt" | "story";

type ReminderCaptureTarget =
  | { kind: "split"; record: SplitRecord; format: CaptureFormat }
  | { kind: "project"; entry: ProjectWaitingEntry; format: CaptureFormat };

function projectSentAtMillis(entry: ProjectWaitingEntry): number {
  return Date.parse(entry.closedAt) || Date.now();
}

function daysWaitingProject(entry: ProjectWaitingEntry): number {
  const diff = Date.now() - projectSentAtMillis(entry);
  return Math.max(0, Math.floor(diff / MS_PER_DAY));
}

function sentAtMillis(record: SplitRecord): number {
  const iso = typeof record.nudgeSentAt === "string" ? record.nudgeSentAt.trim() : "";
  if (iso) {
    const t = Date.parse(iso);
    if (Number.isFinite(t)) {
      return t;
    }
  }
  return Date.parse(record.createdAt) || Date.now();
}

/** Full days elapsed since message / receipt sent (floor). */
function daysWaiting(record: SplitRecord): number {
  const diff = Date.now() - sentAtMillis(record);
  return Math.max(0, Math.floor(diff / MS_PER_DAY));
}

function vibeLabelForDays(days: number, t: (key: string) => string): string {
  return t(escalationLabelKey(getEscalationTier(days)));
}

type Props = {
  variant: "tab" | "stack";
  /** Overrides default `theWaitingGame` header title. */
  headerTitle?: string;
  /** Overrides default `waitingSubtitle` on tab variant. */
  headerSubtitle?: string;
  /** Overrides default empty-queue copy when there are no items. */
  emptyTitle?: string;
  emptyBody?: string;
};

export function TheWaitingGame({
  variant,
  headerTitle,
  headerSubtitle: _headerSubtitle,
  emptyTitle,
  emptyBody,
}: Props) {
  const colors = useColors();
  const { isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const receiptWidth = getReceiptCaptureWidth(windowWidth);
  const offscreenTop = Dimensions.get("window").height + 120;

  const { t, isRTL, locale } = useLocale();
  const { isPro } = useProStatus();
  const { currency, hideReceiptBranding, defaultTone, paymentHint, overdueNotifications } =
    useAppPreferences();
  const { footer } = useReceiptFooter();
  const { canSendFree, recordSend } = useNudgeQuota(isPro);
  const { items, loading, reload, markAsPaid, markNudgeSent, deleteRecord } = useSplitHistory();
  const {
    projects,
    loading: projectsLoading,
    reload: reloadProjects,
    markSettlementPaid,
    markProjectNudgeSent,
  } = useProjects();
  const [query, setQuery] = useState("");

  useOverdueNotifications(overdueNotifications, items, projects, {
    title: t("overduePushTitle"),
    body: (name, days) => t("overduePushBody", { name, days }),
  });

  const storyWidth = useMemo(() => Math.min(Math.round(windowWidth * 0.72), 340), [windowWidth]);
  const storyHeight = useMemo(() => Math.round((storyWidth * 16) / 9), [storyWidth]);

  const formatDaysSinceSent = useCallback(
    (days: number) => {
      if (days === 0) {
        return t("sentToday");
      }
      if (days === 1) {
        return t("oneDaySinceSent");
      }
      return t("daysSinceSent", { days });
    },
    [t]
  );
  const paidDateLabel = useCallback((iso: string) => formatDateMedium(iso, locale), [locale]);
  const [captureTarget, setCaptureTarget] = useState<ReminderCaptureTarget | null>(null);
  const [reminderPreview, setReminderPreview] = useState<{
    uri: string;
    target: ReminderCaptureTarget;
  } | null>(null);
  const [showQuotaAlert, setShowQuotaAlert] = useState(false);
  const [reminderPreviewIntrinsic, setReminderPreviewIntrinsic] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [reminderShareBusy, setReminderShareBusy] = useState(false);
  const [showWebPreviewOverdueAlert, setShowWebPreviewOverdueAlert] = useState(false);
  const [showCaptureFailedAlert, setShowCaptureFailedAlert] = useState(false);
  const [showSharingUnavailableAlert, setShowSharingUnavailableAlert] = useState(false);
  const [showShareFailedAlert, setShowShareFailedAlert] = useState(false);
  const [escalateFocusId, setEscalateFocusId] = useState<string | null>(null);
  const overdueShotRef = useRef<ViewShot | null>(null);

  const finishReminderSent = useCallback(
    async (target: ReminderCaptureTarget) => {
      if (target.kind === "split") {
        await markNudgeSent(target.record.id);
      } else {
        const tone = (target.entry.nudgeTone ?? defaultTone) as NudgeTone;
        const previewText = buildProjectReminderMessage(
          t,
          tone,
          daysWaitingProject(target.entry),
          {
            amount: formatCurrency(target.entry.amount, currency),
            project: target.entry.projectName.trim() || t("projectDefaultName"),
            payee: target.entry.toParticipantName,
          }
        );
        await markProjectNudgeSent(target.entry.projectId, target.entry.transferId, {
          nudgeTone: tone,
          nudgePreviewText: previewText,
        });
      }
      await recordSend();
    },
    [currency, defaultTone, markNudgeSent, markProjectNudgeSent, recordSend, t]
  );

  useEffect(() => {
    if (!captureTarget) {
      return;
    }
    if (Platform.OS === "web") {
      setShowWebPreviewOverdueAlert(true);
      setCaptureTarget(null);
      return;
    }
    let cancelled = false;
    const isStory = captureTarget.format === "story";
    const exportWidth = isStory
      ? Math.round(storyWidth * 2)
      : getReceiptCaptureExportWidth(receiptWidth);
    const timer = setTimeout(async () => {
      try {
        await new Promise<void>((resolve) => {
          requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
        });
        const uri = await captureRef(overdueShotRef, {
          format: "png",
          quality: 1,
          width: exportWidth,
        });
        if (cancelled) {
          return;
        }
        if (!uri) {
          setShowCaptureFailedAlert(true);
          setCaptureTarget(null);
          return;
        }
        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) {
          setShowSharingUnavailableAlert(true);
          setCaptureTarget(null);
          return;
        }
        if (isPro) {
          if (!cancelled) {
            setReminderPreview({ uri, target: captureTarget });
            setCaptureTarget(null);
          }
          return;
        }
        await shareReceiptImage(uri, {
          dialogTitle: isStory ? t("storyDropDialog") : t("secondNotice"),
        });
        if (!cancelled) {
          await finishReminderSent(captureTarget);
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }
      } catch {
        if (!cancelled) {
          void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setShowShareFailedAlert(true);
        }
      } finally {
        if (!cancelled) {
          setCaptureTarget(null);
        }
      }
    }, 400);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [captureTarget, finishReminderSent, isPro, receiptWidth, storyWidth, t]);

  const dismissReminderPreview = useCallback(() => {
    setReminderPreview(null);
  }, []);

  const confirmReminderShare = useCallback(async () => {
    if (!reminderPreview) {
      return;
    }
    setReminderShareBusy(true);
    try {
      const isStory = reminderPreview.target.format === "story";
      await shareReceiptImage(reminderPreview.uri, {
        dialogTitle: isStory ? t("storyDropDialog") : t("secondNotice"),
      });
      await finishReminderSent(reminderPreview.target);
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setShowShareFailedAlert(true);
    } finally {
      setReminderShareBusy(false);
      setReminderPreview(null);
    }
  }, [finishReminderSent, reminderPreview, t]);

  const requestReminderImageShare = useCallback(
    (target: ReminderCaptureTarget) => {
      if (!isPro && !canSendFree) {
        setShowQuotaAlert(true);
        return;
      }
      if (Platform.OS === "web") {
        setShowWebPreviewOverdueAlert(true);
        return;
      }
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      setCaptureTarget(target);
    },
    [canSendFree, isPro]
  );

  useFocusEffect(
    useCallback(() => {
      void reload();
      void reloadProjects();
    }, [reload, reloadProjects])
  );

  const handleBack =
    variant === "stack"
      ? () => {
          void Haptics.selectionAsync();
          safeRouterBack(router);
        }
      : undefined;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) {
      return items;
    }
    return items.filter((r) => {
      const restaurant = r.restaurant.toLowerCase();
      const person = (r.linkedPersonName ?? "").toLowerCase();
      const category = (r.category ?? "").toLowerCase();
      const shareHit = (r.shares ?? []).some((s) => s.name.toLowerCase().includes(q));
      return (
        restaurant.includes(q) ||
        person.includes(q) ||
        category.includes(q) ||
        shareHit
      );
    });
  }, [items, query]);

  const filteredProjectDebts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const debts = getUnpaidProjectDebts(projects);
    if (!q) {
      return debts;
    }
    return debts.filter(
      (e) =>
        e.projectName.toLowerCase().includes(q) ||
        e.participantName.toLowerCase().includes(q) ||
        e.toParticipantName.toLowerCase().includes(q)
    );
  }, [projects, query]);

  const { unpaid, paid } = useMemo(() => {
    const u: WaitingListItem[] = [];
    const p: WaitingListItem[] = [];
    for (const r of filtered) {
      const settled = typeof r.paidAt === "string" && r.paidAt.trim().length > 0;
      const row: WaitingListItem = { kind: "split", record: r };
      if (settled) {
        p.push(row);
      } else {
        u.push(row);
      }
    }
    for (const entry of filteredProjectDebts) {
      u.push({ kind: "project", entry });
    }
    u.sort((a, b) => {
      const ta =
        a.kind === "split" ? sentAtMillis(a.record) : projectSentAtMillis(a.entry);
      const tb =
        b.kind === "split" ? sentAtMillis(b.record) : projectSentAtMillis(b.entry);
      return tb - ta;
    });
    p.sort((a, b) => {
      if (a.kind !== "split" || b.kind !== "split") {
        return 0;
      }
      const ta = typeof a.record.paidAt === "string" ? Date.parse(a.record.paidAt) : 0;
      const tb = typeof b.record.paidAt === "string" ? Date.parse(b.record.paidAt) : 0;
      return tb - ta;
    });
    return { unpaid: u, paid: p };
  }, [filtered, filteredProjectDebts]);

  useEffect(() => {
    if (unpaid.length === 0) {
      return;
    }
    const maxDays = Math.max(
      ...unpaid.map((row) =>
        row.kind === "split" ? daysWaiting(row.record) : daysWaitingProject(row.entry)
      )
    );
    if (maxDays > 0) {
      void trackDaysWaiting(maxDays);
    }
  }, [unpaid]);

  const sections = useMemo(() => {
    const out: { title: string; data: WaitingListItem[] }[] = [];
    if (unpaid.length > 0) {
      out.push({ title: t("stillUnpaid"), data: unpaid });
    }
    if (paid.length > 0) {
      out.push({ title: t("paidDone"), data: paid });
    }
    return out;
  }, [paid, t, unpaid]);

  const waitingSummary = useMemo(() => {
    let count = 0;
    let maxDays = 0;
    const moneyLines: { amount: number; currency: string }[] = [];
    for (const row of unpaid) {
      count += 1;
      const days = row.kind === "split" ? daysWaiting(row.record) : daysWaitingProject(row.entry);
      maxDays = Math.max(maxDays, days);
      if (row.kind === "split") {
        moneyLines.push({
          amount: row.record.totalPerPerson,
          currency: row.record.currency ?? currency,
        });
      } else {
        moneyLines.push({
          amount: row.entry.amount,
          currency: currency,
        });
      }
    }
    const amounts = sumByCurrency(moneyLines, {
      preferredCurrency: currency,
      fallbackCurrency: currency,
    });
    return { count, maxDays, amounts };
  }, [currency, unpaid]);

  const escalationCandidates = useMemo(
    () =>
      unpaid.map((row) => {
        if (row.kind === "split") {
          const days = daysWaiting(row.record);
          return {
            id: row.record.id,
            name: row.record.restaurant.trim() || t("dinner"),
            days,
            tier: getEscalationTier(days),
          };
        }
        const days = daysWaitingProject(row.entry);
        return {
          id: row.entry.transferId,
          name: row.entry.participantName,
          days,
          tier: getEscalationTier(days),
        };
      }),
    [t, unpaid]
  );

  const { alert: escalationAlert, dismiss: dismissEscalationAlert } = useEscalationAlerts(
    escalationCandidates,
    !loading && !projectsLoading && unpaid.length > 0
  );

  const bottomPad = variant === "tab" ? Math.max(insets.bottom, spacing.sm) + 88 : insets.bottom + spacing.xxl;

  const reminderPreviewChromeHeight = insets.top + insets.bottom + 200;

  const reminderPreviewImageLayout = useMemo(
    () =>
      computeReceiptPreviewLayout(
        reminderPreviewIntrinsic,
        receiptWidth,
        windowWidth,
        windowHeight,
        "scrollable",
        reminderPreviewChromeHeight
      ),
    [receiptWidth, reminderPreviewChromeHeight, reminderPreviewIntrinsic, windowHeight, windowWidth]
  );

  useEffect(() => {
    if (!reminderPreview?.uri) {
      setReminderPreviewIntrinsic(null);
      return;
    }
    Image.getSize(
      reminderPreview.uri,
      (width, height) => setReminderPreviewIntrinsic({ width, height }),
      () => setReminderPreviewIntrinsic(null)
    );
  }, [reminderPreview?.uri]);

  const renderItem = useCallback(
    ({ item }: { item: WaitingListItem }) => {
      if (item.kind === "project") {
        const entry = item.entry;
        const waitingDays = daysWaitingProject(entry);
        const unpaidIndex = unpaid.findIndex(
          (r) => r.kind === "project" && r.entry.transferId === entry.transferId
        );
        const isLocked = !isPro && unpaidIndex >= FREE_UNPAID_LIMIT;
        const reminderBusy = !!reminderPreview || !!captureTarget;

        const card = (
          <View style={[styles.card, isLocked && styles.cardLocked]}>
            <Pressable
              onPress={() => {
                if (!isLocked) {
                  router.push(`/project/${entry.projectId}` as Href);
                }
              }}
              style={styles.cardBody}
              disabled={isLocked}
            >
              <View style={[styles.cardTop, rtlRow(isRTL)]}>
                <View style={styles.cardTitleBlock}>
                  <Text style={styles.restaurant} numberOfLines={2}>
                    {entry.participantName}
                  </Text>
                  <Text style={styles.projectMeta} numberOfLines={1}>
                    {entry.projectName}
                  </Text>
                </View>
                <Text style={styles.statusLabel} numberOfLines={2}>
                  {vibeLabelForDays(waitingDays, t)}
                </Text>
              </View>
              <Text style={styles.amountLine}>{formatCurrency(entry.amount, currency)}</Text>
              <View style={[styles.metaRow, rtlRow(isRTL)]}>
                <View style={styles.daysBadge}>
                  <Text style={styles.daysBadgeText}>{formatDaysSinceSent(waitingDays)}</Text>
                </View>
                <Text style={styles.daysLine} numberOfLines={1}>
                  {typeof entry.nudgeSentAt === "string" && entry.nudgeSentAt.trim()
                    ? t("reminderSent")
                    : t("projectWaitingPaysTo", { name: entry.toParticipantName })}
                </Text>
              </View>
            </Pressable>
            {!isLocked ? (
              <View style={styles.cardActionsCol}>
                <View style={[styles.cardActions, rtlRow(isRTL)]}>
                  <Pressable
                    onPress={() =>
                      requestReminderImageShare({ kind: "project", entry, format: "receipt" })
                    }
                    disabled={reminderBusy}
                    style={({ pressed }) => [
                      styles.reminderPill,
                      reminderBusy && styles.reminderPillDisabled,
                      pressed && styles.reminderPillPressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityLabel={t("sendSecondNoticeImage")}
                  >
                    <Text style={styles.reminderPillText}>{t("sendReminder")}</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                      void markSettlementPaid(entry.projectId, entry.transferId);
                    }}
                    style={({ pressed }) => [styles.receiveBtn, pressed && styles.receiveBtnPressed]}
                    accessibilityRole="button"
                    accessibilityLabel={t("markedReceivedPaid")}
                  >
                    <Text style={styles.receiveBtnText}>✓ {t("received")}</Text>
                  </Pressable>
                </View>
                <Pressable
                  onPress={() =>
                    requestReminderImageShare({ kind: "project", entry, format: "story" })
                  }
                  disabled={reminderBusy}
                  style={({ pressed }) => [
                    styles.escalatePill,
                    escalateFocusId === entry.transferId && styles.escalatePillHot,
                    reminderBusy && styles.reminderPillDisabled,
                    pressed && styles.reminderPillPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t("shareStoryDrop")}
                >
                  <Text style={styles.escalatePillText}>{t("shareStoryDrop")}</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        );

        return (
          <ProLockedBlurOverlay
            locked={isLocked}
            unlockMessage={t("unlockAllWaiting")}
            style={isLocked ? styles.lockedCardWrap : undefined}
          >
            {card}
          </ProLockedBlurOverlay>
        );
      }

      const record = item.record;
      const settled = typeof record.paidAt === "string" && record.paidAt.trim().length > 0;
      const waitingDays = daysWaiting(record);
      const code = record.currency ?? "USD";
      const name = record.restaurant.trim() || t("dinner");
      const unpaidIndex = unpaid.findIndex((r) => r.kind === "split" && r.record.id === record.id);
      const isLocked = !isPro && !settled && unpaidIndex >= FREE_UNPAID_LIMIT;

      const openDetail = () => {
        if (isLocked) {
          return;
        }
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push(`/history/${record.id}`);
      };

      const renderRightActions = (
        progress: Animated.AnimatedInterpolation<number>
      ) => (
        <SwipeDeleteAction
          progress={progress}
          label={t("delete")}
          onPress={() => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            void deleteRecord(record.id);
          }}
        />
      );

      const card = (
        <View
          style={[
            styles.card,
            styles.cardInSwipe,
            isLocked && styles.cardLocked,
            settled && styles.cardSettled,
          ]}
        >
          <Pressable onPress={openDetail} style={styles.cardBody} disabled={isLocked}>
            <View style={[styles.cardTop, rtlRow(isRTL)]}>
              <Text style={[styles.restaurant, settled && styles.mutedStrong]} numberOfLines={2}>
                {name}
              </Text>
              {settled ? (
                <Text style={styles.statusLabelMuted} accessibilityLabel={t("paid")}>
                  {t("paid")}
                </Text>
              ) : (
                <Text style={styles.statusLabel} numberOfLines={2}>
                  {vibeLabelForDays(waitingDays, t)}
                </Text>
              )}
            </View>
            <Text style={[styles.amountLine, settled && styles.mutedStrong]}>
              {formatCurrency(record.totalPerPerson, code)}
              {t("perPersonSuffix")}
              {record.category ? `, ${t(categoryMeta(record.category).labelKey)}` : ""}
            </Text>
            {settled ? (
              <Text style={[styles.daysLine, styles.muted]}>
                {record.paidAt ? `${t("paid")}, ${paidDateLabel(record.paidAt)}` : t("paid")}
              </Text>
            ) : (
              <View style={[styles.metaRow, rtlRow(isRTL)]}>
                <View style={styles.daysBadge}>
                  <Text style={styles.daysBadgeText}>{formatDaysSinceSent(waitingDays)}</Text>
                </View>
                {typeof record.nudgeSentAt === "string" && record.nudgeSentAt.trim() ? (
                  <Text style={styles.daysLine} numberOfLines={1}>
                    {t("reminderSent")}
                  </Text>
                ) : null}
              </View>
            )}
          </Pressable>

          {!settled && !isLocked ? (
            <View style={styles.cardActionsCol}>
              <View style={[styles.cardActions, rtlRow(isRTL)]}>
                <Pressable
                  onPress={() =>
                    requestReminderImageShare({ kind: "split", record, format: "receipt" })
                  }
                  disabled={!!reminderPreview || !!captureTarget}
                  style={({ pressed }) => [
                    styles.reminderPill,
                    (!!reminderPreview || !!captureTarget) && styles.reminderPillDisabled,
                    pressed && styles.reminderPillPressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t("sendSecondNoticeImage")}
                >
                  <Text style={styles.reminderPillText}>{t("sendReminder")}</Text>
                </Pressable>
                <Pressable
                  onPress={() => {
                    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    void markAsPaid(record.id);
                  }}
                  style={({ pressed }) => [styles.receiveBtn, pressed && styles.receiveBtnPressed]}
                  accessibilityRole="button"
                  accessibilityLabel={t("markedReceivedPaid")}
                >
                  <Text style={styles.receiveBtnText}>✓ {t("received")}</Text>
                </Pressable>
              </View>
              <Pressable
                onPress={() =>
                  requestReminderImageShare({ kind: "split", record, format: "story" })
                }
                disabled={!!reminderPreview || !!captureTarget}
                style={({ pressed }) => [
                  styles.escalatePill,
                  escalateFocusId === record.id && styles.escalatePillHot,
                  (!!reminderPreview || !!captureTarget) && styles.reminderPillDisabled,
                  pressed && styles.reminderPillPressed,
                ]}
                accessibilityRole="button"
                accessibilityLabel={t("shareStoryDrop")}
              >
                <Text style={styles.escalatePillText}>{t("shareStoryDrop")}</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      );

      const cardWithLock = (
        <ProLockedBlurOverlay
          locked={isLocked}
          unlockMessage={t("unlockAllWaiting")}
          style={isLocked ? styles.lockedCardWrap : undefined}
        >
          {card}
        </ProLockedBlurOverlay>
      );

      if (isLocked) {
        return cardWithLock;
      }

      return (
        <RoundedSwipeRow style={styles.swipeRow} renderRightActions={renderRightActions} overshootRight={false} friction={2} rightThreshold={40}>
          {card}
        </RoundedSwipeRow>
      );
    },
    [
      captureTarget,
      deleteRecord,
      escalateFocusId,
      formatDaysSinceSent,
      isPro,
      isRTL,
      markAsPaid,
      markSettlementPaid,
      paidDateLabel,
      reminderPreview,
      requestReminderImageShare,
      router,
      styles,
      t,
      unpaid,
      currency,
    ]
  );

  return (
    <View
      style={[
        styles.screen,
        isRTL && styles.rtlContainer,
        {
          paddingTop:
            insets.top + (variant === "tab" ? spacing.lg : spacing.sm),
        },
      ]}
    >
      <StatusBar style={reminderPreview ? "light" : isDark ? "light" : "dark"} />
      {variant === "stack" ? (
        <View style={[styles.stackHeader, rtlRow(isRTL)]}>
          <Pressable
            onPress={handleBack}
            hitSlop={12}
            style={({ pressed }) => [styles.back, pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={t("goBack")}
          >
            <Text style={styles.backText}>{t("back")}</Text>
          </Pressable>
          <Text style={styles.screenTitle}>{headerTitle ?? t("theWaitingGame")}</Text>
          <View style={styles.headerSpacer} />
        </View>
      ) : null}

      {!loading && !projectsLoading && waitingSummary.count > 0 ? (
        <View style={styles.summaryCard}>
          <MoneyByCurrency
            amounts={waitingSummary.amounts}
            size={waitingSummary.amounts.mixed ? "body" : "hero"}
            align="center"
            color={colors.accent}
            mutedColor={colors.textSecondary}
          />
          <Text style={styles.summaryHeroLabel}>{t("waitingOwedLabel")}</Text>

          <View style={[styles.summaryMeta, rtlRow(isRTL)]}>
            <View style={styles.summaryMetaStat}>
              <Text style={styles.summaryMetaValue}>{waitingSummary.count}</Text>
              <Text style={styles.summaryMetaLabel}>{t("waitingOpenLabel")}</Text>
            </View>
            {waitingSummary.maxDays > 0 ? (
              <>
                <View style={styles.summaryDivider} />
                <View style={styles.summaryMetaStat}>
                  <Text style={styles.summaryMetaValue}>
                    {t("waitingLongestDays", { days: waitingSummary.maxDays })}
                  </Text>
                  <Text style={styles.summaryMetaLabel}>{t("waitingLongestLabel")}</Text>
                  <Text style={styles.summaryMetaHint} numberOfLines={1}>
                    {vibeLabelForDays(waitingSummary.maxDays, t)}
                  </Text>
                </View>
              </>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={[styles.searchWrap, variant === "stack" && styles.searchWrapStack]}>
        <View style={[styles.searchField, rtlRow(isRTL)]}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder={t("searchWaitingPlaceholder")}
            placeholderTextColor={colors.textSecondary}
            style={styles.searchInput}
            selectionColor={colors.accent}
            cursorColor={colors.accent}
            accessibilityLabel={t("searchWaitingPlaceholder")}
          />
        </View>
      </View>

      {loading || projectsLoading ? (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.accent} size="large" />
        </View>
      ) : items.length === 0 && filteredProjectDebts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{emptyTitle ?? t("nothingInQueue")}</Text>
          <Text style={styles.emptyBody}>{emptyBody ?? t("nothingInQueueBody")}</Text>
        </View>
      ) : filtered.length === 0 && filteredProjectDebts.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>{t("noMatches")}</Text>
          <Text style={styles.emptyBody}>{t("tryDifferentRestaurant")}</Text>
        </View>
      ) : sections.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyBody}>{t("nothingToShow")}</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(r) =>
            r.kind === "split" ? r.record.id : `project-${r.entry.transferId}`
          }
          renderItem={renderItem}
          renderSectionHeader={({ section: { title } }) => (
            <View style={styles.sectionHeaderWrap}>
              <Text style={styles.sectionHeader}>{title}</Text>
            </View>
          )}
          stickySectionHeadersEnabled={false}
          contentContainerStyle={[styles.listContent, { paddingBottom: bottomPad }]}
          showsVerticalScrollIndicator={false}
        />
      )}

      {captureTarget ? (
        <View
          pointerEvents="none"
          style={[
            styles.offscreenShot,
            {
              top: offscreenTop,
              width: captureTarget.format === "story" ? storyWidth : receiptWidth,
            },
          ]}
          collapsable={false}
        >
          <ViewShot
            ref={overdueShotRef}
            options={{ format: "png", quality: 1 }}
            style={[
              styles.shotInner,
              {
                width: captureTarget.format === "story" ? storyWidth : receiptWidth,
                height: captureTarget.format === "story" ? storyHeight : undefined,
              },
            ]}
          >
            {captureTarget.format === "story" ? (
              captureTarget.kind === "split" ? (
                <StoryDebtCard
                  width={storyWidth}
                  title={
                    (typeof captureTarget.record.linkedPersonName === "string" &&
                    captureTarget.record.linkedPersonName.trim()
                      ? captureTarget.record.linkedPersonName.trim()
                      : captureTarget.record.restaurant.trim()) || t("dinner")
                  }
                  subtitle={captureTarget.record.restaurant.trim() || undefined}
                  amountLabel={formatCurrency(
                    captureTarget.record.totalPerPerson,
                    captureTarget.record.currency ?? currency
                  )}
                  days={daysWaiting(captureTarget.record)}
                  paymentHint={isPro ? paymentHint : ""}
                  showBranding={!(isPro && hideReceiptBranding)}
                />
              ) : (
                <StoryDebtCard
                  width={storyWidth}
                  title={captureTarget.entry.participantName}
                  subtitle={captureTarget.entry.projectName}
                  amountLabel={formatCurrency(captureTarget.entry.amount, currency)}
                  days={daysWaitingProject(captureTarget.entry)}
                  paymentHint={isPro ? paymentHint : ""}
                  showBranding={!(isPro && hideReceiptBranding)}
                />
              )
            ) : captureTarget.kind === "split" ? (
              <OverdueReceiptCard
                width={receiptWidth}
                record={captureTarget.record}
                daysOverdue={daysWaiting(captureTarget.record)}
                dateLabel={paidDateLabel(captureTarget.record.createdAt)}
                isPro={isPro}
                hideReceiptBranding={hideReceiptBranding}
                customFooter={footer}
                paymentHint={paymentHint}
                compact
              />
            ) : (
              <ProjectOverdueReceiptCard
                width={receiptWidth}
                entry={captureTarget.entry}
                daysOverdue={daysWaitingProject(captureTarget.entry)}
                dateLabel={paidDateLabel(captureTarget.entry.closedAt)}
                currencyCode={currency}
                nudgeTone={(captureTarget.entry.nudgeTone ?? defaultTone) as NudgeTone}
                isPro={isPro}
                hideReceiptBranding={hideReceiptBranding}
                customFooter={footer}
                paymentHint={paymentHint}
                compact
              />
            )}
          </ViewShot>
        </View>
      ) : null}

      <Modal
        visible={!!reminderPreview}
        transparent
        animationType="slide"
        onRequestClose={dismissReminderPreview}
      >
        <View style={styles.sharePreviewRoot}>
          <View
            style={[
              styles.sharePreviewTopBar,
              rtlRow(isRTL),
              {
                paddingTop: insets.top + spacing.sm,
                paddingHorizontal: reminderPreviewImageLayout.marginH,
              },
            ]}
          >
            <View style={styles.sharePreviewTopSpacer} />
            <Pressable
              onPress={() => {
                void Haptics.selectionAsync();
                dismissReminderPreview();
              }}
              hitSlop={16}
              disabled={reminderShareBusy}
              style={({ pressed }) => [styles.sharePreviewCloseBtn, pressed && styles.sharePreviewCloseBtnPressed]}
              accessibilityRole="button"
              accessibilityLabel={t("closePreview")}
            >
              <Text style={styles.sharePreviewCloseText}>✕</Text>
            </Pressable>
          </View>

          <RNScrollView
            style={styles.sharePreviewScroll}
            contentContainerStyle={[
              styles.sharePreviewScrollContent,
              styles.sharePreviewScrollContentTall,
              { paddingHorizontal: reminderPreviewImageLayout.marginH },
            ]}
            showsVerticalScrollIndicator={false}
            bounces
          >
            {reminderPreview ? (
              <View
                style={[
                  styles.sharePreviewImageFrame,
                  {
                    width: reminderPreviewImageLayout.imgW,
                    height: reminderPreviewImageLayout.imgH,
                  },
                ]}
              >
                <Image
                  source={{ uri: reminderPreview.uri }}
                  style={styles.sharePreviewImage}
                  resizeMode="contain"
                />
              </View>
            ) : null}
          </RNScrollView>

          <View
            style={[
              styles.sharePreviewFooter,
              {
                paddingBottom: Math.max(insets.bottom, spacing.lg) + spacing.sm,
                paddingHorizontal: reminderPreviewImageLayout.marginH,
                paddingTop: spacing.lg,
              },
            ]}
          >
            <Pressable
              onPress={() => {
                void confirmReminderShare();
              }}
              disabled={reminderShareBusy}
              style={({ pressed }) => [
                styles.sharePreviewCta,
                reminderShareBusy && styles.sharePreviewCtaDisabled,
                pressed && !reminderShareBusy && styles.sharePreviewCtaPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t("shareReminderImage")}
            >
              {reminderShareBusy ? (
                <ActivityIndicator color={colors.pillActiveText} />
              ) : (
                <Text style={styles.sharePreviewCtaText}>{t("share")}</Text>
              )}
            </Pressable>
            <Pressable
              onPress={dismissReminderPreview}
              disabled={reminderShareBusy}
              style={({ pressed }) => [
                styles.sharePreviewDismiss,
                pressed && !reminderShareBusy && styles.sharePreviewDismissPressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t("cancelSharing")}
            >
              <Text style={styles.sharePreviewDismissText}>{t("cancel")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <AppAlert
        visible={showWebPreviewOverdueAlert}
        title={t("webPreview")}
        message={t("webPreviewSharingOverdue")}
        onRequestClose={() => setShowWebPreviewOverdueAlert(false)}
        buttons={[{ text: t("ok"), onPress: () => setShowWebPreviewOverdueAlert(false) }]}
      />
      <AppAlert
        visible={showCaptureFailedAlert}
        title={t("captureFailed")}
        message={t("couldNotCreateReminderImage")}
        onRequestClose={() => setShowCaptureFailedAlert(false)}
        buttons={[{ text: t("ok"), onPress: () => setShowCaptureFailedAlert(false) }]}
      />
      <AppAlert
        visible={showSharingUnavailableAlert}
        title={t("sharingUnavailable")}
        message={t("sharingNotAvailableDevice")}
        onRequestClose={() => setShowSharingUnavailableAlert(false)}
        buttons={[{ text: t("ok"), onPress: () => setShowSharingUnavailableAlert(false) }]}
      />
      <AppAlert
        visible={showShareFailedAlert}
        title={t("shareFailed")}
        message={t("somethingWentWrongShort")}
        onRequestClose={() => setShowShareFailedAlert(false)}
        buttons={[{ text: t("ok"), onPress: () => setShowShareFailedAlert(false) }]}
      />
      <AppAlert
        visible={showQuotaAlert}
        title={t("noFreeNudges")}
        message={t("noFreeNudges")}
        onRequestClose={() => setShowQuotaAlert(false)}
        buttons={[{ text: t("ok"), onPress: () => setShowQuotaAlert(false) }]}
      />
      <AppAlert
        visible={escalationAlert !== null}
        title={t("escalationAlertTitle")}
        message={
          escalationAlert
            ? t("escalationAlertBody", {
                name: escalationAlert.name,
                days: escalationAlert.days,
              })
            : ""
        }
        onRequestClose={() => {
          void dismissEscalationAlert(escalationAlert);
        }}
        buttons={[
          {
            text: t("escalationAlertLater"),
            onPress: () => {
              void dismissEscalationAlert(escalationAlert);
            },
          },
          {
            text: t("escalationAlertAction"),
            onPress: () => {
              const current = escalationAlert;
              void dismissEscalationAlert(current);
              if (!current) {
                return;
              }
              setEscalateFocusId(current.id);
              const match = unpaid.find((row) =>
                row.kind === "split"
                  ? row.record.id === current.id
                  : row.entry.transferId === current.id
              );
              if (!match) {
                return;
              }
              if (match.kind === "split") {
                requestReminderImageShare({
                  kind: "split",
                  record: match.record,
                  format: "story",
                });
              } else {
                requestReminderImageShare({
                  kind: "project",
                  entry: match.entry,
                  format: "story",
                });
              }
            },
          },
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
    android: {
      elevation: 4,
    },
    default: {},
  });

  const summaryShadow = Platform.select({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.22 : colors.cardShadowOpacity,
      shadowRadius: 10,
    },
    android: {
      elevation: 3,
    },
    default: {},
  });

  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  rtlContainer: {
    direction: "rtl",
  },
  stackHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
    paddingTop: spacing.xl,
  },
  back: {
    minWidth: 64,
    minHeight: touchTarget.min,
    justifyContent: "center",
  },
  backText: {
    ...typography.body,
    fontFamily: fonts.bodySemiBold,
    color: colors.accent,
  },
  headerSpacer: {
    width: 64,
  },
  screenTitle: {
    ...typography.body,
    fontFamily: fonts.bodyBold,
    color: colors.textPrimary,
    textAlign: "center",
    flex: 1,
  },
  summaryCard: {
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
    alignItems: "center",
    ...summaryShadow,
  },
  summaryHeroLabel: {
    ...typography.badge,
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: -2,
  },
  summaryMeta: {
    flexDirection: "row",
    alignItems: "stretch",
    alignSelf: "stretch",
    marginTop: spacing.xs,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
    gap: spacing.md,
  },
  summaryMetaStat: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  summaryMetaValue: {
    ...typography.resultSecondary,
    color: colors.textPrimary,
    fontSize: 18,
    fontVariant: ["tabular-nums"],
  },
  summaryMetaLabel: {
    ...typography.badge,
    color: colors.textSecondary,
    textAlign: "center",
  },
  summaryMetaHint: {
    ...typography.badge,
    fontSize: 11,
    lineHeight: 14,
    color: colors.textSecondary,
    fontFamily: fonts.bodySemiBold,
    textAlign: "center",
    marginTop: 1,
  },
  summaryDivider: {
    width: StyleSheet.hairlineWidth,
    alignSelf: "stretch",
    minHeight: 36,
    backgroundColor: colors.border,
    opacity: 0.9,
  },
  searchWrap: {
    marginBottom: spacing.md,
  },
  searchWrapStack: {
    marginTop: 0,
  },
  searchField: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    paddingHorizontal: spacing.md,
    minHeight: touchTarget.inputHeight - 4,
    ...summaryShadow,
  },
  searchInput: {
    ...typography.body,
    flex: 1,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
    paddingHorizontal: 0,
    borderWidth: 0,
    backgroundColor: "transparent",
    minHeight: touchTarget.min - 8,
  },
  loader: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  emptyTitle: {
    ...typography.body,
    fontFamily: fonts.bodyBold,
    fontSize: 18,
    color: colors.textPrimary,
    textAlign: "center",
  },
  emptyBody: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  listContent: {
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  sectionHeaderWrap: {
    alignSelf: "flex-start",
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  sectionHeader: {
    ...typography.label,
    color: colors.textPrimary,
    letterSpacing: 0.1,
  },
  card: {
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    overflow: "hidden",
    position: "relative",
  },
  cardLocked: {
    marginBottom: 0,
  },
  cardInSwipe: {
    marginBottom: 0,
  },
  swipeRow: {
    marginBottom: spacing.md,
    borderRadius: radii.xl,
    backgroundColor: colors.surface,
    ...cardShadow,
  },
  lockedCardWrap: {
    marginBottom: spacing.md,
  },
  cardSettled: {
    opacity: 0.78,
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  cardBody: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  cardTitleBlock: {
    flex: 1,
    gap: 2,
  },
  restaurant: {
    ...typography.body,
    fontFamily: fonts.bodyBold,
    fontSize: 17,
    flex: 1,
    color: colors.textPrimary,
  },
  projectMeta: {
    ...typography.badge,
    color: colors.textSecondary,
  },
  statusLabel: {
    ...typography.badge,
    fontFamily: fonts.bodySemiBold,
    color: colors.textSecondary,
    maxWidth: "42%",
    textAlign: "right",
  },
  statusLabelMuted: {
    ...typography.badge,
    fontFamily: fonts.bodySemiBold,
    color: colors.textSecondary,
    opacity: 0.85,
  },
  amountLine: {
    ...typography.resultSecondary,
    color: colors.textPrimary,
    fontFamily: fonts.bodyBold,
    marginTop: spacing.xs,
    letterSpacing: -0.4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginTop: spacing.xs,
    flexWrap: "wrap",
  },
  daysBadge: {
    backgroundColor: colors.accentSoft,
    borderRadius: radii.pill,
    paddingVertical: 4,
    paddingHorizontal: spacing.sm,
  },
  daysBadgeText: {
    ...typography.badge,
    fontFamily: fonts.bodySemiBold,
    color: colors.textPrimary,
  },
  daysLine: {
    ...typography.badge,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  muted: {
    color: colors.textSecondary,
  },
  mutedStrong: {
    color: colors.textSecondary,
    opacity: 0.92,
  },
  cardActions: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingBottom: 0,
    paddingTop: spacing.xs,
  },
  cardActionsCol: {
    gap: spacing.sm,
    paddingBottom: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  escalatePill: {
    marginHorizontal: spacing.md,
    minHeight: 40,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  escalatePillHot: {
    borderColor: colors.accent,
    backgroundColor: colors.accentSoft,
  },
  escalatePillText: {
    ...typography.badge,
    fontFamily: fonts.bodySemiBold,
    color: colors.textPrimary,
    fontSize: 13,
  },
  reminderPill: {
    flex: 1,
    minHeight: touchTarget.min - 4,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  reminderPillPressed: {
    opacity: 0.92,
    transform: [{ scale: 0.98 }],
  },
  reminderPillDisabled: {
    opacity: 0.45,
  },
  reminderPillText: {
    ...typography.badge,
    fontFamily: fonts.bodySemiBold,
    color: colors.pillActiveText,
    textAlign: "center",
  },
  receiveBtn: {
    flex: 1,
    minHeight: touchTarget.min - 4,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  receiveBtnPressed: {
    opacity: 0.9,
    transform: [{ scale: 0.98 }],
  },
  receiveBtnText: {
    ...typography.badge,
    fontFamily: fonts.bodySemiBold,
    color: colors.textPrimary,
    textAlign: "center",
  },
  pressed: {
    opacity: 0.75,
  },
  offscreenShot: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    opacity: 1,
    zIndex: -2,
  },
  shotInner: {
    flexShrink: 0,
    backgroundColor: "transparent",
  },
  sharePreviewRoot: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
  },
  sharePreviewTopBar: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 44,
  },
  sharePreviewTopSpacer: {
    flex: 1,
  },
  sharePreviewCloseBtn: {
    minWidth: touchTarget.min,
    minHeight: touchTarget.min,
    alignItems: "center",
    justifyContent: "center",
  },
  sharePreviewCloseBtnPressed: {
    opacity: 0.65,
  },
  sharePreviewCloseText: {
    ...typography.input,
    color: "rgba(241, 242, 244, 0.92)",
    fontFamily: fonts.body,
    fontWeight: "400",
  },
  sharePreviewScroll: {
    flex: 1,
  },
  sharePreviewScrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing.lg,
  },
  sharePreviewScrollContentTall: {
    justifyContent: "flex-start",
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxl,
  },
  sharePreviewImageFrame: {
    overflow: "visible",
    backgroundColor: "transparent",
  },
  sharePreviewImage: {
    width: "100%",
    height: "100%",
  },
  sharePreviewFooter: {
    gap: spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(0,0,0,0.9)",
  },
  sharePreviewCta: {
    minHeight: touchTarget.min,
    borderRadius: radii.pill,
    backgroundColor: colors.accent,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  sharePreviewCtaPressed: {
    opacity: 0.92,
  },
  sharePreviewCtaDisabled: {
    opacity: 0.75,
  },
  sharePreviewCtaText: {
    ...typography.body,
    fontFamily: fonts.bodySemiBold,
    color: colors.pillActiveText,
  },
  sharePreviewDismiss: {
    alignItems: "center",
    paddingVertical: spacing.md,
    minHeight: touchTarget.min,
    justifyContent: "center",
  },
  sharePreviewDismissPressed: {
    opacity: 0.7,
  },
  sharePreviewDismissText: {
    ...typography.body,
    color: "rgba(241, 242, 244, 0.78)",
    fontFamily: fonts.body,
  },
  });
}
