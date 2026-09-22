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

function buildTermsBody(opts: {
  storeName: string;
  billingAccount: string;
  cancelPath: string;
  platformDisclaimer: string;
  storePolicies: string;
}): string {
  return `Last updated: ${LAST_UPDATED}

These Terms of Use ("Terms") govern your use of the Splitmee mobile application ("App") provided by Noorlyfe ("we", "us", "our"). By downloading, accessing, or using the App, you agree to these Terms. If you do not agree, do not use the App.

OPERATOR AND CONTACT
Splitmee is operated by Noorlyfe.
Contact: contact@noorlyfe.com

ELIGIBILITY
You must be able to form a binding contract under the laws of your jurisdiction to use the App. The App is not directed to children under 13. Where a higher age is required by local law for digital services or contracts, you must meet that age. By using the App, you represent that you meet these requirements.

LICENSE
Subject to these Terms, we grant you a limited, personal, non-exclusive, non-transferable, revocable license to install and use the App on devices you own or control for your personal, non-commercial use. We and our licensors retain all rights, title, and interest in the App. You may not copy, modify, distribute, reverse engineer, or create derivative works of the App except as allowed by mandatory law.

THE APP
Splitmee helps you estimate bill splits and tips; organize people, projects, and waiting reminders; create receipt-style drops and messages you may copy or share; and use related productivity tools in the App. The App is provided for convenience and general information only. It is not tax, legal, accounting, or financial advice. You are solely responsible for verifying all calculations, amounts, names, and shared content before relying on them or sending them to others.

YOUR CONTENT AND RESPONSIBILITY
You are responsible for information you enter in the App, including names of other people, payment details, and messages. Do not enter information you are not allowed to use. If you share content outside the App, you are responsible for that sharing and for complying with applicable law and the rules of any third-party service you use.

ACCEPTABLE USE
You agree not to misuse the App, attempt to disrupt or circumvent its security or limits, infringe others' rights, or use the App in violation of law. We may suspend or terminate access to the App where permitted by law, including for misuse or risk to users or our systems.

SUBSCRIPTIONS AND PURCHASES
Some features may require a paid subscription ("Splitmee Unlimited" or similar offering as shown in the App).

• Billing: If you purchase a subscription, payment is charged to your ${opts.billingAccount} through ${opts.storeName}. Splitmee does not collect your full payment card details.
• Price and period: The subscription length, price, and any free trial are displayed in the App / store purchase sheet at the time of purchase.
• Auto-renewal: Unless you cancel at least 24 hours before the end of the current period (or trial, if applicable), the subscription renews automatically and you will be charged for the renewal.
• Cancellation: You can manage or cancel in ${opts.cancelPath}. Deleting the App does not automatically cancel a subscription.
• Changes: We may change subscription features over time. Material price changes are handled according to ${opts.storeName} rules and applicable law.
• Refunds: Refund requests are handled by ${opts.storeName} under their refund policies, except where mandatory consumer law requires otherwise.
• Restore: You can restore eligible purchases on a device signed into the same store account used for the original purchase.

${opts.storePolicies}

APP UPDATES
We may release updates. Continued use may require installing a supported version. If a mandatory update is required for security, functionality, or legal compliance, the App may prompt you to update before continuing.

THIRD-PARTY SERVICES
The App may rely on third parties, including:
• ${opts.storeName} for distribution and billing
• RevenueCat, Inc. for subscription entitlement verification
• OneSignal, Inc. for push notification delivery and related device messaging
• Services you choose to open or share to (for example messaging apps or payment apps)

Those services are governed by their own terms and privacy policies. We are not responsible for third-party services we do not control.

PRIVACY
Our Privacy Policy explains how information is handled in connection with the App. By using the App, you also acknowledge that policy.

DISCLAIMER
TO THE FULLEST EXTENT PERMITTED BY LAW, THE APP IS PROVIDED "AS IS" AND "AS AVAILABLE", WITHOUT WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT THE APP WILL BE UNINTERRUPTED, ERROR-FREE, OR THAT CALCULATIONS WILL MEET YOUR EXPECTATIONS.

LIMITATION OF LIABILITY
TO THE MAXIMUM EXTENT PERMITTED BY LAW, NOORLYFE AND ITS DEVELOPERS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS, DATA, OR GOODWILL, ARISING FROM YOUR USE OF OR INABILITY TO USE THE APP. OUR TOTAL LIABILITY FOR CLAIMS RELATING TO THE APP SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID US FOR THE APP SUBSCRIPTION IN THE 12 MONTHS BEFORE THE CLAIM OR (B) EUR 50, EXCEPT WHERE LIABILITY CANNOT BE LIMITED UNDER MANDATORY LAW.

PLATFORM DISCLAIMER
${opts.platformDisclaimer}

GOVERNING LAW
These Terms are governed by the laws of Denmark, without regard to conflict-of-law principles. If you are a consumer in the EU/EEA, UK, or another jurisdiction with mandatory consumer protections, nothing in these Terms limits those non-waivable rights. Courts in Denmark have non-exclusive jurisdiction, without prejudice to mandatory consumer venue rights.

CHANGES
We may update these Terms. The "Last updated" date will change when we do. Continued use after changes become effective constitutes acceptance where permitted by law. If you do not agree, stop using the App and cancel any subscription through the store.

CONTACT
contact@noorlyfe.com`;
}

export const TERMS_BODY_IOS = buildTermsBody({
  storeName: "the Apple App Store",
  billingAccount: "Apple ID",
  cancelPath: "your Apple ID account settings (Subscriptions)",
  platformDisclaimer:
    "Apple Inc. is not a party to these Terms, is not responsible for the App, and has no obligation to provide maintenance or support for the App. Apple-related purchases are also subject to Apple's terms.",
  storePolicies:
    "Apple's Standard EULA and App Store terms may also apply to your use of the App obtained from the App Store.",
});

export const TERMS_BODY_ANDROID = buildTermsBody({
  storeName: "Google Play",
  billingAccount: "Google account",
  cancelPath: "Google Play subscription settings",
  platformDisclaimer:
    "Google LLC is not a party to these Terms, is not responsible for the App, and has no obligation to provide maintenance or support for the App. Google Play purchases are also subject to Google's terms.",
  storePolicies: "Google Play terms of service may also apply to your use of the App obtained from Google Play.",
});

const TERMS_BODY = Platform.OS === "android" ? TERMS_BODY_ANDROID : TERMS_BODY_IOS;

export default function TermsScreen() {
  const colors = useColors();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { t, isRTL } = useLocale();
  const { isDark } = useTheme();

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <StatusBar style={isDark ? "light" : "dark"} />
      <View style={[styles.header, rtlRow(isRTL)]}>
        <Pressable onPress={() => safeRouterBack(router)} hitSlop={12} style={({ pressed }) => [styles.back, pressed && styles.pressed]}>
          <Text style={styles.backText}>{t("back")}</Text>
        </Pressable>
        <Text style={styles.title}>Terms of Use</Text>
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
        <Text style={styles.body}>{TERMS_BODY}</Text>
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
