import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { StatusBar } from "expo-status-bar";
import * as Haptics from "../lib/appHaptics";
import { useRouter } from "expo-router";
import Purchases from "react-native-purchases";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppAlert } from "../components/AppAlert";
import { ReceiptTemplatePicker } from "../components/ReceiptTemplatePicker";
import { getLocalizedToneOptions } from "../constants/messages";
import {
  resolveReceiptTemplateId,
  type ReceiptTemplateId,
} from "../constants/receiptTemplates";
import { fonts, radii, spacing, touchTarget, typography, type AppColors } from "../constants/theme";
import { REVENUECAT_UNLIMITED_ENTITLEMENT_ID } from "../constants/purchases";
import { useAppPreferences } from "../hooks/useAppPreferences";
import { useLocale } from "../hooks/useLocale";
import { useColors } from "../hooks/useColors";
import { useTheme } from "../hooks/useTheme";
import { useProStatus } from "../hooks/useProStatus";
import { useReceiptFooter } from "../hooks/useReceiptFooter";
import { useProjects } from "../hooks/useProjects";
import { useSplitHistory } from "../hooks/useSplitHistory";
import { restoreBackupPayload, shareBackupJson, shareTextFile, splitsToCsv } from "../lib/backup";
import { SUPPORTED_LOCALES, type SupportedLocale } from "../lib/i18n";
import { rtlRow } from "../lib/rtl";
import { trackEvent } from "../lib/analytics";
import { safeRouterBack } from "../lib/safeRouterBack";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";

