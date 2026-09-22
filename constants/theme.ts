/** Light: deep ink navy. Dark: lifted steel navy: readable on charcoal, not sky-blue. */
const ACCENT_LIGHT = "#1A3D8A";
const ACCENT_DARK = "#5A74B0";

export function getColors(isDark: boolean = false) {
  const accent = isDark ? ACCENT_DARK : ACCENT_LIGHT;
  return {
    background: isDark ? "#101214" : "#F4F5F7",
    surface: isDark ? "#1A1C20" : "#FFFFFF",
    surfaceElevated: isDark ? "#22252A" : "#FFFFFF",
    accent,
    accentSoft: isDark ? "rgba(90, 116, 176, 0.22)" : "rgba(26, 61, 138, 0.11)",
    accentSecondary: isDark ? "#C9888A" : "#A85C5E",
    textPrimary: isDark ? "#F1F2F4" : "#16181C",
    textSecondary: isDark ? "#9499A3" : "#66707C",
    border: isDark ? "#2A2E35" : "#E2E5EA",
    pillActiveBg: accent,
    pillActiveText: "#FFFFFF",
    pillInactiveBg: isDark ? "#1A1C20" : "#FFFFFF",
    pillInactiveText: isDark ? "#9499A3" : "#66707C",
    shadow: isDark ? "#000000" : "#16181C",
    destructive: "#A84545",
    cardShadowOpacity: isDark ? 0.28 : 0.06,
  } as const;
}

export type AppColors = ReturnType<typeof getColors>;

export const colors = getColors(false);

/** Receipt cards: modern paper, sharp navy accent. */
export function getReceiptColors(isDark: boolean) {
  const accent = isDark ? ACCENT_DARK : ACCENT_LIGHT;
  return {
    background: isDark ? "#14161A" : "#FFFEFA",
    text: isDark ? "#F3F4F6" : "#12141A",
    accent,
    divider: isDark ? "rgba(255,255,255,0.08)" : "rgba(18, 20, 26, 0.08)",
    muted: isDark ? "#8B9099" : "#6B7280",
    surface: isDark ? "#1C1F26" : "#F4F5F8",
    accentSoft: isDark ? "rgba(90, 116, 176, 0.2)" : "rgba(26, 61, 138, 0.08)",
  };
}

// Fonts loaded in `app/_layout.tsx`.
// One family app-wide (Inter). Weight / size / italic / muted may vary.
// `mono` aliases exist so old call sites stay Inter: never a second typeface for numbers.
export const fonts = {
  body: "Inter_400Regular",
  bodySemiBold: "Inter_600SemiBold",
  bodyBold: "Inter_700Bold",
  /** @deprecated Use body — kept as Inter so numbers never switch typeface. */
  mono: "Inter_400Regular",
  /** @deprecated Use bodyBold — kept as Inter so numbers never switch typeface. */
  monoBold: "Inter_700Bold",
} as const;

/** Shared number rhythm: same face as body, tabular figures where supported. */
export const numberType = {
  fontFamily: fonts.bodyBold,
  fontVariant: ["tabular-nums"] as const,
} as const;

/** Shareable receipt (thermal paper look) */
export const receipt = {
  background: "#FAFBFC",
  text: "#16181C",
  accent: "#1A3D8A",
  divider: "rgba(22, 24, 28, 0.14)",
  branding: "rgba(22, 24, 28, 0.32)",
} as const;

export const spacing = {
  xs: 6,
  sm: 10,
  md: 16,
  lg: 22,
  xl: 28,
  xxl: 40,
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 22,
  pill: 999,
} as const;

export const typography = {
  wordmark: {
    fontFamily: fonts.bodyBold,
    fontSize: 22,
    letterSpacing: -0.4,
    fontWeight: "700" as const,
  },
  label: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 12,
    letterSpacing: 0.15,
  },
  body: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 22,
  },
  input: {
    fontFamily: fonts.bodyBold,
    fontSize: 22,
    letterSpacing: -0.5,
    fontWeight: "700" as const,
  },
  resultPrimary: {
    fontFamily: fonts.bodyBold,
    fontWeight: "700" as const,
    fontSize: 28,
    letterSpacing: -1,
    lineHeight: 34,
    fontVariant: ["tabular-nums"] as const,
  },
  resultSecondary: {
    fontFamily: fonts.bodySemiBold,
    fontSize: 20,
    letterSpacing: -0.3,
    fontVariant: ["tabular-nums"] as const,
  },
  resultTertiary: {
    fontFamily: fonts.body,
    fontSize: 15,
    letterSpacing: 0,
    fontVariant: ["tabular-nums"] as const,
  },
  badge: {
    fontFamily: fonts.body,
    fontSize: 12,
    letterSpacing: 0.15,
    lineHeight: 18,
  },
  stepper: {
    fontFamily: fonts.bodyBold,
    fontWeight: "700" as const,
    fontSize: 22,
    letterSpacing: -0.3,
    fontVariant: ["tabular-nums"] as const,
  },
} as const;

export const touchTarget = {
  min: 44,
  inputHeight: 56,
} as const;
