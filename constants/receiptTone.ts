import type { NudgeTone } from "./messages";
import { radii } from "./theme";

/** Copy pack that rides with the selected vibe. */
export type ReceiptTonePack = {
  badge: string;
  tagline: string;
  dateFlavor: string;
  billLabel: string;
  tipLabel: (tipPctPretty: string) => string;
  totalLabel: string;
  eachTitle: string;
  splitCaption: (people: number) => string;
  /** Social caption on the card (amount filled). Not a “you owe me” line. */
  dropLine: (amountFormatted: string) => string;
};

/** Visual identity per vibe: shareable social object, not a bank slip. */
export type ReceiptVibeLayout = "playful" | "calm" | "noted" | "formal";

export type ReceiptVibeVisual = {
  layout: ReceiptVibeLayout;
  background: string;
  text: string;
  muted: string;
  accent: string;
  accentSoft: string;
  surface: string;
  divider: string;
  shareBg: string;
  shareText: string;
  badgeBg: string;
  badgeText: string;
  accentBarHeight: number;
  titleSize: number;
  shareAmountSize: number;
  radius: number;
  headerAlign: "center" | "flex-start";
  brandTracking: number;
  badgeRotate: string;
  showWatermark: boolean;
};

export function getReceiptVibeVisual(tone: NudgeTone, isDark: boolean): ReceiptVibeVisual {
  switch (tone) {
    case "funny":
      return {
        layout: "playful",
        background: isDark ? "#1A1410" : "#FFF4EA",
        text: isDark ? "#FFF0E6" : "#1C120E",
        muted: isDark ? "#C4A090" : "#8A6A5A",
        accent: "#E24B3B",
        accentSoft: isDark ? "rgba(226, 75, 59, 0.22)" : "rgba(226, 75, 59, 0.12)",
        surface: isDark ? "#241C16" : "#FFE8D6",
        divider: isDark ? "rgba(255,240,230,0.12)" : "rgba(28,18,14,0.1)",
        shareBg: isDark ? "#2A1814" : "#FFDCC8",
        shareText: "#E24B3B",
        badgeBg: isDark ? "rgba(226, 75, 59, 0.28)" : "#E24B3B",
        badgeText: isDark ? "#FFB4A8" : "#FFFFFF",
        accentBarHeight: 7,
        titleSize: 24,
        shareAmountSize: 40,
        radius: radii.xl,
        headerAlign: "center",
        brandTracking: 3.2,
        badgeRotate: "-6deg",
        showWatermark: false,
      };
    case "casual":
      return {
        layout: "calm",
        background: isDark ? "#121516" : "#F5F7F6",
        text: isDark ? "#E8EEEC" : "#1A2422",
        muted: isDark ? "#8FA09A" : "#6B7C76",
        accent: "#3D7A6F",
        accentSoft: isDark ? "rgba(61, 122, 111, 0.22)" : "rgba(61, 122, 111, 0.12)",
        surface: isDark ? "#1A2120" : "#E8EFEC",
        divider: isDark ? "rgba(232,238,236,0.1)" : "rgba(26,36,34,0.08)",
        shareBg: isDark ? "#1C2926" : "#DCEAE5",
        shareText: isDark ? "#7EB8AA" : "#2F5F56",
        badgeBg: isDark ? "rgba(61, 122, 111, 0.24)" : "rgba(61, 122, 111, 0.14)",
        badgeText: isDark ? "#9FD0C4" : "#2F5F56",
        accentBarHeight: 3,
        titleSize: 20,
        shareAmountSize: 34,
        radius: 26,
        headerAlign: "center",
        brandTracking: 1.8,
        badgeRotate: "0deg",
        showWatermark: false,
      };
    case "passiveAggressive":
      return {
        layout: "noted",
        background: isDark ? "#161318" : "#F6F1F4",
        text: isDark ? "#F2EAEF" : "#2A1E24",
        muted: isDark ? "#A8929C" : "#7A6570",
        accent: "#A65D6E",
        accentSoft: isDark ? "rgba(166, 93, 110, 0.22)" : "rgba(166, 93, 110, 0.12)",
        surface: isDark ? "#1E191E" : "#EDE4EA",
        divider: isDark ? "rgba(242,234,239,0.1)" : "rgba(42,30,36,0.09)",
        shareBg: isDark ? "#24181E" : "#E8D8E0",
        shareText: isDark ? "#D4A0AC" : "#8A4554",
        badgeBg: isDark ? "rgba(166, 93, 110, 0.26)" : "rgba(166, 93, 110, 0.14)",
        badgeText: isDark ? "#E0B0BA" : "#8A4554",
        accentBarHeight: 2,
        titleSize: 21,
        shareAmountSize: 36,
        radius: radii.lg,
        headerAlign: "center",
        brandTracking: 3.8,
        badgeRotate: "8deg",
        showWatermark: true,
      };
    case "serious":
    default:
      return {
        layout: "formal",
        background: isDark ? "#101214" : "#FFFEFC",
        text: isDark ? "#F1F2F4" : "#12141A",
        muted: isDark ? "#8B9099" : "#66707C",
        accent: isDark ? "#5A74B0" : "#1A3D8A",
        accentSoft: isDark ? "rgba(90, 116, 176, 0.2)" : "rgba(26, 61, 138, 0.08)",
        surface: isDark ? "#1C1F26" : "#F2F4F8",
        divider: isDark ? "rgba(255,255,255,0.08)" : "rgba(18, 20, 26, 0.08)",
        shareBg: isDark ? "rgba(90, 116, 176, 0.16)" : "rgba(26, 61, 138, 0.08)",
        shareText: isDark ? "#5A74B0" : "#1A3D8A",
        badgeBg: isDark ? "rgba(90, 116, 176, 0.22)" : "rgba(26, 61, 138, 0.1)",
        badgeText: isDark ? "#9BB0D8" : "#1A3D8A",
        accentBarHeight: 4,
        titleSize: 22,
        shareAmountSize: 32,
        radius: radii.md,
        headerAlign: "flex-start",
        brandTracking: 2.4,
        badgeRotate: "0deg",
        showWatermark: false,
      };
  }
}

export function getLocalizedReceiptTonePack(
  tone: NudgeTone,
  t: (key: string, params?: Record<string, string | number>) => string
): ReceiptTonePack {
  const prefix = {
    funny: "receiptFunny",
    casual: "receiptCasual",
    passiveAggressive: "receiptPassive",
    serious: "receiptSerious",
  }[tone];

  return {
    badge: t(`${prefix}Badge`),
    tagline: t(`${prefix}Tagline`),
    dateFlavor: t(`${prefix}DateFlavor`),
    billLabel: t(`${prefix}Bill`),
    tipLabel: (pct) => t(`${prefix}Tip`, { pct }),
    totalLabel: t(`${prefix}Total`),
    eachTitle: t(`${prefix}Each`),
    splitCaption: (n) => t(`${prefix}Split`, { n }),
    dropLine: (amount) => t(`${prefix}Drop`, { amount }),
  };
}
