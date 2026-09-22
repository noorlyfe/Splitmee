import type { NudgeTone } from "../constants/messages";

/** Escalation stages driven by days unpaid (The Waiting Game). */
export type EscalationTier = "fresh" | "warming" | "heated" | "overdue";

export type EscalationVisual = {
  tier: EscalationTier;
  emoji: string;
  accent: string;
  accentSoft: string;
  border: string;
  stampRotate: string;
  watermarkOpacity: number;
  borderWidth: number;
};

/** Calmer tier palette: still expressive, less cartoon. */
const TIER_VISUALS: Record<EscalationTier, Omit<EscalationVisual, "tier">> = {
  fresh: {
    emoji: "·",
    accent: "#4A7C59",
    accentSoft: "rgba(74, 124, 89, 0.1)",
    border: "rgba(74, 124, 89, 0.28)",
    stampRotate: "-4deg",
    watermarkOpacity: 0.04,
    borderWidth: 0.5,
  },
  warming: {
    emoji: "·",
    accent: "#B06A5A",
    accentSoft: "rgba(176, 106, 90, 0.1)",
    border: "rgba(176, 106, 90, 0.3)",
    stampRotate: "-5deg",
    watermarkOpacity: 0.05,
    borderWidth: 0.5,
  },
  heated: {
    emoji: "·",
    accent: "#C07A3A",
    accentSoft: "rgba(192, 122, 58, 0.12)",
    border: "rgba(192, 122, 58, 0.35)",
    stampRotate: "-6deg",
    watermarkOpacity: 0.06,
    borderWidth: 1,
  },
  overdue: {
    emoji: "!",
    accent: "#A84545",
    accentSoft: "rgba(168, 69, 69, 0.12)",
    border: "rgba(168, 69, 69, 0.4)",
    stampRotate: "-7deg",
    watermarkOpacity: 0.08,
    borderWidth: 1.25,
  },
};

/** Days inclusive upper bounds for each tier before the next. */
const ESCALATION_DAY_BOUNDS = {
  freshMax: 3,
  warmingMax: 7,
  heatedMax: 14,
} as const;

export function getEscalationTier(days: number): EscalationTier {
  const d = Math.max(0, Math.floor(days));
  if (d <= ESCALATION_DAY_BOUNDS.freshMax) {
    return "fresh";
  }
  if (d <= ESCALATION_DAY_BOUNDS.warmingMax) {
    return "warming";
  }
  if (d <= ESCALATION_DAY_BOUNDS.heatedMax) {
    return "heated";
  }
  return "overdue";
}

export function getEscalationVisual(days: number): EscalationVisual {
  const tier = getEscalationTier(days);
  return { tier, ...TIER_VISUALS[tier] };
}

/** Suggested nudge tone when escalating at this waiting duration. */
export function suggestedToneForDays(days: number): NudgeTone {
  const tier = getEscalationTier(days);
  switch (tier) {
    case "fresh":
      return "casual";
    case "warming":
      return "passiveAggressive";
    case "heated":
      return "serious";
    case "overdue":
      return "serious";
  }
}

export function escalationLabelKey(tier: EscalationTier): string {
  switch (tier) {
    case "fresh":
      return "escalationFresh";
    case "warming":
      return "escalationWarming";
    case "heated":
      return "escalationHeated";
    case "overdue":
      return "escalationOverdue";
  }
}

export function escalationStampKey(tier: EscalationTier): string {
  switch (tier) {
    case "fresh":
      return "escalationStampFresh";
    case "warming":
      return "escalationStampWarming";
    case "heated":
      return "escalationStampHeated";
    case "overdue":
      return "escalationStampOverdue";
  }
}

export function escalationHeaderKey(tier: EscalationTier): string {
  switch (tier) {
    case "fresh":
      return "escalationHeaderFresh";
    case "warming":
      return "escalationHeaderWarming";
    case "heated":
      return "escalationHeaderHeated";
    case "overdue":
      return "escalationHeaderOverdue";
  }
}

/** Patience 0-1 where 1 = overdue (15+ days). */
export function patienceProgress(days: number): number {
  const d = Math.max(0, days);
  return Math.min(1, d / 15);
}

export function tierRank(tier: EscalationTier): number {
  switch (tier) {
    case "fresh":
      return 0;
    case "warming":
      return 1;
    case "heated":
      return 2;
    case "overdue":
      return 3;
  }
}