export default function SettingsScreen() {
  const colors = useColors();
  const { preference, changeTheme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { isPro, refresh } = useProStatus();
  const { locale, changeLocale, t, isRTL } = useLocale();
  const {
    currency,
    defaultTone,
    setDefaultTone,
    defaultTemplateId,
    setDefaultTemplateId,
    hideReceiptBranding,
    setHideReceiptBranding,
    paymentHint,
    setPaymentHint,
    overdueNotifications,
    setOverdueNotifications,
    hapticsEnabled,
    setHapticsEnabledPref,
  } = useAppPreferences();
  const { footer, saveFooter } = useReceiptFooter();
  const { clearAll, items: splitItems } = useSplitHistory();
  const { clearAllProjects } = useProjects();
  const [restoreBusy, setRestoreBusy] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [backupMessage, setBackupMessage] = useState<string | null>(null);
  const [footerDraft, setFooterDraft] = useState(footer);
  const [footerEditing, setFooterEditing] = useState(false);
  const [paymentHintDraft, setPaymentHintDraft] = useState(paymentHint);
  const [paymentHintEditing, setPaymentHintEditing] = useState(false);
  const [showWebPreviewRestoreAlert, setShowWebPreviewRestoreAlert] = useState(false);
  const [showRestoredAlert, setShowRestoredAlert] = useState(false);
  const [showNothingToRestoreAlert, setShowNothingToRestoreAlert] = useState(false);
  const [showRestoreFailedAlert, setShowRestoreFailedAlert] = useState(false);
  const [clearAllStep, setClearAllStep] = useState<1 | 2 | null>(null);
  const [showLanguageSheet, setShowLanguageSheet] = useState(false);
  const [showTemplateProAlert, setShowTemplateProAlert] = useState(false);

  const activeTemplateId = useMemo(
    () => resolveReceiptTemplateId(defaultTemplateId, isPro),
    [defaultTemplateId, isPro]
  );

  const handleTemplateChange = useCallback(
    (id: ReceiptTemplateId) => {
      void setDefaultTemplateId(id);
    },
    [setDefaultTemplateId]
  );

  useEffect(() => {
    if (!footerEditing) {
      setFooterDraft(footer);
    }
  }, [footer, footerEditing]);

  useEffect(() => {
    if (!paymentHintEditing) {
      setPaymentHintDraft(paymentHint);
    }
  }, [paymentHint, paymentHintEditing]);

  const toneOptions = useMemo(() => getLocalizedToneOptions(t), [t]);
  const localeEntries = useMemo(
    () => Object.entries(SUPPORTED_LOCALES) as [SupportedLocale, { label: string; rtl: boolean }][],
    []
  );
  const currentLocaleLabel = SUPPORTED_LOCALES[locale]?.label ?? locale;

  const onRestore = useCallback(async () => {
    if (Platform.OS === "web") {
      setShowWebPreviewRestoreAlert(true);
      return;
    }
    setRestoreBusy(true);
    try {
      const info = await Purchases.restorePurchases();
      await refresh();
      void trackEvent("paywall_restore");
      const isNowPro =
        typeof info.entitlements?.active?.[REVENUECAT_UNLIMITED_ENTITLEMENT_ID] !== "undefined";
      if (isNowPro) {
        setShowRestoredAlert(true);
      } else {
        setShowNothingToRestoreAlert(true);
      }
    } catch {
      setShowRestoreFailedAlert(true);
    } finally {
      setRestoreBusy(false);
    }
  }, [refresh]);

  const onSubscribe = useCallback(() => {
    router.push("/paywall");
  }, [router]);

  const handleBack = useCallback(() => {
    safeRouterBack(router);
  }, [router]);

  const handleClearAll = useCallback(() => {
    setClearAllStep(1);
  }, []);

  return (
    <ScrollView
      style={styles.screen}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.sm, paddingBottom: insets.bottom + spacing.xxl },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <StatusBar style={isDark ? "light" : "dark"} />

      <View style={[styles.header, rtlRow(isRTL)]}>
        <Pressable
          onPress={handleBack}
          style={({ pressed }) => [styles.back, pressed && styles.pressed]}
          accessibilityRole="button"
          accessibilityLabel={t("goBack")}
        >
          <Text style={styles.backText}>{t("back")}</Text>
        </Pressable>
        <Text style={styles.title}>{t("settingsTitle")}</Text>
        <View style={styles.back} />
      </View>

      <View style={styles.cardFlush}>
          <Pressable
            onPress={() => {
              void Haptics.selectionAsync();
              setShowLanguageSheet(true);
            }}
            style={({ pressed }) => [styles.navRowPad, rtlRow(isRTL), pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={t("language")}
          >
            <View style={styles.navCopy}>
              <Text style={styles.rowTitle}>{t("language")}</Text>
              <Text style={styles.rowMeta}>{currentLocaleLabel}</Text>
            </View>
            <Ionicons name="chevron-expand-outline" size={18} color={colors.textSecondary} />
          </Pressable>
          <View style={styles.innerDividerFlush} />
          <Pressable
            onPress={() => router.push("/currency")}
            style={({ pressed }) => [styles.navRowPad, rtlRow(isRTL), pressed && styles.pressed]}
            accessibilityRole="button"
            accessibilityLabel={t("selectCurrency")}
          >
            <View style={styles.navCopy}>
              <Text style={styles.rowTitle}>{t("currency")}</Text>
              <Text style={styles.rowMeta}>{currency}</Text>
            </View>
            <Ionicons
              name={isRTL ? "chevron-back" : "chevron-forward"}
              size={18}
              color={colors.textSecondary}
            />
          </Pressable>
        </View>

      <View style={styles.group}>
        <Text style={styles.groupLabel}>{t("appearance")}</Text>
        <View style={styles.card}>
          <View style={[styles.segment, rtlRow(isRTL)]}>
            {(["system", "light", "dark"] as const).map((pref) => {
              const active = preference === pref;
              const label =
                pref === "system"
                  ? t("systemDefault")
                  : pref === "light"
                    ? t("lightMode")
                    : t("darkMode");
              return (
                <Pressable
                  key={pref}
                  onPress={() => void changeTheme(pref)}
                  style={({ pressed }) => [
                    styles.segmentItem,
                    active && styles.segmentItemActive,
                    pressed && !active && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={label}
                >
                  <Text style={[styles.segmentText, active && styles.segmentTextActive]} numberOfLines={1}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.group}>
        <Text style={styles.groupLabel}>{t("defaultTone")}</Text>
        <View style={styles.card}>
          <View style={styles.toneGrid}>
            {toneOptions.map((opt) => {
              const active = defaultTone === opt.id;
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => {
                    void Haptics.selectionAsync();
                    void setDefaultTone(opt.id);
                  }}
                  style={({ pressed }) => [
                    styles.toneChip,
                    active && styles.toneChipActive,
                    pressed && styles.pressed,
                  ]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.toneChipText, active && styles.toneChipTextActive]} numberOfLines={1}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>

      <View style={styles.group}>
        <Text style={styles.groupLabel}>{t("defaultTemplate")}</Text>
        <ReceiptTemplatePicker
          value={activeTemplateId}
          onChange={handleTemplateChange}
          isPro={isPro}
          onRequirePro={() => setShowTemplateProAlert(true)}
          showLabel={false}
        />
      </View>

      {isPro ? (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>{t("receiptFooter")}</Text>
          <View style={styles.card}>
            <TextInput
              value={footerDraft}
              onChangeText={setFooterDraft}
              onFocus={() => setFooterEditing(true)}
              onBlur={() => {
                void saveFooter(footerDraft);
                setFooterEditing(false);
              }}
              onEndEditing={() => {
                void saveFooter(footerDraft);
                setFooterEditing(false);
              }}
              placeholder={t("receiptFooter")}
              placeholderTextColor={colors.textSecondary}
              style={styles.footerInput}
              selectionColor={colors.accent}
              multiline
            />
            {footerEditing ? (
              <Pressable
                onPress={() => {
                  setFooterDraft(footer);
                  setFooterEditing(false);
                }}
                style={({ pressed }) => [styles.footerCancelBtn, pressed && styles.pressed]}
              >
                <Text style={styles.footerCancelText}>{t("cancel")}</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {isPro ? (
        <View style={styles.group}>
          <Text style={styles.groupLabel}>{t("paymentHint")}</Text>
          <View style={styles.card}>
            <Text style={styles.cardBody}>{t("paymentHintHint")}</Text>
            <TextInput
              value={paymentHintDraft}
              onChangeText={(text) => setPaymentHintDraft(text.slice(0, 120))}
              onFocus={() => setPaymentHintEditing(true)}
              onBlur={() => {
                void setPaymentHint(paymentHintDraft);
                setPaymentHintEditing(false);
              }}
              onEndEditing={() => {
                void setPaymentHint(paymentHintDraft);
                setPaymentHintEditing(false);
              }}
              placeholder={t("paymentHintPlaceholder")}
              placeholderTextColor={colors.textSecondary}
              style={styles.footerInput}
              selectionColor={colors.accent}
              multiline
              maxLength={120}
            />
          </View>
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={[styles.toggleRow, rtlRow(isRTL)]}>
          <View style={styles.toggleCopy}>
            <Text style={styles.rowTitle}>{t("hapticsTitle")}</Text>
            <Text style={styles.cardBody}>{t("hapticsBody")}</Text>
          </View>
          <Switch
            value={hapticsEnabled}
            onValueChange={(val) => void setHapticsEnabledPref(val)}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={isDark ? colors.textPrimary : "#FFFFFF"}
            ios_backgroundColor={colors.border}
          />
        </View>
        <View style={styles.innerDivider} />
        <View style={[styles.toggleRow, rtlRow(isRTL)]}>
          <View style={styles.toggleCopy}>
            <Text style={styles.rowTitle}>{t("overdueNotifTitle")}</Text>
            <Text style={styles.cardBody}>{t("overdueNotifBody")}</Text>
          </View>
          <Switch
            value={overdueNotifications}
            onValueChange={(val) => void setOverdueNotifications(val)}
            trackColor={{ false: colors.border, true: colors.accent }}
            thumbColor={isDark ? colors.textPrimary : "#FFFFFF"}
            ios_backgroundColor={colors.border}
          />
        </View>
        {isPro ? (
          <>
            <View style={styles.innerDivider} />
            <View style={[styles.toggleRow, rtlRow(isRTL)]}>
              <View style={styles.toggleCopy}>
                <Text style={styles.rowTitle}>{t("hideMadeWithNudgrr")}</Text>
                <Text style={styles.cardBody}>{t("hideMadeWithNudgrrBody")}</Text>
              </View>
              <Switch
                value={hideReceiptBranding}
                onValueChange={(val) => void setHideReceiptBranding(val)}
                trackColor={{ false: colors.border, true: colors.accent }}
                thumbColor={isDark ? colors.textPrimary : "#FFFFFF"}
                ios_backgroundColor={colors.border}
              />
            </View>
          </>
        ) : null}
      </View>

      <View style={styles.group}>
        <Text style={styles.groupLabel}>{t("backupTitle")}</Text>
        <View style={styles.card}>
          <Pressable
            disabled={backupBusy}
            onPress={() => {
              void (async () => {
                setBackupBusy(true);
                try {
                  await shareBackupJson();
                  setBackupMessage(t("backupDone"));
                } catch {
                  setBackupMessage(t("backupFailed"));
                } finally {
                  setBackupBusy(false);
                }
              })();
            }}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
          >
            <Text style={styles.actionText}>{t("backupExport")}</Text>
          </Pressable>
          <Pressable
            disabled={backupBusy}
            onPress={() => {
              void (async () => {
                setBackupBusy(true);
                try {
                  const csv = splitsToCsv(
                    splitItems.map((s) => ({
                      id: s.id,
                      createdAt: s.createdAt,
                      restaurant: s.restaurant,
                      totalAmount: s.totalAmount,
                      currency: s.currency ?? "",
                      paidAt: s.paidAt ?? "",
                      category: s.category ?? "",
                    }))
                  );
                  await shareTextFile(`nudgrr-splits-${Date.now()}.csv`, csv, "text/csv");
                  setBackupMessage(t("backupDone"));
                } catch {
                  setBackupMessage(t("backupFailed"));
                } finally {
                  setBackupBusy(false);
                }
              })();
            }}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
          >
            <Text style={styles.actionText}>{t("backupCsv")}</Text>
          </Pressable>
          <Pressable
            disabled={backupBusy}
            onPress={() => {
              void (async () => {
                setBackupBusy(true);
                try {
                  const picked = await DocumentPicker.getDocumentAsync({
                    type: "application/json",
                    copyToCacheDirectory: true,
                  });
                  if (picked.canceled || !picked.assets?.[0]?.uri) {
                    return;
                  }
                  const raw = await FileSystem.readAsStringAsync(picked.assets[0].uri);
                  const payload = JSON.parse(raw) as Parameters<typeof restoreBackupPayload>[0];
                  await restoreBackupPayload(payload);
                  setBackupMessage(t("backupRestored"));
                } catch {
                  setBackupMessage(t("backupFailed"));
                } finally {
                  setBackupBusy(false);
                }
              })();
            }}
            style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
          >
            <Text style={styles.actionText}>{t("backupImport")}</Text>
          </Pressable>
          {backupMessage ? <Text style={styles.cardBody}>{backupMessage}</Text> : null}
        </View>
      </View>

      <View style={styles.group}>
        <Text style={styles.groupLabel}>{t("subscription")}</Text>
        <View style={styles.card}>
          {isPro ? (
            <View style={[styles.proBadge, rtlRow(isRTL)]}>
              <View style={styles.proMark}>
                <Text style={styles.proMarkText}>∞</Text>
              </View>
              <View style={styles.proBadgeText}>
                <Text style={styles.proBadgeName}>{t("nudgrrUnlimited")}</Text>
                <Text style={styles.proBadgeSub}>{t("subscriptionActive")}</Text>
              </View>
            </View>
          ) : (
            <>
              <Text style={styles.cardBody}>{t("getUnlimitedOrRestore")}</Text>
              <Pressable
                onPress={onSubscribe}
                style={({ pressed }) => [styles.actionBtnPrimary, pressed && styles.pressed]}
              >
                <Text style={styles.actionTextPrimary}>{t("getUnlimited")}</Text>
              </Pressable>
              <Pressable
                onPress={() => void onRestore()}
                style={({ pressed }) => [styles.actionBtn, pressed && styles.pressed]}
              >
                {restoreBusy ? (
                  <ActivityIndicator color={colors.accent} />
                ) : (
                  <Text style={styles.actionText}>{t("restorePurchases")}</Text>
                )}
              </Pressable>
            </>
          )}
        </View>
      </View>

      <View style={styles.legalFooter}>
        <Text style={styles.legalMicro}>
          {t("settingsLegalAgreePrefix")}
          <Text onPress={() => router.push("/terms")} style={styles.legalLink}>
            {t("termsOfUse")}
          </Text>
          {t("settingsLegalAgreeMiddle")}
          <Text onPress={() => router.push("/privacy")} style={styles.legalLink}>
            {t("privacyPolicy")}
          </Text>
          {t("settingsLegalAgreeSuffix")}
        </Text>
        <Text style={styles.legalMicro}>
          {Platform.OS === "android"
            ? t("settingsLegalStoreNoteAndroid")
            : t("settingsLegalStoreNoteIos")}
        </Text>
        <Pressable
          onPress={() => void Linking.openURL("mailto:contact@noorlyfe.com?subject=Splitmee%20support")}
          style={({ pressed }) => [styles.supportRow, pressed && styles.pressed]}
        >
          <Text style={styles.legalMicro}>
            {t("support")} <Text style={styles.legalLink}>contact@noorlyfe.com</Text>
          </Text>
        </Pressable>
      </View>

      <Pressable
        onPress={handleClearAll}
        style={({ pressed }) => [styles.clearAllBtn, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel={t("clearAllData")}
      >
        <Text style={styles.clearAllText}>{t("clearAllData")}</Text>
      </Pressable>


      <Modal
        visible={showLanguageSheet}
        transparent
        animationType="slide"
        onRequestClose={() => setShowLanguageSheet(false)}
      >
        <View style={styles.sheetRoot}>
          <Pressable
            style={styles.sheetBackdrop}
            onPress={() => setShowLanguageSheet(false)}
            accessibilityRole="button"
            accessibilityLabel={t("cancel")}
          />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, spacing.md) + spacing.sm }]}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t("language")}</Text>
            <View style={styles.sheetList}>
              {localeEntries.map(([code, { label }], index) => {
                const active = locale === code;
                const last = index === localeEntries.length - 1;
                return (
                  <Pressable
                    key={code}
                    onPress={() => {
                      void Haptics.selectionAsync();
                      void changeLocale(code);
                      setShowLanguageSheet(false);
                    }}
                    style={({ pressed }) => [
                      styles.sheetRow,
                      rtlRow(isRTL),
                      !last && styles.sheetRowBorder,
                      active && styles.sheetRowActive,
                      pressed && styles.pressed,
                    ]}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                  >
                    <Text style={[styles.sheetRowText, active && styles.sheetRowTextActive]}>{label}</Text>
                    {active ? (
                      <Ionicons name="checkmark" size={20} color={colors.accent} />
                    ) : (
                      <View style={styles.sheetCheckSpacer} />
                    )}
                  </Pressable>
                );
              })}
            </View>
            <Pressable
              onPress={() => setShowLanguageSheet(false)}
              style={({ pressed }) => [styles.sheetCancel, pressed && styles.pressed]}
            >
              <Text style={styles.sheetCancelText}>{t("cancel")}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <AppAlert
        visible={showWebPreviewRestoreAlert}
        title={t("webPreview")}
        message={t("webPreviewRestore")}
        onRequestClose={() => setShowWebPreviewRestoreAlert(false)}
        buttons={[{ text: t("ok"), onPress: () => setShowWebPreviewRestoreAlert(false) }]}
      />
      <AppAlert
        visible={showRestoredAlert}
        title={t("restored")}
        message={t("unlimitedActiveAgain")}
        onRequestClose={() => setShowRestoredAlert(false)}
        buttons={[{ text: t("ok"), onPress: () => setShowRestoredAlert(false) }]}
      />
      <AppAlert
        visible={showNothingToRestoreAlert}
        title={t("nothingToRestore")}
        message={
          Platform.OS === "android" ? t("noActiveSubscriptionAndroid") : t("noActiveSubscription")
        }
        onRequestClose={() => setShowNothingToRestoreAlert(false)}
        buttons={[{ text: t("ok"), onPress: () => setShowNothingToRestoreAlert(false) }]}
      />
      <AppAlert
        visible={showRestoreFailedAlert}
        title={t("restoreFailed")}
        message={t("restoreFailedBody")}
        onRequestClose={() => setShowRestoreFailedAlert(false)}
        buttons={[{ text: t("ok"), onPress: () => setShowRestoreFailedAlert(false) }]}
      />
      <AppAlert
        visible={clearAllStep === 1}
        title={t("clearAllConfirm1Title")}
        message={t("clearAllConfirm1Body")}
        onRequestClose={() => setClearAllStep(null)}
        buttons={[
          { text: t("clearAllCancel"), style: "cancel", onPress: () => setClearAllStep(null) },
          {
            text: t("clearAllConfirm1Continue"),
            onPress: () => setClearAllStep(2),
          },
        ]}
      />
      <AppAlert
        visible={clearAllStep === 2}
        title={t("clearAllConfirm2Title")}
        message={t("clearAllConfirm2Body")}
        onRequestClose={() => setClearAllStep(null)}
        buttons={[
          { text: t("clearAllCancel"), style: "cancel", onPress: () => setClearAllStep(null) },
          {
            text: t("clearAllConfirm2Delete"),
            style: "destructive",
            onPress: () => {
              setClearAllStep(null);
              void Promise.all([clearAll(), clearAllProjects()]);
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
    </ScrollView>
  );
}

function createStyles(colors: AppColors, isDark: boolean) {
  const cardShadow = Platform.select({
    ios: {
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: isDark ? 0.22 : colors.cardShadowOpacity,
      shadowRadius: 12,
    },
    android: { elevation: 2 },
    default: {},
  });

  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    content: {
      paddingHorizontal: spacing.lg,
      gap: spacing.md,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: spacing.md,
      paddingHorizontal: spacing.xs,
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
    title: {
      ...typography.wordmark,
      color: colors.textPrimary,
      textAlign: "center",
      flex: 1,
    },
    group: {
      gap: spacing.sm,
    },
    groupLabel: {
      ...typography.badge,
      fontFamily: fonts.bodySemiBold,
      color: colors.textSecondary,
      letterSpacing: 0.8,
      textTransform: "uppercase",
      paddingHorizontal: spacing.xs,
    },
    card: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.xl,
      backgroundColor: colors.surface,
      padding: spacing.md,
      gap: spacing.sm,
      overflow: "hidden",
      ...cardShadow,
    },
    cardFlush: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.xl,
      backgroundColor: colors.surface,
      overflow: "hidden",
      ...cardShadow,
    },
    navRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      minHeight: touchTarget.min,
    },
    navCopy: {
      flex: 1,
      gap: 2,
    },
    rowTitle: {
      ...typography.body,
      fontFamily: fonts.bodySemiBold,
      color: colors.textPrimary,
    },
    rowTitleActive: {
      color: colors.accent,
    },
    rowMeta: {
      ...typography.badge,
      color: colors.textSecondary,
      fontFamily: fonts.bodySemiBold,
      letterSpacing: 0.4,
    },
    selectRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingVertical: spacing.md,
      paddingHorizontal: spacing.md,
      minHeight: touchTarget.min,
    },
    selectRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    selectRowActive: {
      backgroundColor: colors.accentSoft,
    },
    activeDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: colors.accent,
    },
    activeDotPlaceholder: {
      width: 8,
      height: 8,
    },
    segment: {
      flexDirection: "row",
      gap: 4,
      backgroundColor: colors.accentSoft,
      borderRadius: radii.lg,
      padding: 4,
    },
    segmentItem: {
      flex: 1,
      minHeight: 40,
      borderRadius: radii.md,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.xs,
    },
    segmentItemActive: {
      backgroundColor: colors.surface,
      ...Platform.select({
        ios: {
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: isDark ? 0.3 : 0.08,
          shadowRadius: 3,
        },
        android: { elevation: 1 },
        default: {},
      }),
    },
    segmentText: {
      ...typography.badge,
      fontFamily: fonts.bodySemiBold,
      color: colors.textSecondary,
      textAlign: "center",
    },
    segmentTextActive: {
      color: colors.textPrimary,
    },
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      paddingVertical: spacing.xs,
    },
    toggleCopy: {
      flex: 1,
      gap: 4,
    },
    innerDivider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginVertical: spacing.xs,
    },
    cardBody: {
      ...typography.badge,
      color: colors.textSecondary,
      lineHeight: 18,
    },
    actionBtnPrimary: {
      minHeight: touchTarget.min,
      borderRadius: radii.pill,
      backgroundColor: colors.accent,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: spacing.md,
    },
    actionBtn: {
      minHeight: touchTarget.min,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: spacing.md,
    },
    actionTextPrimary: {
      ...typography.body,
      fontFamily: fonts.bodySemiBold,
      color: colors.pillActiveText,
    },
    actionText: {
      ...typography.body,
      fontFamily: fonts.bodySemiBold,
      color: colors.textPrimary,
    },
    proBadge: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: spacing.sm,
      paddingHorizontal: spacing.sm,
      borderRadius: radii.lg,
      backgroundColor: colors.accentSoft,
    },
    proMark: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.surface,
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 1,
      borderColor: colors.border,
    },
    proMarkText: {
      fontFamily: fonts.bodyBold,
      fontSize: 18,
      color: colors.accent,
      marginTop: -1,
    },
    proBadgeText: {
      gap: 2,
      flex: 1,
    },
    proBadgeName: {
      ...typography.body,
      fontFamily: fonts.bodyBold,
      color: colors.textPrimary,
    },
    proBadgeSub: {
      ...typography.badge,
      color: colors.textSecondary,
    },
    legalFooter: {
      marginTop: spacing.sm,
      paddingHorizontal: spacing.xs,
      gap: spacing.sm,
      alignItems: "center",
    },
    legalMicro: {
      ...typography.badge,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 18,
    },
    legalLink: {
      color: colors.accent,
      textDecorationLine: "underline",
    },
    supportRow: { paddingVertical: 2 },
    footerInput: {
      ...typography.body,
      color: colors.textPrimary,
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: radii.lg,
      backgroundColor: colors.background,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      minHeight: 72,
      textAlignVertical: "top",
    },
    footerCancelBtn: {
      alignSelf: "flex-start",
      paddingVertical: spacing.xs,
      minHeight: touchTarget.min,
      justifyContent: "center",
    },
    footerCancelText: {
      ...typography.body,
      color: colors.textSecondary,
      fontFamily: fonts.bodySemiBold,
    },
    clearAllBtn: {
      marginTop: spacing.sm,
      minHeight: touchTarget.min,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: "rgba(168, 69, 69, 0.35)",
      backgroundColor: isDark ? "rgba(168, 69, 69, 0.12)" : "rgba(168, 69, 69, 0.06)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
    },
    clearAllText: {
      ...typography.body,
      fontFamily: fonts.bodySemiBold,
      color: colors.destructive,
    },

    navRowPad: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      gap: spacing.md,
      minHeight: touchTarget.min + 4,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
    },
    innerDividerFlush: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: colors.border,
      marginHorizontal: spacing.md,
    },
    toneGrid: {
      flexDirection: "row",
      flexWrap: "wrap",
      gap: spacing.sm,
    },
    toneChip: {
      flexBasis: "47%",
      flexGrow: 1,
      minHeight: 42,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: spacing.md,
    },
    toneChipActive: {
      borderColor: colors.accent,
      backgroundColor: colors.accentSoft,
    },
    toneChipText: {
      ...typography.body,
      fontFamily: fonts.bodySemiBold,
      color: colors.textSecondary,
    },
    toneChipTextActive: {
      color: colors.accent,
    },
    sheetRoot: {
      flex: 1,
      justifyContent: "flex-end",
    },
    sheetBackdrop: {
      ...StyleSheet.absoluteFillObject,
      backgroundColor: "rgba(0,0,0,0.42)",
    },
    sheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: radii.xl + 4,
      borderTopRightRadius: radii.xl + 4,
      paddingHorizontal: spacing.lg,
      paddingTop: spacing.sm,
      gap: spacing.md,
      borderWidth: 1,
      borderBottomWidth: 0,
      borderColor: colors.border,
    },
    sheetHandle: {
      alignSelf: "center",
      width: 40,
      height: 4,
      borderRadius: 2,
      backgroundColor: colors.border,
      marginBottom: spacing.xs,
    },
    sheetTitle: {
      ...typography.body,
      fontFamily: fonts.bodyBold,
      fontSize: 18,
      color: colors.textPrimary,
      textAlign: "center",
    },
    sheetList: {
      borderRadius: radii.xl,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      overflow: "hidden",
    },
    sheetRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.md,
      minHeight: touchTarget.min + 4,
    },
    sheetRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    sheetRowActive: {
      backgroundColor: colors.accentSoft,
    },
    sheetRowText: {
      ...typography.body,
      fontFamily: fonts.bodySemiBold,
      color: colors.textPrimary,
      flex: 1,
    },
    sheetRowTextActive: {
      color: colors.accent,
    },
    sheetCheckSpacer: {
      width: 20,
      height: 20,
    },
    sheetCancel: {
      minHeight: touchTarget.min,
      borderRadius: radii.pill,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      alignItems: "center",
      justifyContent: "center",
    },
    sheetCancelText: {
      ...typography.body,
      fontFamily: fonts.bodySemiBold,
      color: colors.textSecondary,
    },
    pressed: { opacity: 0.86 },
  });
}
