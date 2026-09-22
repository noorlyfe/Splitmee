import type { SplitRecord } from "../hooks/useSplitHistory";
import type { Project } from "../hooks/useProjects";
import { getUnpaidProjectDebts } from "../hooks/useProjects";
import {
  amountsMagnitude,
  formatAmountsByCurrency,
  sumByCurrency,
  type AmountsByCurrency,
} from "./moneyByCurrency";

export type DamageStats = {
  outstanding: AmountsByCurrency;
  recovered: AmountsByCurrency;
  /** Magnitude only: sorting / heat, not a display total across currencies. */
  totalOutstanding: number;
  totalRecovered: number;
  unpaidCount: number;
  paidCount: number;
  collectionRate: number;
  avgDaysToPay: number | null;
  maxDaysWaiting: number;
  lifetimeNudgeSends: number;
  splitsThisMonth: number;
  /** Primary currency when single; otherwise preferred/app. */
  topCurrency: string;
  /** 0 to 1 patience heat across unpaid. */
  heatScore: number;
};

const MS_PER_DAY = 86_400_000;

function isPaid(record: SplitRecord): boolean {
  return typeof record.paidAt === "string" && record.paidAt.trim().length > 0;
}

function sentMillis(record: SplitRecord): number {
  const iso = typeof record.nudgeSentAt === "string" ? record.nudgeSentAt.trim() : "";
  if (iso) {
    const t = Date.parse(iso);
    if (Number.isFinite(t)) {
      return t;
    }
  }
  return Date.parse(record.createdAt) || Date.now();
}

function daysBetween(fromMs: number, toMs: number): number {
  return Math.max(0, Math.floor((toMs - fromMs) / MS_PER_DAY));
}

function currentMonthPrefix(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Competitive “insights” layer: Splitwise charts / Settle Up graphs,
 * framed as Nudgrr’s Damage Report.
 */
export function computeDamageStats(
  splits: SplitRecord[],
  projects: Project[],
  appCurrency: string
): DamageStats {
  const unpaidSplits = splits.filter((s) => !isPaid(s));
  const paidSplits = splits.filter((s) => isPaid(s));
  const projectDebts = getUnpaidProjectDebts(projects);

  const outstanding = sumByCurrency(
    [
      ...unpaidSplits.map((s) => ({
        amount: Number.isFinite(s.totalPerPerson) ? s.totalPerPerson : 0,
        currency: s.currency ?? appCurrency,
      })),
      ...projectDebts.map((d) => ({
        amount: d.amount,
        currency: appCurrency,
      })),
    ],
    { preferredCurrency: appCurrency, fallbackCurrency: appCurrency }
  );

  const recovered = sumByCurrency(
    paidSplits.map((s) => ({
      amount: Number.isFinite(s.totalPerPerson) ? s.totalPerPerson : 0,
      currency: s.currency ?? appCurrency,
    })),
    { preferredCurrency: appCurrency, fallbackCurrency: appCurrency }
  );

  const payDurations: number[] = [];
  for (const s of paidSplits) {
    const paidAt = Date.parse(s.paidAt!);
    if (Number.isFinite(paidAt)) {
      payDurations.push(daysBetween(sentMillis(s), paidAt));
    }
  }

  let maxDaysWaiting = 0;
  for (const s of unpaidSplits) {
    maxDaysWaiting = Math.max(maxDaysWaiting, daysBetween(sentMillis(s), Date.now()));
  }
  for (const d of projectDebts) {
    const closed = Date.parse(d.closedAt) || Date.now();
    maxDaysWaiting = Math.max(maxDaysWaiting, daysBetween(closed, Date.now()));
  }

  const month = currentMonthPrefix();
  const splitsThisMonth = splits.filter((s) => s.createdAt.startsWith(month)).length;

  const lifetimeNudgeSends = splits.filter(
    (s) => typeof s.nudgeSentAt === "string" && s.nudgeSentAt.trim().length > 0
  ).length;

  const settledCount = paidSplits.length;
  const openCount = unpaidSplits.length + projectDebts.length;
  const denom = settledCount + openCount;
  const collectionRate = denom === 0 ? 1 : settledCount / denom;

  const avgDaysToPay =
    payDurations.length === 0
      ? null
      : Math.round(payDurations.reduce((a, b) => a + b, 0) / payDurations.length);

  const heatScore = Math.min(1, maxDaysWaiting / 15);
  const topCurrency = outstanding.single?.currency ?? recovered.single?.currency ?? appCurrency;

  return {
    outstanding,
    recovered,
    totalOutstanding: amountsMagnitude(outstanding),
    totalRecovered: amountsMagnitude(recovered),
    unpaidCount: openCount,
    paidCount: settledCount,
    collectionRate,
    avgDaysToPay,
    maxDaysWaiting,
    lifetimeNudgeSends,
    splitsThisMonth,
    topCurrency,
    heatScore,
  };
}

export function buildDamageExportText(
  stats: DamageStats,
  lines: {
    title: string;
    outstanding: string;
    recovered: string;
    collection: string;
    avgDays: string;
    maxWait: string;
    monthSplits: string;
    footer: string;
  }
): string {
  const collectionPct = `${Math.round(stats.collectionRate * 100)}%`;
  const avg = stats.avgDaysToPay == null ? ": " : String(stats.avgDaysToPay);
  const outstandingLabel = formatAmountsByCurrency(stats.outstanding, { joiner: ", " });
  const recoveredLabel = formatAmountsByCurrency(stats.recovered, { joiner: ", " });
  return [
    lines.title,
    "",
    `${lines.outstanding}: ${outstandingLabel} (${stats.unpaidCount})`,
    `${lines.recovered}: ${recoveredLabel} (${stats.paidCount})`,
    `${lines.collection}: ${collectionPct}`,
    `${lines.avgDays}: ${avg}`,
    `${lines.maxWait}: ${stats.maxDaysWaiting}`,
    `${lines.monthSplits}: ${stats.splitsThisMonth}`,
    "",
    lines.footer,
  ].join("\n");
}

export type CategoryStat = {
  id: string;
  count: number;
  /** Magnitude for bar width only. */
  total: number;
  amounts: AmountsByCurrency;
};

export function computeCategoryBreakdown(
  splits: SplitRecord[],
  appCurrency = "USD"
): CategoryStat[] {
  const map = new Map<string, { id: string; count: number; lines: { amount: number; currency: string }[] }>();
  for (const s of splits) {
    const id = (s.category && s.category.trim()) || "other";
    const prev = map.get(id) ?? { id, count: 0, lines: [] };
    prev.count += 1;
    prev.lines.push({
      amount: Number.isFinite(s.totalAmount) ? s.totalAmount : 0,
      currency: s.currency ?? appCurrency,
    });
    map.set(id, prev);
  }
  return [...map.values()]
    .map((row) => {
      const amounts = sumByCurrency(row.lines, {
        preferredCurrency: appCurrency,
        fallbackCurrency: appCurrency,
      });
      return {
        id: row.id,
        count: row.count,
        total: amountsMagnitude(amounts),
        amounts,
      };
    })
    .sort((a, b) => b.total - a.total);
}
