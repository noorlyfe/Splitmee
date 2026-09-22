import { round2 } from "../hooks/useTipCalculator";

export type ShareLine = {
  id: string;
  name: string;
  amount: number;
};

export function makeEvenShares(people: number, totalAmount: number, namePrefix: string): ShareLine[] {
  const n = Math.max(1, Math.min(20, Math.floor(people)));
  const base = round2(totalAmount / n);
  const lines: ShareLine[] = [];
  let allocated = 0;
  for (let i = 0; i < n; i += 1) {
    const isLast = i === n - 1;
    const amount = isLast ? round2(totalAmount - allocated) : base;
    allocated = round2(allocated + amount);
    lines.push({
      id: `share-${i}`,
      name: `${namePrefix} ${i + 1}`,
      amount: Math.max(0, amount),
    });
  }
  return lines;
}

export function redistributeShares(lines: ShareLine[], totalAmount: number): ShareLine[] {
  if (lines.length === 0) {
    return lines;
  }
  const sum = round2(lines.reduce((s, l) => s + (Number.isFinite(l.amount) ? l.amount : 0), 0));
  if (sum <= 0) {
    return makeEvenShares(lines.length, totalAmount, "P");
  }
  const scale = totalAmount / sum;
  const next = lines.map((l, i) => ({
    ...l,
    amount: i === lines.length - 1 ? 0 : round2((Number.isFinite(l.amount) ? l.amount : 0) * scale),
  }));
  const allocated = round2(next.slice(0, -1).reduce((s, l) => s + l.amount, 0));
  next[next.length - 1]!.amount = round2(Math.max(0, totalAmount - allocated));
  return next;
}

export function sharesSum(lines: ShareLine[]): number {
  return round2(lines.reduce((s, l) => s + (Number.isFinite(l.amount) ? l.amount : 0), 0));
}

export function sharesBalanced(lines: ShareLine[], totalAmount: number, epsilon = 0.02): boolean {
  return Math.abs(sharesSum(lines) - round2(totalAmount)) <= epsilon;
}
