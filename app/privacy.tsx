import { useMemo } from "react";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { fonts, spacing, touchTarget, typography, type AppColors } from "../constants/theme";
import { useLocale } from "../hooks/useLocale";
import { useColors } from "../hooks/useColors";
import { useTheme } from "../hooks/useTheme";
import { rtlRow } from "../lib/rtl";
import { safeRouterBack } from "../lib/safeRouterBack";

const LAST_UPDATED = "August 29, 2026";

function buildPrivacyBody(storeLine: string): string {
  return `Last updated: ${LAST_UPDATED}

Splitmee ("we", "us", "our") is operated by Noorlyfe. This Privacy Policy explains how the Splitmee mobile application ("App") handles information.

WHO WE ARE
Noorlyfe operates Splitmee. For privacy questions, contact: contact@noorlyfe.com

SUMMARY
Splitmee is designed to work primarily on your device. We do not require you to create an account for core features, and we do not operate a Splitmee user profile database. Some optional features use third-party services that may process limited technical or purchase-related data, as described below.

INFORMATION STORED ON YOUR DEVICE
Depending on how you use the App, the following may be stored locally on your device (for example via on-device storage):
• Bill, tip, split, project, and receipt-related content you enter
• Names or labels you add for people you split with (this may include information about other people you choose to enter)
• Payment-related details you optionally save (such as payment handles or a short bank note) so you can reuse them in reminders
• Preferences (language, theme, currency, receipt footer, and similar settings)
• Product counters and local activity used to operate quotas, history, and in-app features
• FX rates you set or keep on device

This on-device information is used to provide the App's features to you. We do not receive a copy of that content into a Splitmee backend account system, because core features are local-first.

NOTIFICATIONS
• Local notifications: If you enable overdue or reminder alerts, the App may schedule notifications on your device. Those notifications are generated on device and may include names or amounts you already stored in the App.
• Push-related services: To support push notification delivery and related product messaging, we use OneSignal, Inc. OneSignal may process a device/push identifier and related technical data. Where the App sets tags (for example subscription status, locale, or last reminder activity), those tags may be processed by OneSignal under its own policies. You can control notification permission in your device settings.

SUBSCRIPTIONS AND PURCHASES
${storeLine}

SHARING YOU INITIATE
If you use share, export, backup, copy, or open-link features, information you choose to share (such as a receipt image, reminder text, backup file, or payment link) leaves your device and is handled by the app, service, or person you select. We do not control those third parties.

ANALYTICS
The App may keep lightweight feature counters on your device to help us understand whether flows work. These counters are stored locally and are not sent to an external advertising analytics network by Splitmee.

HOW WE DO NOT USE DATA
We do not sell personal data. We do not use your bill-splitting content for advertising networks. We do not require an account for core use.

INTERNATIONAL PROCESSING
If you use third-party services described in this policy (for example Apple, Google, RevenueCat, or OneSignal), their processing may occur in countries other than your own, subject to their terms and safeguards.

YOUR CHOICES AND RIGHTS
You can delete locally stored App data by clearing App data or uninstalling the App (depending on your device). You can revoke notification permission in system settings. You can restore or manage subscriptions through the store account you used to purchase.

Depending on your location (including the EEA/UK and similar regimes), you may have rights to access, correct, delete, restrict, or object to certain processing, and to lodge a complaint with a supervisory authority. Because much Splitmee data exists only on your device, some requests are best fulfilled by you on the device. For data held by third parties (Apple, Google, RevenueCat, OneSignal), contact them or email us at contact@noorlyfe.com and we will help where we reasonably can.

SECURITY
We take reasonable technical and organizational measures appropriate to a local-first mobile app. No method of storage or transmission is completely secure.

CHILDREN
Splitmee is not directed to children under 13, and we do not knowingly collect personal information from children under 13. If you believe a child has provided personal information through the App, contact us and we will take appropriate steps. Where local law sets a higher digital-consent age, do not use the App if you are below that age.

CHANGES
We may update this Privacy Policy from time to time. The "Last updated" date will change when we do. Continued use of the App after an update means you acknowledge the revised policy, where permitted by law.

CONTACT
contact@noorlyfe.com`;
}

export const PRIVACY_POLICY_BODY_IOS = buildPrivacyBody(
  `If you purchase or restore a subscription, purchase verification may involve the Apple App Store and RevenueCat, Inc. (our subscription provider). Apple and RevenueCat may process purchase status, a pseudonymous app user identifier, and related entitlement data as described in their policies. Payment card details for App Store purchases are handled by Apple, not by Splitmee.`
);

export const PRIVACY_POLICY_BODY_ANDROID = buildPrivacyBody(
  `If you purchase or restore a subscription, purchase verification may involve Google Play and RevenueCat, Inc. (our subscription provider). Google and RevenueCat may process purchase status, a pseudonymous app user identifier, and related entitlement data as described in their policies. Payment instrument details for Play purchases are handled by Google, not by Splitmee.`
);

/** Defaults to the current platform. */
export const PRIVACY_POLICY_BODY =
  Platform.OS === "android" ? PRIVACY_POLICY_BODY_ANDROID : PRIVACY_POLICY_BODY_IOS;

export default function PrivacyScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, isRTL } = useLocale();
  const { isDark } = useTheme();
  const body = Platform.OS === "android" ? PRIVACY_POLICY_BODY_ANDROID : PRIVACY_POLICY_BODY_IOS;

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={[styles.header, rtlRow(isRTL)]}>
        <Pressable onPress={() => safeRouterBack(router)} hitSlop={12} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Text style={styles.backText}>{t("back")}</Text>
        </Pressable>
        <Text style={styles.title}>Privacy Policy</Text>
        <View style={styles.headerSpacer} />
      </View>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xl },
        ]}
        showsVerticalScrollIndicator
      >
        <Text style={styles.body}>{body}</Text>
      </ScrollView>
    </View>
  );
}

function createStyles(colors: AppColors) {
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: spacing.lg,
      minHeight: touchTarget.min,
    },
    back: { minWidth: 56, minHeight: 44, justifyContent: "center" },
    backText: { ...typography.body, fontFamily: fonts.bodySemiBold, color: colors.accent },
    title: {
      ...typography.body,
      fontFamily: fonts.bodyBold,
      color: colors.textPrimary,
      flex: 1,
      textAlign: "center",
    },
    headerSpacer: { minWidth: 56 },
    scroll: { flex: 1 },
    content: { paddingHorizontal: spacing.lg, paddingTop: spacing.md },
    body: {
      ...typography.badge,
      color: colors.textPrimary,
    },
    pressed: { opacity: 0.86 },
  });
}
