export type ProjectReceiptContext = "travel" | "food" | "default";

const TRIP_KEYWORDS = [
  "trip",
  "travel",
  "vacation",
  "ferie",
  "rejse",
  "voyage",
  "viaje",
  "reise",
  "urlaub",
  "holiday",
  "holidays",
];

const FOOD_KEYWORDS = [
  "dinner",
  "lunch",
  "breakfast",
  "brunch",
  "restaurant",
  "food",
  "middag",
  "mad",
  "frokost",
  "dîner",
  "diner",
  "cena",
  "comida",
  "essen",
  "mahl",
  "meal",
  "eat",
  "cafe",
  "café",
];

export function detectProjectReceiptContext(projectName: string): ProjectReceiptContext {
  const haystack = projectName.trim().toLowerCase();
  if (!haystack) {
    return "default";
  }
  if (TRIP_KEYWORDS.some((kw) => haystack.includes(kw))) {
    return "travel";
  }
  if (FOOD_KEYWORDS.some((kw) => haystack.includes(kw))) {
    return "food";
  }
  return "default";
}

export function projectReceiptCopyKeys(context: ProjectReceiptContext) {
  const suffix = context === "travel" ? "Travel" : context === "food" ? "Food" : "Default";
  return {
    contextBadge: `projectReceiptContextBadge${suffix}` as const,
    tagline: `projectReceiptTagline${suffix}` as const,
    sectionTitle: `projectReceiptSectionTitle${suffix}` as const,
    lineExpense: `projectReceiptLineExpense${suffix}` as const,
    lineShare: `projectReceiptLineShare${suffix}` as const,
    lineTotalOwed: `projectReceiptLineTotalOwed${suffix}` as const,
  };
}

export function receiptColorsForProjectContext(
  context: ProjectReceiptContext,
  isDark: boolean
): {
  background: string;
  text: string;
  accent: string;
  divider: string;
  muted: string;
  surface: string;
  badgeBg: string;
} {
  if (context === "travel") {
    return {
      background: isDark ? "#1A2228" : "#F1F4F6",
      text: isDark ? "#E8EEF2" : "#1A2830",
      accent: isDark ? "#8AAA9B" : "#3D5A6C",
      divider: isDark ? "#2A343C" : "#D5DEE4",
      muted: isDark ? "#8A9AA6" : "#5E7382",
      surface: isDark ? "#222B32" : "#E7EDF1",
      badgeBg: isDark ? "rgba(138, 170, 155, 0.14)" : "rgba(61, 90, 108, 0.08)",
    };
  }
  if (context === "food") {
    return {
      background: isDark ? "#221E1A" : "#F6F1EB",
      text: isDark ? "#F0E8DE" : "#2A2018",
      accent: isDark ? "#C4A484" : "#8B6A4A",
      divider: isDark ? "#332C26" : "#E2D6C8",
      muted: isDark ? "#A89888" : "#7A6A58",
      surface: isDark ? "#2A241F" : "#EFE6DC",
      badgeBg: isDark ? "rgba(196, 164, 132, 0.14)" : "rgba(139, 106, 74, 0.08)",
    };
  }
  return {
    background: isDark ? "#1A1C20" : "#FAFBFC",
    text: isDark ? "#F1F2F4" : "#16181C",
    accent: isDark ? "#5A74B0" : "#1A3D8A",
    divider: isDark ? "#2A2E35" : "#E2E5EA",
    muted: isDark ? "#9499A3" : "#6F7884",
    surface: isDark ? "#22252A" : "#F4F5F7",
    badgeBg: isDark ? "rgba(90, 116, 176, 0.22)" : "rgba(26, 61, 138, 0.1)",
  };
}
