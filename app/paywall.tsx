import { useCallback, useEffect, useState, useMemo, type ReactNode } from "react";
import {
  ActivityIndicator,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import Purchases, {
  PACKAGE_TYPE,
  PURCHASES_ERROR_CODE,
  type PurchasesOfferings,
  type PurchasesPackage,
} from "react-native-purchases";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";

import { AppAlert } from "../components/AppAlert";
import { getAppStoreUrl } from "../constants/storeLinks";
import { fonts, radii, spacing, touchTarget, typography, type AppColors } from "../constants/theme";
import { isRevenueCatApiKeySet, REVENUECAT_UNLIMITED_ENTITLEMENT_ID } from "../constants/purchases";
import { useLocale } from "../hooks/useLocale";
import { useColors } from "../hooks/useColors";
import { useTheme } from "../hooks/useTheme";
import { formatPaywallPriceLabel } from "../lib/paywallPriceDisplay";
import { rtlRow } from "../lib/rtl";
import { useProStatus } from "../hooks/useProStatus";
import { trackEvent } from "../lib/analytics";
import { safeRouterBack } from "../lib/safeRouterBack";
import { PRIVACY_POLICY_BODY_ANDROID, PRIVACY_POLICY_BODY_IOS } from "./privacy";
import { TERMS_BODY_ANDROID } from "./terms";

const APPLE_EULA_URL = "https://www.apple.com/legal/internet-services/itunes/dev/stdeula/";

const PAYWALL_FEATURE_KEYS = [
  "paywallFeatureUnlimitedNudges",
  "paywallFeatureWaitingGame",
  "paywallFeatureGroups",
  "paywallFeaturePowerTools",
  "paywallFeatureStoryDrops",
] as const;

function pickSubscriptionPackage(offerings: PurchasesOfferings): PurchasesPackage | null {
  const current = offerings.current;
  if (!current) {
    return null;
  }
  if (current.monthly) {
    return current.monthly;
  }
  const monthly = current.availablePackages.find((p) => p.packageType === PACKAGE_TYPE.MONTHLY);
  if (monthly) {
    return monthly;
  }
  if (current.availablePackages.length > 0) {
    return current.availablePackages[0];
  }
  return null;
}

type PaywallStyles = ReturnType<typeof createStyles>;

function PaywallHero({
  styles,
  title,
  subtitle,
  badge,
}: {
  styles: PaywallStyles;
  title: string;
  subtitle: string;
  badge: string;
}) {
  return (
    <Animated.View entering={FadeInDown.duration(480).springify().damping(18)} style={styles.heroSection}>
      <View style={styles.markDisk}>
        <Text style={styles.markGlyph}>∞</Text>
      </View>
      <Text style={styles.heroEyebrow}>{badge}</Text>
      <Text style={styles.heroTitle}>{title}</Text>
      <Text style={styles.heroSubtitle}>{subtitle}</Text>
    </Animated.View>
  );
}

function PaywallFeatureList({
  styles,
  labels,
  isRTL,
  accent,
}: {
  styles: PaywallStyles;
  labels: string[];
  isRTL: boolean;
  accent: string;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(80).duration(480).springify().damping(18)}
      style={styles.featureList}
    >
      {labels.map((label, index) => (
        <View
          key={label}
          style={[
            styles.featureRow,
            rtlRow(isRTL),
            index < labels.length - 1 ? styles.featureRowBorder : null,
          ]}
        >
          <View style={styles.featureIcon}>
            <Ionicons name="checkmark" size={14} color={accent} />
          </View>
          <Text style={[styles.featureText, isRTL ? styles.featureTextRtl : null]}>{label}</Text>
        </View>
      ))}
    </Animated.View>
  );
}

function PaywallPriceBlock({
  styles,
  subscriptionLabel,
  price,
  hasTrial,
  trialLabel,
}: {
  styles: PaywallStyles;
  subscriptionLabel: string;
  price: string;
  hasTrial: boolean;
  trialLabel: string;
}) {
  return (
    <Animated.View
      entering={FadeInDown.delay(140).duration(480).springify().damping(18)}
      style={styles.priceCard}
    >
      <View style={styles.priceCardTop}>
        <View style={styles.priceCardCopy}>
          <Text style={styles.subscriptionLength}>{subscriptionLabel}</Text>
          {hasTrial ? <Text style={styles.trialChip}>{trialLabel}</Text> : null}
        </View>
        <View style={styles.priceSelectedDot} />
      </View>
      <Text style={styles.price}>{price}</Text>
    </Animated.View>
  );
}

