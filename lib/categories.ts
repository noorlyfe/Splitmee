/** Spend categories for splits (Food, Travel, …): not the receipt “vibe” tone. */

export type SplitCategoryId =
  | "food"
  | "drinks"
  | "travel"
  | "home"
  | "tickets"
  | "other";

type CategoryMeta = {
  id: SplitCategoryId;
  emoji: string;
  labelKey: string;
};

export const SPLIT_CATEGORIES: ReadonlyArray<CategoryMeta> = [
  { id: "food", emoji: "🍽️", labelKey: "categoryFood" },
  { id: "travel", emoji: "✈️", labelKey: "categoryTravel" },
  { id: "home", emoji: "🏠", labelKey: "categoryHome" },
  { id: "tickets", emoji: "🎟️", labelKey: "categoryTickets" },
  { id: "other", emoji: "✨", labelKey: "categoryOther" },
];

const OTHER = SPLIT_CATEGORIES[SPLIT_CATEGORIES.length - 1]!;

export function isSplitCategoryId(value: string): value is SplitCategoryId {
  if (value === "drinks") {
    return true;
  }
  return SPLIT_CATEGORIES.some((c) => c.id === value);
}

/** Resolves category chrome. Legacy `drinks` always maps to Other: never surfaced. */
export function categoryMeta(id: string | undefined) {
  if (!id || id === "drinks") {
    return OTHER;
  }
  return SPLIT_CATEGORIES.find((c) => c.id === id) ?? OTHER;
}
