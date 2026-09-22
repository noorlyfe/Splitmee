import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView as RNScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from "react-native";
import { Pressable, ScrollView } from "react-native-gesture-handler";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "../../lib/appHaptics";
import * as Sharing from "expo-sharing";
import { shareReceiptImage } from "../../lib/shareReceiptImage";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeInDown, FadeOutDown } from "react-native-reanimated";
import ViewShot, { captureRef } from "react-native-view-shot";

import { AppAlert } from "../../components/AppAlert";
import { BillInput } from "../../components/BillInput";
import { CategoryChips } from "../../components/CategoryChips";
import { FxBillRow } from "../../components/FxBillRow";
import { ItemizedEditor, type SplitMode } from "../../components/ItemizedEditor";
import { PeopleStepper } from "../../components/PeopleStepper";
import { ReceiptCard, receiptCaptureOuterWidth } from "../../components/ReceiptCard";
import { ReceiptTemplatePicker } from "../../components/ReceiptTemplatePicker";
import { ResultCard } from "../../components/ResultCard";
import { NudgeSection } from "../../components/NudgeSection";
import { ShareAssigner } from "../../components/ShareAssigner";
import { ShareReceiptButton } from "../../components/ShareReceiptButton";
import { TipSection } from "../../components/TipSection";
import { Ionicons } from "@expo/vector-icons";
import { FREE_NUDGES_PER_MONTH, type NudgeTone } from "../../constants/messages";
import {
  DEFAULT_RECEIPT_TEMPLATE,
  resolveReceiptTemplateId,
  type ReceiptTemplateId,
} from "../../constants/receiptTemplates";
import { fonts, radii, spacing, touchTarget, typography, type AppColors } from "../../constants/theme";
import { useLocale } from "../../hooks/useLocale";
import { formatDateMedium } from "../../lib/i18n";
import { useTheme } from "../../hooks/useTheme";
import { useColors } from "../../hooks/useColors";
import { useNudgeQuota } from "../../hooks/useNudgeQuota";
import { useSplitQuota, FREE_SPLITS_PER_DAY } from "../../hooks/useSplitQuota";
import { useProStatus } from "../../hooks/useProStatus";
import { useAppPreferences } from "../../hooks/useAppPreferences";
import { useReceiptFooter } from "../../hooks/useReceiptFooter";
import { useSplitHistory } from "../../hooks/useSplitHistory";
import { trackEvent } from "../../lib/analytics";
import { trackFreeNudgesUsed, trackNudgeSent } from "../../lib/oneSignal";
import {
  clampTipPercent,
  computeTipSplit,
} from "../../hooks/useTipCalculator";
import { getLocaleTipConfig } from "../../lib/localeTipDefaults";
import {
  getCurrencyFractionDigits,
  getCurrencyNarrowSymbol,
} from "../../lib/currency";
import type { SplitCategoryId } from "../../lib/categories";
import {
  makeEvenShares,
  redistributeShares,
  sharesBalanced,
  type ShareLine,
} from "../../lib/customShares";
import { convertAmount } from "../../lib/fx";
import {
  computeItemizedSplit,
  computePercentSplit,
  createItemizedPeople,
  percentSum,
  type BillItem,
  type ItemizedPerson,
} from "../../lib/itemized";
import { useFxRates } from "../../hooks/useFxRates";
import { logActivity } from "../../hooks/useActivityFeed";
import {
  computeReceiptPreviewLayout,
  getReceiptCaptureExportWidth,
  getReceiptCaptureWidth,
} from "../../lib/receiptPreviewLayout";
import { rtlRow } from "../../lib/rtl";

/** Equal inset on all sides of the receipt in Split share preview (zigzag border). */
const SPLIT_RECEIPT_PREVIEW_PAD = 14;

/** Transparent margin baked into the PNG sent to Messages etc. (not used for in-app preview). */
const SPLIT_SHARE_EXPORT_PAD_V = 36;
const SPLIT_SHARE_EXPORT_PAD_H = 20;