function PaywallLegalFooter({
  styles,
  isRTL,
  legalText,
  onPrivacy,
  onTerms,
  privacyLabel,
  termsLabel,
}: {
  styles: PaywallStyles;
  isRTL: boolean;
  legalText: string;
  onPrivacy: () => void;
  onTerms: () => void;
  privacyLabel: string;
  termsLabel: string;
}) {
  return (
    <View style={styles.legalWrap}>
      <Text style={styles.paywallLegal}>{legalText}</Text>
      <View style={[styles.paywallLegalLinksRow, rtlRow(isRTL)]}>
        <Pressable onPress={onPrivacy} hitSlop={8}>
          <Text style={styles.paywallLegalLink}>{privacyLabel}</Text>
        </Pressable>
        <Pressable onPress={onTerms} hitSlop={8}>
          <Text style={styles.paywallLegalLink}>{termsLabel}</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function PaywallScreen() {
  const colors = useColors();
  const { isDark } = useTheme();
  const styles = useMemo(() => createStyles(colors, isDark), [colors, isDark]);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, locale, isRTL } = useLocale();
  const { refresh } = useProStatus();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<"purchase" | "restore" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [packageToBuy, setPackageToBuy] = useState<PurchasesPackage | null>(null);
  const priceLabel = useMemo(() => {
    const storePrice = packageToBuy?.product?.priceString?.trim();
    if (storePrice) {
      return `${storePrice}${t("perMonth")}`;
    }
    return formatPaywallPriceLabel(locale, t("perMonth"));
  }, [locale, packageToBuy, t]);
  const hasTrial = useMemo(() => {
    const introPrice = packageToBuy?.product?.introPrice;
    return introPrice?.price === 0;
  }, [packageToBuy]);
  const [legalModal, setLegalModal] = useState<"privacy" | "terms" | null>(null);
  const [showPurchaseSuccessAlert, setShowPurchaseSuccessAlert] = useState(false);
  const [showPurchaseFailedAlert, setShowPurchaseFailedAlert] = useState(false);
  const [showRestoreSuccessAlert, setShowRestoreSuccessAlert] = useState(false);
  const [showRestoreFailedAlert, setShowRestoreFailedAlert] = useState(false);
  const [restoreFailedMessage, setRestoreFailedMessage] = useState("");

  const featureLabels = useMemo(
    () => PAYWALL_FEATURE_KEYS.map((key) => t(key)),
    [t]
  );

  const close = useCallback(() => {
    safeRouterBack(router);
  }, [router]);

  const loadOffering = useCallback(async () => {
    if (Platform.OS === "web") {
      setLoading(false);
      return;
    }
    if (!isRevenueCatApiKeySet()) {
      setError(t("subscriptionNotConfigured"));
      setLoading(false);
      void trackEvent("paywall_fallback");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const offerings = await Purchases.getOfferings();
      const pkg = pickSubscriptionPackage(offerings);
      if (!pkg) {
        setError(t("noOfferingFound"));
        setPackageToBuy(null);
        void trackEvent("paywall_fallback");
        return;
      }
      setPackageToBuy(pkg);
    } catch {
      setError(t("couldNotLoadOfferings"));
      void trackEvent("paywall_fallback");
    } finally {
      setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void trackEvent("paywall_opened");
    void loadOffering();
  }, [loadOffering]);

  const onSubscribe = useCallback(async () => {
    if (Platform.OS === "web" || !packageToBuy) {
      return;
    }
    setBusy("purchase");
    try {
      await Purchases.purchasePackage(packageToBuy);
      await refresh();
      void trackEvent("paywall_purchase");
      setShowPurchaseSuccessAlert(true);
    } catch (e: unknown) {
      const code = e && typeof e === "object" && "code" in e ? (e as { code?: string }).code : undefined;
      if (code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        // User cancelled, stay on screen
      } else {
        setShowPurchaseFailedAlert(true);
      }
    } finally {
      setBusy(null);
    }
  }, [packageToBuy, refresh]);

  const onRestore = useCallback(async () => {
    if (Platform.OS === "web") {
      return;
    }
    setBusy("restore");
    try {
      const info = await Purchases.restorePurchases();
      await refresh();
      void trackEvent("paywall_restore");
      const isNowPro =
        typeof info.entitlements?.active?.[REVENUECAT_UNLIMITED_ENTITLEMENT_ID] !== "undefined";
      if (isNowPro) {
        setShowRestoreSuccessAlert(true);
      } else {
        const storeLabel = Platform.OS === "android" ? t("googleAccount") : t("appleId");
        setRestoreFailedMessage(t("noPurchasesForAccount", { account: storeLabel }));
        setShowRestoreFailedAlert(true);
      }
    } catch {
      const storeLabel = Platform.OS === "android" ? t("googleAccount") : t("appleId");
      setRestoreFailedMessage(t("noPurchasesForAccount", { account: storeLabel }));
      setShowRestoreFailedAlert(true);
    } finally {
      setBusy(null);
    }
  }, [refresh, t]);

  const renderPurchaseActions = (): ReactNode => {
    if (loading) {
      return (
        <View style={styles.blockCompact}>
          <ActivityIndicator size="large" color={colors.accent} />
          <Text style={styles.hint}>{t("loading")}</Text>
        </View>
      );
    }
    if (error) {
      return (
        <View style={styles.blockCompact}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable
            onPress={() => void loadOffering()}
            style={({ pressed }) => [styles.linkBtn, pressed && styles.pressed]}
          >
            <Text style={styles.linkBtnText}>{t("tryAgain")}</Text>
          </Pressable>
        </View>
      );
    }
    if (!packageToBuy) {
      return null;
    }
    return (
      <Animated.View entering={FadeIn.delay(200).duration(400)} style={styles.ctaStack}>
        {hasTrial ? <Text style={styles.freeTrialFinePrint}>{t("freeTrialFinePrint")}</Text> : null}
        <Pressable
          onPress={() => void onSubscribe()}
          disabled={busy !== null}
          style={({ pressed }) => [styles.ctaFull, pressed && styles.ctaPressed, busy !== null && styles.disabled]}
        >
          {busy === "purchase" ? (
            <ActivityIndicator color={colors.pillActiveText} />
          ) : (
            <Text style={styles.ctaFullText}>{t("unlockNudgrr")}</Text>
          )}
        </Pressable>
        <Pressable
          onPress={() => void onRestore()}
          disabled={busy !== null}
          style={({ pressed }) => [styles.restoreLink, pressed && styles.pressed]}
        >
          {busy === "restore" ? (
            <ActivityIndicator color={colors.textSecondary} />
          ) : (
            <Text style={styles.restoreLinkText}>{t("restorePurchases")}</Text>
          )}
        </Pressable>
      </Animated.View>
    );
  };

  const closeControl = (
    <Pressable
      onPress={close}
      accessibilityRole="button"
      accessibilityLabel={t("close")}
      style={[
        styles.closeButton,
        { top: insets.top + spacing.xs },
        isRTL ? { left: spacing.lg, right: undefined } : { right: spacing.lg, left: undefined },
      ]}
      hitSlop={8}
    >
      <View style={styles.closeDisk}>
        <Ionicons name="close" size={18} color={colors.textPrimary} />
      </View>
    </Pressable>
  );

  const heroAndFeatures = (
    <>
      <PaywallHero
        styles={styles}
        title={t("nudgrrUnlimited")}
        subtitle={t("getTheFullExperience")}
        badge={t("paywallHeroBadge")}
      />
      <PaywallFeatureList styles={styles} labels={featureLabels} isRTL={isRTL} accent={colors.accent} />
      <Text style={styles.brandFootnote}>{t("paywallFeatureRemoveBranding")}</Text>
    </>
  );

  if (Platform.OS === "web") {
    const openAppStore = () => {
      void Linking.openURL(getAppStoreUrl());
      void trackEvent("paywall_web_store_link");
    };

    return (
      <View style={[styles.screen, { paddingTop: insets.top }]}>
        <StatusBar style={isDark ? "light" : "dark"} />
        {closeControl}
        <ScrollView
          style={styles.flex}
          contentContainerStyle={[
            styles.scroll,
            styles.scrollContent,
            { paddingBottom: insets.bottom + spacing.xl },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.contentBlock}>
            {heroAndFeatures}
            <Pressable
              onPress={openAppStore}
              style={({ pressed }) => [styles.ctaFull, pressed && styles.ctaPressed]}
              accessibilityRole="link"
              accessibilityLabel={t("unlockNudgrr")}
            >
              <Text style={styles.ctaFullText}>{t("unlockNudgrr")}</Text>
            </Pressable>
            <Text style={styles.paywallLegal}>{t("subscriptionAvailableMobile")}</Text>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      {closeControl}
      <ScrollView
        style={styles.flex}
        contentContainerStyle={[
          styles.scroll,
          styles.scrollContent,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.contentBlock}>
          {heroAndFeatures}
          {!loading && !error && packageToBuy ? (
            <PaywallPriceBlock
              styles={styles}
              subscriptionLabel={t("oneMonthSubscription")}
              price={priceLabel}
              hasTrial={hasTrial}
              trialLabel={t("freeTrialLabel")}
            />
          ) : null}
          {renderPurchaseActions()}
          <PaywallLegalFooter
            styles={styles}
            isRTL={isRTL}
            legalText={
              Platform.OS === "ios" ? t("paywallSubscriptionLegalIos") : t("paywallSubscriptionLegalAndroid")
            }
            onPrivacy={() => setLegalModal("privacy")}
            onTerms={() => setLegalModal("terms")}
            privacyLabel={t("privacyPolicy")}
            termsLabel={t("termsOfUse")}
          />
        </View>
      </ScrollView>
      <Modal
        visible={legalModal !== null}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setLegalModal(null)}
      >
        <View style={[styles.legalModalScreen, { paddingTop: insets.top }]}>
          <StatusBar style={isDark ? "light" : "dark"} />
          <View style={[styles.legalModalHeader, rtlRow(isRTL)]}>
            <Pressable
              onPress={() => setLegalModal(null)}
              hitSlop={12}
              style={({ pressed }) => [styles.legalModalBack, pressed && styles.legalModalPressed]}
            >
              <Text style={styles.legalModalBackText}>{t("close")}</Text>
            </Pressable>
            <Text style={styles.legalModalTitle}>
              {legalModal === "terms" ? t("termsOfUse") : t("privacyPolicy")}
            </Text>
            <View style={styles.legalModalHeaderSpacer} />
          </View>
          <ScrollView
            style={styles.flex}
            contentContainerStyle={[
              styles.legalModalContent,
              { paddingBottom: insets.bottom + spacing.xl },
            ]}
            showsVerticalScrollIndicator
          >
            {legalModal === "terms" ? (
              Platform.OS === "android" ? (
                <Text style={styles.legalModalBody}>{TERMS_BODY_ANDROID}</Text>
              ) : (
                <Text style={styles.legalModalBody}>
                  {t("paywallTermsEulaIntro")}
                  <Text
                    style={styles.legalModalBodyLink}
                    onPress={() => void Linking.openURL(APPLE_EULA_URL)}
                  >
                    {APPLE_EULA_URL}
                  </Text>
                </Text>
              )
            ) : (
              <Text style={styles.legalModalBody}>
                {Platform.OS === "android" ? PRIVACY_POLICY_BODY_ANDROID : PRIVACY_POLICY_BODY_IOS}
              </Text>
            )}
          </ScrollView>
        </View>
      </Modal>
      <AppAlert
        visible={showPurchaseSuccessAlert}
        title={t("youreIn")}
        message={t("unlimitedActiveEnjoy")}
        onRequestClose={() => setShowPurchaseSuccessAlert(false)}
        buttons={[
          {
            text: t("ok"),
            onPress: () => {
              setShowPurchaseSuccessAlert(false);
              safeRouterBack(router);
            },
          },
        ]}
      />
      <AppAlert
        visible={showPurchaseFailedAlert}
        title={t("somethingWentWrong")}
        message={t("purchaseFailedBody")}
        onRequestClose={() => setShowPurchaseFailedAlert(false)}
        buttons={[{ text: t("ok"), onPress: () => setShowPurchaseFailedAlert(false) }]}
      />
      <AppAlert
        visible={showRestoreSuccessAlert}
        title={t("restored")}
        message={t("unlimitedBackOn")}
        onRequestClose={() => setShowRestoreSuccessAlert(false)}
        buttons={[
          {
            text: t("ok"),
            onPress: () => {
              setShowRestoreSuccessAlert(false);
              safeRouterBack(router);
            },
          },
        ]}
      />
      <AppAlert
        visible={showRestoreFailedAlert}
        title={t("couldntRestore")}
        message={restoreFailedMessage}
        onRequestClose={() => setShowRestoreFailedAlert(false)}
        buttons={[{ text: t("ok"), onPress: () => setShowRestoreFailedAlert(false) }]}
      />
    </View>
  );
}

function createStyles(colors: AppColors, isDark: boolean) {
  return StyleSheet.create({
    screen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    flex: {
      flex: 1,
    },
    scroll: {
      paddingHorizontal: spacing.lg,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: "center",
      paddingTop: spacing.xxl + spacing.md,
    },
    contentBlock: {
      width: "100%",
      maxWidth: 400,
      alignSelf: "center",
      gap: spacing.lg,
    },
    closeButton: {
      position: "absolute",
      zIndex: 2,
    },
    closeDisk: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(22,24,28,0.06)",
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
    },
    heroSection: {
      alignItems: "center",
      gap: spacing.sm,
      paddingTop: spacing.sm,
    },
    markDisk: {
      width: 64,
      height: 64,
      borderRadius: 22,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: colors.accent,
      marginBottom: spacing.xs,
      ...Platform.select({
        ios: {
          shadowColor: colors.accent,
          shadowOpacity: isDark ? 0.35 : 0.28,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
        },
        android: { elevation: 6 },
        default: {},
      }),
    },
    markGlyph: {
      fontFamily: fonts.bodyBold,
      fontSize: 28,
      lineHeight: 32,
      color: colors.pillActiveText,
      marginTop: -2,
    },
    heroEyebrow: {
      ...typography.label,
      color: colors.accent,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      fontSize: 11,
    },
    heroTitle: {
      fontFamily: fonts.bodyBold,
      fontSize: 36,
      lineHeight: 40,
      letterSpacing: -1.1,
      color: colors.textPrimary,
      textAlign: "center",
      paddingHorizontal: spacing.sm,
    },
    heroSubtitle: {
      ...typography.body,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 23,
      paddingHorizontal: spacing.md,
      maxWidth: 320,
    },
    featureList: {
      width: "100%",
      borderRadius: radii.xl,
      backgroundColor: isDark ? "rgba(255,255,255,0.04)" : colors.surface,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.border,
      paddingHorizontal: spacing.md,
      overflow: "hidden",
    },
    featureRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: spacing.md,
      paddingVertical: 14,
    },
    featureRowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    featureIcon: {
      width: 28,
      height: 28,
      borderRadius: 10,
      backgroundColor: colors.accentSoft,
      alignItems: "center",
      justifyContent: "center",
    },
    featureText: {
      ...typography.body,
      flex: 1,
      fontFamily: fonts.bodySemiBold,
      color: colors.textPrimary,
      lineHeight: 21,
      fontSize: 15,
      textAlign: "left",
    },
    featureTextRtl: {
      textAlign: "right",
    },
    brandFootnote: {
      ...typography.badge,
      color: colors.textSecondary,
      textAlign: "center",
      lineHeight: 18,
      paddingHorizontal: spacing.md,
      marginTop: -spacing.sm,
      opacity: 0.9,
    },
    priceCard: {
      width: "100%",
      borderRadius: radii.xl,
      paddingVertical: spacing.lg,
      paddingHorizontal: spacing.lg,
      backgroundColor: colors.surface,
      borderWidth: 1.5,
      borderColor: colors.accent,
      gap: spacing.sm,
      ...Platform.select({
        ios: {
          shadowColor: colors.accent,
          shadowOpacity: isDark ? 0.22 : 0.12,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 8 },
        },
        android: { elevation: 3 },
        default: {},
      }),
    },
    priceCardTop: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      gap: spacing.md,
    },
    priceCardCopy: {
      flex: 1,
      gap: 8,
    },
    subscriptionLength: {
      ...typography.label,
      color: colors.textSecondary,
      letterSpacing: 0.4,
      textTransform: "uppercase",
      fontSize: 11,
    },
    trialChip: {
      alignSelf: "flex-start",
      ...typography.badge,
      fontFamily: fonts.bodySemiBold,
      color: colors.accent,
      backgroundColor: colors.accentSoft,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: radii.pill,
      overflow: "hidden",
    },
    priceSelectedDot: {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 6,
      borderColor: colors.accent,
      backgroundColor: colors.surface,
      marginTop: 2,
    },
    price: {
      fontFamily: fonts.bodyBold,
      fontSize: 34,
      lineHeight: 40,
      letterSpacing: -0.8,
      color: colors.textPrimary,
    },
    ctaStack: {
      width: "100%",
      gap: spacing.sm,
    },
    freeTrialFinePrint: {
      ...typography.badge,
      fontSize: 11,
      lineHeight: 15,
      color: colors.textSecondary,
      textAlign: "center",
      opacity: 0.92,
      paddingHorizontal: spacing.sm,
    },
    blockCompact: {
      gap: spacing.md,
      alignItems: "center",
      marginVertical: spacing.sm,
    },
    hint: {
      ...typography.badge,
      color: colors.textSecondary,
      textAlign: "center",
    },
    errorText: {
      ...typography.body,
      color: colors.textPrimary,
      textAlign: "center",
    },
    linkBtn: {
      paddingVertical: spacing.sm,
    },
    linkBtnText: {
      ...typography.body,
      color: colors.accent,
      fontFamily: fonts.bodySemiBold,
    },
    ctaFull: {
      width: "100%",
      minHeight: 54,
      borderRadius: radii.pill,
      backgroundColor: colors.accent,
      alignItems: "center",
      justifyContent: "center",
      ...Platform.select({
        ios: {
          shadowColor: colors.accent,
          shadowOpacity: isDark ? 0.4 : 0.3,
          shadowRadius: 14,
          shadowOffset: { width: 0, height: 8 },
        },
        android: { elevation: 4 },
        default: {},
      }),
    },
    ctaPressed: {
      opacity: 0.92,
      transform: [{ scale: 0.985 }],
    },
    ctaFullText: {
      ...typography.body,
      fontFamily: fonts.bodyBold,
      color: colors.pillActiveText,
      fontSize: 16,
      letterSpacing: 0.15,
    },
    restoreLink: {
      alignSelf: "center",
      paddingVertical: spacing.sm,
      minHeight: 44,
      justifyContent: "center",
    },
    restoreLinkText: {
      ...typography.badge,
      color: colors.textSecondary,
      fontFamily: fonts.bodySemiBold,
    },
    legalWrap: {
      gap: spacing.sm,
      marginTop: spacing.xs,
    },
    paywallLegal: {
      ...typography.badge,
      color: colors.textSecondary,
      textAlign: "center",
      opacity: 0.8,
      lineHeight: 16,
      paddingHorizontal: spacing.sm,
    },
    paywallLegalLinksRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: spacing.md,
      paddingHorizontal: spacing.sm,
    },
    paywallLegalLink: {
      ...typography.badge,
      color: colors.accent,
      fontFamily: fonts.bodySemiBold,
    },
    legalModalScreen: {
      flex: 1,
      backgroundColor: colors.background,
    },
    legalModalHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      minHeight: touchTarget.min,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    legalModalBack: { minWidth: 56, minHeight: 44, justifyContent: "center" },
    legalModalBackText: { ...typography.body, color: colors.accent, fontFamily: fonts.bodyBold },
    legalModalTitle: {
      ...typography.body,
      fontFamily: fonts.bodyBold,
      color: colors.textPrimary,
      flex: 1,
      textAlign: "center",
    },
    legalModalHeaderSpacer: { minWidth: 56 },
    legalModalContent: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
    legalModalBody: {
      ...typography.badge,
      color: colors.textPrimary,
    },
    legalModalBodyLink: {
      ...typography.badge,
      color: colors.accent,
      textDecorationLine: "underline",
    },
    legalModalPressed: { opacity: 0.86 },
    pressed: {
      opacity: 0.88,
    },
    disabled: {
      opacity: 0.65,
    },
  });
}
