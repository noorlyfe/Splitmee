import { Linking, Platform } from "react-native";

export type PaymentRailId =
  | "venmo"
  | "cashapp"
  | "paypal"
  | "revolut"
  | "wise"
  | "bank"
  | "generic";

export type PaymentProfile = {
  venmoHandle: string;
  cashAppHandle: string;
  paypalMe: string;
  revolutTag: string;
  wiseTag: string;
  bankNote: string;
};

export const EMPTY_PAYMENT_PROFILE: PaymentProfile = {
  venmoHandle: "",
  cashAppHandle: "",
  paypalMe: "",
  revolutTag: "",
  wiseTag: "",
  bankNote: "",
};

function stripAt(handle: string): string {
  return handle.trim().replace(/^@+/, "");
}

/**
 * Build deep links / https payment request URLs.
 * Opens the vendor app when installed; otherwise falls through to https.
 */
export function buildPaymentUrl(
  rail: PaymentRailId,
  profile: PaymentProfile,
  amount: number,
  note: string
): string | null {
  const amt = Number.isFinite(amount) && amount > 0 ? amount.toFixed(2) : undefined;
  const encodedNote = encodeURIComponent(note.slice(0, 80));

  switch (rail) {
    case "venmo": {
      const u = stripAt(profile.venmoHandle);
      if (!u) {
        return null;
      }
      const q = amt
        ? `txn=pay&recipients=${encodeURIComponent(u)}&amount=${amt}&note=${encodedNote}`
        : `txn=pay&recipients=${encodeURIComponent(u)}&note=${encodedNote}`;
      return Platform.OS === "ios" ? `venmo://paycharge?${q}` : `https://venmo.com/${encodeURIComponent(u)}?txn=pay${amt ? `&amount=${amt}` : ""}`;
    }
    case "cashapp": {
      const u = stripAt(profile.cashAppHandle);
      if (!u) {
        return null;
      }
      return amt ? `https://cash.app/$${encodeURIComponent(u)}/${amt}` : `https://cash.app/$${encodeURIComponent(u)}`;
    }
    case "paypal": {
      const u = stripAt(profile.paypalMe).replace(/^https?:\/\/(www\.)?paypal\.me\//i, "");
      if (!u) {
        return null;
      }
      return amt
        ? `https://paypal.me/${encodeURIComponent(u)}/${amt}`
        : `https://paypal.me/${encodeURIComponent(u)}`;
    }
    case "revolut": {
      const u = stripAt(profile.revolutTag);
      if (!u) {
        return null;
      }
      return `https://revolut.me/${encodeURIComponent(u)}`;
    }
    case "wise": {
      const u = profile.wiseTag.trim();
      if (!u) {
        return null;
      }
      if (/^https?:\/\//i.test(u)) {
        return u;
      }
      return `https://wise.com/pay/me/${encodeURIComponent(u)}`;
    }
    case "bank":
    case "generic":
      return null;
    default:
      return null;
  }
}

export async function openPaymentRail(
  rail: PaymentRailId,
  profile: PaymentProfile,
  amount: number,
  note: string
): Promise<"opened" | "copied_fallback" | "missing"> {
  const url = buildPaymentUrl(rail, profile, amount, note);
  if (!url) {
    return "missing";
  }
  try {
    const can = await Linking.canOpenURL(url);
    if (can || url.startsWith("https://")) {
      await Linking.openURL(url);
      return "opened";
    }
  } catch {
    // fall through
  }
  try {
    await Linking.openURL(url);
    return "opened";
  } catch {
    return "copied_fallback";
  }
}

export function paymentRailsForProfile(profile: PaymentProfile): PaymentRailId[] {
  const rails: PaymentRailId[] = [];
  if (stripAt(profile.venmoHandle)) {
    rails.push("venmo");
  }
  if (stripAt(profile.cashAppHandle)) {
    rails.push("cashapp");
  }
  if (stripAt(profile.paypalMe)) {
    rails.push("paypal");
  }
  if (stripAt(profile.revolutTag)) {
    rails.push("revolut");
  }
  if (profile.wiseTag.trim()) {
    rails.push("wise");
  }
  if (profile.bankNote.trim()) {
    rails.push("bank");
  }
  return rails;
}