export default function Index() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { personName, linkedPerson } = useLocalSearchParams<{
    personName?: string | string[];
    linkedPerson?: string | string[];
  }>();
  const linkedPersonName = useMemo(() => {
    const raw = Array.isArray(linkedPerson) ? linkedPerson[0] : linkedPerson;
    return typeof raw === "string" ? raw.trim() : "";
  }, [linkedPerson]);
  const { width: windowWidth, height: windowHeight } = useWindowDimensions();
  const { isPro } = useProStatus();
  const { canSendFree, recordSend, usedThisMonth } = useNudgeQuota(isPro);
  const { canSaveFree, recordSplit, remainingFree: remainingSplitsFree } = useSplitQuota(isPro);
  const {
    loaded: prefsLoaded,
    defaultTone,
    setDefaultTone,
    defaultTemplateId,
    setDefaultTemplateId,
    currency,
    reload,
    hideReceiptBranding,
  } = useAppPreferences();
  const { rates: fxRates } = useFxRates();
  const { footerForReceipt } = useReceiptFooter();
  const receiptFooterText = footerForReceipt(isPro);
  const { addSplit } = useSplitHistory();
  const { t, locale, isRTL } = useLocale();
  const { isDark } = useTheme();

  const localeTipConfig = useMemo(() => getLocaleTipConfig(locale), [locale]);

  const [restaurant, setRestaurant] = useState("");
  const [billDigits, setBillDigits] = useState("");
  const [people, setPeople] = useState(2);
  const [tipEnabled, setTipEnabled] = useState(() => getLocaleTipConfig(locale).startEnabled);
  const [tipPercent, setTipPercent] = useState(() => getLocaleTipConfig(locale).defaultPercent);
  const [isCustomTip, setIsCustomTip] = useState(false);
  const [customTipDraft, setCustomTipDraft] = useState(() =>
    String(getLocaleTipConfig(locale).defaultPercent)
  );
  const [sharing, setSharing] = useState(false);
  const [nudgeTone, setNudgeTone] = useState<NudgeTone>("funny");
  const [receiptTemplateId, setReceiptTemplateId] = useState<ReceiptTemplateId>(DEFAULT_RECEIPT_TEMPLATE);
  const [nudgePreviewText, setNudgePreviewText] = useState("");
  const [showQuotaModal, setShowQuotaModal] = useState(false);
  const [showSplitQuotaModal, setShowSplitQuotaModal] = useState(false);
  const [showCustomSharesProAlert, setShowCustomSharesProAlert] = useState(false);
  const [showTemplateProAlert, setShowTemplateProAlert] = useState(false);
  const [category, setCategory] = useState<SplitCategoryId>("food");
  const [customSharesOn, setCustomSharesOn] = useState(false);
  const [shareLines, setShareLines] = useState<ShareLine[]>([]);
  const [splitMode, setSplitMode] = useState<SplitMode>("even");
  const [billItems, setBillItems] = useState<BillItem[]>([]);
  const [itemPeople, setItemPeople] = useState<ItemizedPerson[]>(() =>
    createItemizedPeople(2, "P")
  );
  const [percents, setPercents] = useState<Record<string, number>>({});
  const [billCurrency, setBillCurrency] = useState(currency);
  const [showWebPreviewSharingAlert, setShowWebPreviewSharingAlert] = useState(false);
  const [showSharingUnavailableAlert, setShowSharingUnavailableAlert] = useState(false);
  const [shareFailedMessage, setShareFailedMessage] = useState<string | null>(null);
  const [sharePreviewUri, setSharePreviewUri] = useState<string | null>(null);
  const [sharePreviewIntrinsic, setSharePreviewIntrinsic] = useState<{ width: number; height: number } | null>(
    null
  );

  const shotRef = useRef<ViewShot | null>(null);
  const [shareExportPadActive, setShareExportPadActive] = useState(false);
  const prevCurrencyRef = useRef<string | null>(null);

  const fractionDigits = useMemo(() => getCurrencyFractionDigits(currency), [currency]);
  const currencySymbol = useMemo(() => getCurrencyNarrowSymbol(currency), [currency]);

  useFocusEffect(
    useCallback(() => {
      void reload();
      const rawName = Array.isArray(personName) ? personName[0] : personName;
      if (typeof rawName === "string" && rawName.trim()) {
        setRestaurant(rawName.trim());
      }
    }, [personName, reload])
  );

  const billAmountRaw = useMemo(() => {
    const n = parseFloat(billDigits);
    return Number.isFinite(n) ? n : null;
  }, [billDigits]);

  const billAmount = useMemo(() => {
    if (billAmountRaw == null) {
      return null;
    }
    if (billCurrency === currency) {
      return billAmountRaw;
    }
    return convertAmount(billAmountRaw, billCurrency, currency, fxRates);
  }, [billAmountRaw, billCurrency, currency, fxRates]);

  const resolvedTipPercent = useMemo(() => {
    if (!isCustomTip) {
      return tipPercent;
    }
    const parsed = parseFloat(customTipDraft);
    if (!Number.isFinite(parsed)) {
      return clampTipPercent(0);
    }
    return clampTipPercent(parsed);
  }, [customTipDraft, isCustomTip, tipPercent]);

  const effectiveTipPercent = useMemo(
    () => (tipEnabled ? resolvedTipPercent : 0),
    [resolvedTipPercent, tipEnabled]
  );

  const split = useMemo(
    () => computeTipSplit(billAmount, effectiveTipPercent, people),
    [billAmount, effectiveTipPercent, people]
  );

  useEffect(() => {
    setItemPeople((prev) => {
      if (prev.length === people) {
        return prev;
      }
      const next = createItemizedPeople(people, t("sharePersonPrefix"));
      return next.map((p, i) => ({ ...p, name: prev[i]?.name ?? p.name }));
    });
    setPercents((prev) => {
      const nextPeople = createItemizedPeople(people, t("sharePersonPrefix"));
      const even = Math.round((100 / Math.max(1, people)) * 100) / 100;
      const out: Record<string, number> = {};
      nextPeople.forEach((p, i) => {
        out[p.id] = prev[`p-${i}`] ?? even;
      });
      return out;
    });
  }, [people, t]);

  useEffect(() => {
    setBillCurrency(currency);
  }, [currency]);

  const itemizedResult = useMemo(
    () => computeItemizedSplit(billItems, itemPeople, split.tipAmount),
    [billItems, itemPeople, split.tipAmount]
  );

  const percentPeople = useMemo(
    () =>
      itemPeople.map((p) => ({
        ...p,
        percent: percents[p.id] ?? Math.round((100 / Math.max(1, people)) * 100) / 100,
      })),
    [itemPeople, people, percents]
  );

  const percentOk = Math.abs(percentSum(percentPeople) - 100) <= 0.5;
  const percentTotals = useMemo(
    () => computePercentSplit(percentPeople, split.totalAmount),
    [percentPeople, split.totalAmount]
  );

  const advancedSplitReady =
    splitMode === "even" ||
    (splitMode === "items" && billItems.some((it) => it.amount > 0)) ||
    (splitMode === "percent" && percentOk);

  const sharesBalancedOk = useMemo(
    () => !customSharesOn || sharesBalanced(shareLines, split.totalAmount),
    [customSharesOn, shareLines, split.totalAmount]
  );

  const nudgeAmount = useMemo(() => {
    if (splitMode === "items") {
      const linked = linkedPersonName.trim().toLowerCase();
      const match = linked
        ? itemPeople.find((p) => p.name.trim().toLowerCase() === linked)
        : itemPeople[0];
      return match ? itemizedResult.grandPerPerson[match.id] ?? split.totalPerPerson : split.totalPerPerson;
    }
    if (splitMode === "percent") {
      const linked = linkedPersonName.trim().toLowerCase();
      const match = linked
        ? itemPeople.find((p) => p.name.trim().toLowerCase() === linked)
        : itemPeople[0];
      return match ? percentTotals[match.id] ?? split.totalPerPerson : split.totalPerPerson;
    }
    if (customSharesOn && shareLines.length > 0) {
      const linked = linkedPersonName.trim().toLowerCase();
      const match = linked
        ? shareLines.find((l) => l.name.trim().toLowerCase() === linked)
        : null;
      return match?.amount ?? shareLines[0]?.amount ?? split.totalPerPerson;
    }
    return split.totalPerPerson;
  }, [
    customSharesOn,
    itemPeople,
    itemizedResult.grandPerPerson,
    linkedPersonName,
    percentTotals,
    shareLines,
    split.totalPerPerson,
    splitMode,
  ]);

  useEffect(() => {
    if (!split.hasBill || split.totalAmount <= 0) {
      return;
    }
    setShareLines((prev) => {
      if (!customSharesOn) {
        return makeEvenShares(people, split.totalAmount, t("sharePersonPrefix"));
      }
      if (prev.length !== people) {
        const next = makeEvenShares(people, split.totalAmount, t("sharePersonPrefix"));
        if (linkedPersonName.trim()) {
          next[0] = { ...next[0]!, name: linkedPersonName.trim() };
        }
        return next;
      }
      return redistributeShares(prev, split.totalAmount);
    });
  }, [customSharesOn, linkedPersonName, people, split.hasBill, split.totalAmount, t]);

  const receiptWidth = getReceiptCaptureWidth(windowWidth);
  const receiptOuterWidth = useMemo(
    () => receiptCaptureOuterWidth(receiptWidth),
    [receiptWidth]
  );

  const sharePreviewChromeHeight = insets.top + insets.bottom + 200;

  const sharePreviewImageLayout = useMemo(
    () =>
      computeReceiptPreviewLayout(
        sharePreviewIntrinsic,
        receiptOuterWidth,
        windowWidth,
        windowHeight,
        "fitScreen",
        sharePreviewChromeHeight
      ),
    [receiptOuterWidth, sharePreviewChromeHeight, sharePreviewIntrinsic, windowHeight, windowWidth]
  );

  useEffect(() => {
    if (!sharePreviewUri) {
      setSharePreviewIntrinsic(null);
      return;
    }
    Image.getSize(
      sharePreviewUri,
      (width, height) => setSharePreviewIntrinsic({ width, height }),
      () => setSharePreviewIntrinsic(null)
    );
  }, [sharePreviewUri]);

  const dateLabel = formatDateMedium(new Date().toISOString(), locale);

  useEffect(() => {
    setTipEnabled(localeTipConfig.startEnabled);
    setTipPercent(localeTipConfig.defaultPercent);
    setIsCustomTip(false);
    setCustomTipDraft(String(localeTipConfig.defaultPercent));
  }, [localeTipConfig]);

  useEffect(() => {
    if (!prefsLoaded) {
      return;
    }
    setNudgeTone(defaultTone);
  }, [defaultTone, prefsLoaded]);

  useEffect(() => {
    if (!prefsLoaded) {
      return;
    }
    setReceiptTemplateId(resolveReceiptTemplateId(defaultTemplateId, isPro));
  }, [defaultTemplateId, isPro, prefsLoaded]);

  useEffect(() => {
    if (!prefsLoaded) {
      return;
    }
    if (prevCurrencyRef.current === null) {
      prevCurrencyRef.current = currency;
      return;
    }
    if (prevCurrencyRef.current !== currency) {
      prevCurrencyRef.current = currency;
      setBillDigits("");
    }
  }, [currency, prefsLoaded]);

  const handleSelectPreset = (value: number) => {
    setIsCustomTip(false);
    setTipPercent(value);
    setCustomTipDraft(String(value));
  };

  const handleSelectCustom = () => {
    setIsCustomTip(true);
    setCustomTipDraft(String(tipPercent));
  };

  const handleCustomDraftChange = (value: string) => {
    setCustomTipDraft(value);
    const parsed = parseFloat(value);
    if (Number.isFinite(parsed)) {
      setTipPercent(clampTipPercent(parsed));
    }
  };

  const handleTipEnabledChange = useCallback(
    (enabled: boolean) => {
      setTipEnabled(enabled);
      if (enabled) {
        setTipPercent(localeTipConfig.defaultPercent);
        setCustomTipDraft(String(localeTipConfig.defaultPercent));
        setIsCustomTip(false);
      }
    },
    [localeTipConfig.defaultPercent]
  );

  const handleSettingsPress = () => {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.push("/settings");
  };

  const handleToneChange = useCallback(
    (tone: NudgeTone) => {
      setNudgeTone(tone);
      void setDefaultTone(tone);
    },
    [setDefaultTone]
  );

  const handleTemplateChange = useCallback(
    (id: ReceiptTemplateId) => {
      setReceiptTemplateId(id);
      void setDefaultTemplateId(id);
    },
    [setDefaultTemplateId]
  );

  const activeTemplateId = useMemo(
    () => resolveReceiptTemplateId(receiptTemplateId, isPro),
    [isPro, receiptTemplateId]
  );

  const dismissSharePreview = useCallback(() => {
    setSharePreviewUri(null);
  }, []);

  /** PNG for share sheet / Messages. Preview capture omits export padding. */
  const captureSplitReceiptPng = useCallback(
    async (forShareExport: boolean) => {
      setShareExportPadActive(forShareExport);
      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
      });
      try {
        const padH = forShareExport ? SPLIT_SHARE_EXPORT_PAD_H * 2 : 0;
        return await captureRef(shotRef, {
          format: "png",
          quality: 1,
          width: getReceiptCaptureExportWidth(receiptOuterWidth + padH),
        });
      } finally {
        setShareExportPadActive(false);
      }
    },
    [receiptOuterWidth]
  );

  /** Share Receipt only: runs immediately before the native share sheet is shown. */
  const countNudgeWhenShareSheetPresented = useCallback(async () => {
    // ===== NUDGE COUNT (Share Receipt): increment when share sheet is presented: do not move or duplicate =====
    void trackNudgeSent(isPro, locale);
    if (!isPro) {
      await recordSend();
      void trackFreeNudgesUsed(usedThisMonth + 1);
    }
  }, [isPro, locale, recordSend, usedThisMonth]);

  const confirmSharePreview = useCallback(async () => {
    if (!sharePreviewUri) {
      return;
    }
    try {
      const shareUri = await captureSplitReceiptPng(true);
      if (!shareUri) {
        throw new Error(t("couldNotCapture"));
      }
      await countNudgeWhenShareSheetPresented();
      await shareReceiptImage(shareUri, {
        dialogTitle: t("shareReceiptDialog"),
      });
      void trackEvent("receipt_share");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const message = e instanceof Error ? e.message : t("somethingWentWrongShort");
      setShareFailedMessage(message);
    } finally {
      setSharePreviewUri(null);
    }
  }, [captureSplitReceiptPng, countNudgeWhenShareSheetPresented, sharePreviewUri, t]);

  const handleShareReceipt = useCallback(async () => {
    if (!split.hasBill) {
      return;
    }
    if (customSharesOn && !sharesBalancedOk) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (!advancedSplitReady) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }
    if (!isPro && !canSaveFree) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowSplitQuotaModal(true);
      return;
    }
    if (!isPro && !canSendFree) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      setShowQuotaModal(true);
      return;
    }
    setSharing(true);
    try {
      try {
        const receiptFooterResolved = receiptFooterText;
        await addSplit({
          restaurant: restaurant.trim(),
          billAmount: billAmount ?? 0,
          tipPercent: split.tipPercent,
          people: split.people,
          tipPerPerson: split.tipPerPerson,
          totalPerPerson: nudgeAmount,
          tipAmount: split.tipAmount,
          totalAmount: split.totalAmount,
          currency,
          nudgeTone,
          receiptTemplateId: activeTemplateId,
          receiptFooterResolved,
          nudgePreviewText,
          linkedPersonName: linkedPersonName || undefined,
          category,
          shares: customSharesOn
            ? shareLines.map((l) => ({ name: l.name.trim() || t("sharePersonPrefix"), amount: l.amount }))
            : undefined,
        });
        await recordSplit();
        void logActivity(
          "split_saved",
          restaurant.trim() || t("dinner"),
          `${nudgeAmount} ${currency}`
        );
      } catch {
        // History is best-effort; still share the receipt.
      }

      if (Platform.OS === "web") {
        setShowWebPreviewSharingAlert(true);
        return;
      }

      const previewUri = await captureSplitReceiptPng(false);
      if (!previewUri) {
        throw new Error(t("couldNotCapture"));
      }
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        setShowSharingUnavailableAlert(true);
        return;
      }

      if (isPro) {
        setSharePreviewUri(previewUri);
        return;
      }

      const shareUri = await captureSplitReceiptPng(true);
      if (!shareUri) {
        throw new Error(t("couldNotCapture"));
      }
      await countNudgeWhenShareSheetPresented();
      await shareReceiptImage(shareUri, {
        dialogTitle: t("shareReceiptDialog"),
      });
      void trackEvent("receipt_share");
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const message = e instanceof Error ? e.message : t("somethingWentWrongShort");
      setShareFailedMessage(message);
    } finally {
      setSharing(false);
    }
  }, [
    addSplit,
    billAmount,
    canSaveFree,
    canSendFree,
    captureSplitReceiptPng,
    category,
    countNudgeWhenShareSheetPresented,
    currency,
    customSharesOn,
    isPro,
    linkedPersonName,
    locale,
    nudgeAmount,
    nudgePreviewText,
    nudgeTone,
    activeTemplateId,
    receiptFooterText,
    recordSplit,
    restaurant,
    shareLines,
    sharesBalancedOk,
    split.hasBill,
    split.people,
    split.tipAmount,
    split.tipPercent,
    split.tipPerPerson,
    split.totalAmount,
    split.totalPerPerson,
    t,
  ]);

  const offscreenTop = Dimensions.get("window").height + 120;

  return (
    <View style={styles.screen}>
      <StatusBar style={sharePreviewUri ? "light" : isDark ? "light" : "dark"} />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? insets.top : 0}
      >
        <ScrollView
          style={
            {
              direction: isRTL ? "rtl" : "ltr",
              writingDirection: isRTL ? "rtl" : "ltr",
            } as import("react-native").ViewStyle
          }
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          onScrollBeginDrag={() => Keyboard.dismiss()}
          contentContainerStyle={[
            styles.content,
            { paddingTop: Math.max(insets.top, spacing.lg) },
          ]}
          showsVerticalScrollIndicator={false}
          bounces
          overScrollMode="auto"
        >
            <View style={[styles.topRow, rtlRow(isRTL)]}>
              <Pressable
                onPress={handleSettingsPress}
                hitSlop={12}
                style={({ pressed }) => [styles.topRowBtn, pressed && styles.topRowBtnPressed]}
                accessibilityRole="button"
                accessibilityLabel={t("settings")}
              >
                <Ionicons name="settings-outline" size={22} color={colors.textSecondary} />
              </Pressable>
              <View style={styles.headerCenter}>
                <Text style={styles.wordmark}>{t("split")}</Text>
              </View>
              <View style={styles.topRowBtn} />
            </View>

            <View style={styles.heroCard}>
              <View style={styles.inputCapsule}>
                <TextInput
                  value={restaurant}
                  onChangeText={setRestaurant}
                  numberOfLines={1}
                  placeholder={t("whereDidYouEat")}
                  placeholderTextColor={colors.textSecondary}
                  style={[
                    styles.restaurantInput,
                    { writingDirection: isRTL ? "rtl" : "ltr", textAlign: isRTL ? "right" : "center" },
                  ]}
                  selectionColor={colors.accent}
                  cursorColor={colors.accent}
                  accessibilityLabel={t("restaurantName")}
                  autoCorrect
                />
              </View>

              <BillInput
                billDigits={billDigits}
                onBillDigitsChange={setBillDigits}
                currencyCode={billCurrency}
                fractionDigits={getCurrencyFractionDigits(billCurrency)}
                symbol={getCurrencyNarrowSymbol(billCurrency)}
                variant="hero"
              />

              <FxBillRow
                appCurrency={currency}
                billCurrency={billCurrency}
                onBillCurrencyChange={setBillCurrency}
                rates={fxRates}
                billAmount={billAmountRaw}
              />

              <TipSection
                enabled={tipEnabled}
                onEnabledChange={handleTipEnabledChange}
                selectedPercent={tipPercent}
                isCustom={isCustomTip}
                customDraft={customTipDraft}
                onSelectPreset={handleSelectPreset}
                onSelectCustom={handleSelectCustom}
                onCustomDraftChange={handleCustomDraftChange}
              />

              <View style={styles.heroDivider} />

              <PeopleStepper people={people} onChange={setPeople} variant="inline" />

              <CategoryChips value={category} onChange={setCategory} />

              {split.hasBill ? (
                <ItemizedEditor
                  mode={splitMode}
                  onModeChange={(m) => {
                    setSplitMode(m);
                    if (m !== "even") {
                      setCustomSharesOn(false);
                    }
                  }}
                  people={itemPeople}
                  onChangePersonName={(id, name) =>
                    setItemPeople((prev) => prev.map((p) => (p.id === id ? { ...p, name } : p)))
                  }
                  items={billItems}
                  onChangeItems={setBillItems}
                  percents={percents}
                  onChangePercent={(id, percent) =>
                    setPercents((prev) => ({ ...prev, [id]: percent }))
                  }
                  tipAmount={split.tipAmount}
                  totalWithTip={split.totalAmount}
                  currencyCode={currency}
                  isPro={isPro}
                  onRequirePro={() => setShowCustomSharesProAlert(true)}
                />
              ) : null}

              {split.hasBill && splitMode === "even" ? (
                <ShareAssigner
                  enabled={customSharesOn}
                  onEnabledChange={setCustomSharesOn}
                  lines={shareLines}
                  onChangeLine={(id, patch) => {
                    setShareLines((prev) =>
                      prev.map((l) => (l.id === id ? { ...l, ...patch } : l))
                    );
                  }}
                  totalAmount={split.totalAmount}
                  currencyCode={currency}
                  isPro={isPro}
                  onRequirePro={() => setShowCustomSharesProAlert(true)}
                  balanced={sharesBalancedOk}
                />
              ) : null}

              {!isPro ? (
                <Text style={styles.quotaHint}>
                  {t("freeSplitsRemaining", {
                    remaining: remainingSplitsFree,
                    total: FREE_SPLITS_PER_DAY,
                  })}
                </Text>
              ) : null}
            </View>

            {split.hasBill ? (
              <Animated.View
                entering={FadeInDown.springify().damping(17).stiffness(210)}
                exiting={FadeOutDown.duration(200)}
                style={styles.previewBlock}
              >
                <ResultCard
                  hasBill={split.hasBill}
                  tipPerPerson={split.tipPerPerson}
                  totalPerPerson={nudgeAmount}
                  totalTip={split.tipAmount}
                  people={split.people}
                  tipPercent={split.tipPercent}
                  currencyCode={currency}
                />

                <NudgeSection
                  hasBill={split.hasBill}
                  totalPerPerson={nudgeAmount}
                  restaurant={restaurant}
                  isPro={isPro}
                  tone={nudgeTone}
                  onToneChange={handleToneChange}
                  currencyCode={currency}
                  onPreviewTextChange={setNudgePreviewText}
                />

                <ReceiptTemplatePicker
                  value={activeTemplateId}
                  onChange={handleTemplateChange}
                  isPro={isPro}
                  onRequirePro={() => setShowTemplateProAlert(true)}
                />

                <View style={styles.shareCtaWrap}>
                  <ShareReceiptButton
                    ready={
                      split.hasBill &&
                      advancedSplitReady &&
                      (!customSharesOn || sharesBalancedOk)
                    }
                    onPress={handleShareReceipt}
                    disabled={
                      sharing ||
                      !!sharePreviewUri ||
                      !advancedSplitReady ||
                      (customSharesOn && !sharesBalancedOk)
                    }
                  />
                </View>
              </Animated.View>
            ) : null}
        </ScrollView>
      </KeyboardAvoidingView>

      {split.hasBill ? (
        <View
          pointerEvents="none"
          style={[
            styles.offscreenShot,
            {
              top: offscreenTop,
              width:
                receiptOuterWidth + (shareExportPadActive ? SPLIT_SHARE_EXPORT_PAD_H * 2 : 0),
            },
          ]}
          collapsable={false}
        >
          <ViewShot
            ref={shotRef}
            options={{ format: "png", quality: 1 }}
            style={[
              styles.shotInner,
              {
                width:
                  receiptOuterWidth + (shareExportPadActive ? SPLIT_SHARE_EXPORT_PAD_H * 2 : 0),
              },
            ]}
          >
            <View
              style={
                shareExportPadActive
                  ? {
                      paddingVertical: SPLIT_SHARE_EXPORT_PAD_V,
                      paddingHorizontal: SPLIT_SHARE_EXPORT_PAD_H,
                      backgroundColor: "transparent",
                    }
                  : undefined
              }
            >
            <ReceiptCard
              width={receiptWidth}
              restaurantLabel={restaurant}
              dateLabel={dateLabel}
              billAmount={billAmount ?? 0}
              tipPercent={split.tipPercent}
              tipAmount={split.tipAmount}
              totalAmount={split.totalAmount}
              totalPerPerson={nudgeAmount}
              people={split.people}
              isPro={isPro}
              hideReceiptBranding={hideReceiptBranding}
              customFooter={receiptFooterText}
              tone={nudgeTone}
              templateId={activeTemplateId}
              currencyCode={currency}
              previewText={nudgePreviewText}
              zigzagHorizontalOnly
              shareBreakdown={
                customSharesOn && sharesBalancedOk
                  ? shareLines.map((l) => ({
                      name: l.name.trim() || t("sharePersonPrefix"),
                      amount: l.amount,
                    }))
                  : undefined
              }
            />
            </View>
          </ViewShot>
        </View>
      ) : null}
      {!prefsLoaded ? (
        <View style={styles.loadingPrefs} pointerEvents="none">
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : null}
      <Modal
        visible={!!sharePreviewUri}
        transparent
        animationType="slide"
        onRequestClose={dismissSharePreview}
      >
        <View style={styles.sharePreviewRoot}>
          <View
            style={[
              styles.sharePreviewTopBar,
              rtlRow(isRTL),
              {
                paddingTop: insets.top + spacing.sm,
                paddingHorizontal: sharePreviewImageLayout.marginH,
              },
            ]}
          >
            <View style={styles.sharePreviewTopSpacer} />
            <Pressable
              onPress={() => {
                void Haptics.selectionAsync();
                dismissSharePreview();
              }}
              hitSlop={16}
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
              { paddingHorizontal: sharePreviewImageLayout.marginH },
            ]}
            showsVerticalScrollIndicator={false}
            bounces
          >
            {sharePreviewUri ? (
              <View
                style={[
                  styles.sharePreviewImageFrame,
                  {
                    width: sharePreviewImageLayout.imgW + SPLIT_RECEIPT_PREVIEW_PAD * 2,
                    height: sharePreviewImageLayout.imgH + SPLIT_RECEIPT_PREVIEW_PAD * 2,
                    padding: SPLIT_RECEIPT_PREVIEW_PAD,
                  },
                ]}
              >
                <Image
                  source={{ uri: sharePreviewUri }}
                  style={{
                    width: sharePreviewImageLayout.imgW,
                    height: sharePreviewImageLayout.imgH,
                  }}
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
                paddingHorizontal: sharePreviewImageLayout.marginH,
                paddingTop: spacing.lg,
              },
            ]}
          >
            <Pressable
              onPress={() => {
                void confirmSharePreview();
              }}
              style={({ pressed }) => [styles.sharePreviewCta, pressed && styles.sharePreviewCtaPressed]}
              accessibilityRole="button"
              accessibilityLabel={t("shareReceiptImage")}
            >
              <Text style={styles.sharePreviewCtaText}>{t("share")}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                void Haptics.selectionAsync();
                dismissSharePreview();
              }}
              style={({ pressed }) => [styles.sharePreviewDismiss, pressed && styles.sharePreviewDismissPressed]}
              accessibilityRole="button"
              accessibilityLabel={t("cancelSharing")}
            >
              <Text style={styles.sharePreviewDismissText}>{t("cancel")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      <AppAlert
        visible={showQuotaModal}
        title={t("monthlyNudgeLimit")}
        message={t("monthlyNudgeLimitBody", { total: FREE_NUDGES_PER_MONTH })}
        onRequestClose={() => setShowQuotaModal(false)}
        buttons={[
          { text: t("notNow"), style: "cancel", onPress: () => setShowQuotaModal(false) },
          {
            text: t("getUnlimited"),
            onPress: () => {
              setShowQuotaModal(false);
              router.push("/paywall");
            },
          },
        ]}
      />
      <AppAlert
        visible={showSplitQuotaModal}
        title={t("dailySplitLimit")}
        message={t("dailySplitLimitBody", { total: FREE_SPLITS_PER_DAY })}
        onRequestClose={() => setShowSplitQuotaModal(false)}
        buttons={[
          { text: t("notNow"), style: "cancel", onPress: () => setShowSplitQuotaModal(false) },
          {
            text: t("getUnlimited"),
            onPress: () => {
              setShowSplitQuotaModal(false);
              router.push("/paywall");
            },
          },
        ]}
      />
      <AppAlert
        visible={showCustomSharesProAlert}
        title={t("nudgrrUnlimited")}
        message={t("customSharesProBody")}
        onRequestClose={() => setShowCustomSharesProAlert(false)}
        buttons={[
          { text: t("notNow"), style: "cancel", onPress: () => setShowCustomSharesProAlert(false) },
          {
            text: t("unlockNudgrr"),
            onPress: () => {
              setShowCustomSharesProAlert(false);
              router.push("/paywall");
            },
          },
        ]}
      />
      <AppAlert
        visible={showTemplateProAlert}
        title={t("nudgrrUnlimited")}
        message={t("templateProBody")}
        onRequestClose={() => setShowTemplateProAlert(false)}
        buttons={[
          { text: t("notNow"), style: "cancel", onPress: () => setShowTemplateProAlert(false) },
          {
            text: t("unlockNudgrr"),
            onPress: () => {
              setShowTemplateProAlert(false);
              router.push("/paywall");
            },
          },
        ]}
      />
      <AppAlert
        visible={showWebPreviewSharingAlert}
        title={t("webPreviewLimitation")}
        message={t("webPreviewSharingFull")}
        onRequestClose={() => setShowWebPreviewSharingAlert(false)}
        buttons={[{ text: t("ok"), onPress: () => setShowWebPreviewSharingAlert(false) }]}
      />
      <AppAlert
        visible={showSharingUnavailableAlert}
        title={t("sharingUnavailable")}
        message={t("saveScreenshotManually")}
        onRequestClose={() => setShowSharingUnavailableAlert(false)}
        buttons={[{ text: t("ok"), onPress: () => setShowSharingUnavailableAlert(false) }]}
      />
      <AppAlert
        visible={shareFailedMessage !== null}
        title={t("shareFailed")}
        message={shareFailedMessage ?? undefined}
        onRequestClose={() => setShareFailedMessage(null)}
        buttons={[{ text: t("ok"), onPress: () => setShareFailedMessage(null) }]}
      />
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  flex: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xxl + 72,
    gap: spacing.lg,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: touchTarget.min + 8,
    marginBottom: spacing.xs,
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  topRowBtn: {
    width: 44,
    minHeight: touchTarget.min,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  wordmark: {
    ...typography.wordmark,
    color: colors.textPrimary,
    textAlign: "center",
  },
  topRowBtnPressed: {
    opacity: 0.65,
  },
  heroCard: {
    borderRadius: radii.xl,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.md,
    gap: spacing.sm,
    shadowColor: colors.shadow,
    shadowOpacity: colors.cardShadowOpacity + 0.02,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },
  quotaHint: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  heroDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  inputCapsule: {
    width: "100%",
    borderRadius: radii.lg,
    backgroundColor: colors.accentSoft,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.sm,
  },
  restaurantInput: {
    ...typography.body,
    fontSize: 16,
    color: colors.textPrimary,
    borderWidth: 0,
    backgroundColor: "transparent",
    paddingHorizontal: spacing.sm,
    minHeight: 40,
    paddingVertical: spacing.xs,
    textAlign: "center",
  },
  previewBlock: {
    gap: spacing.lg,
    marginTop: spacing.xs,
  },
  shareCtaWrap: {
    width: "100%",
    alignSelf: "stretch",
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
  loadingPrefs: {
    position: "absolute",
    right: spacing.lg,
    top: spacing.lg,
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
    color: "rgba(243, 232, 212, 0.92)",
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
  sharePreviewImageFrame: {
    overflow: "visible",
    backgroundColor: "transparent",
    alignItems: "center",
    justifyContent: "center",
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
    color: "rgba(243, 232, 212, 0.75)",
    fontFamily: fonts.body,
  },
  });
}
