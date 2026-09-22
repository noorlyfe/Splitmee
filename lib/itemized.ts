import { round2 } from "../hooks/useTipCalculator";

/** One dish / line on the bill. */
export type BillItem = {
  id: string;
  name: string;
  amount: number;
  /** Person ids (or share line ids) who split this item. Empty = everyone. */
  assignedIds: string[];
};

export type ItemizedPerson = {
  id: string;
  name: string;
};

export type ItemizedResult = {
  perPerson: Record<string, number>;
  itemTotal: number;
  tipSharePerPerson: Record<string, number>;
  grandPerPerson: Record<string, number>;
};

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function createBillItem(name = "", amount = 0): BillItem {
  return { id: newId("item"), name, amount, assignedIds: [] };
}

export function createItemizedPeople(count: number, namePrefix: string): ItemizedPerson[] {
  const n = Math.max(1, Math.min(20, Math.floor(count)));
  return Array.from({ length: n }, (_, i) => ({
    id: `p-${i}`,
    name: `${namePrefix} ${i + 1}`,
  }));
}

/**
 * Split each item evenly among assigned people (or everyone if none assigned).
 * Tip is split in proportion to each person's item subtotal.
 */
export function computeItemizedSplit(
  items: BillItem[],
  people: ItemizedPerson[],
  tipAmount: number
): ItemizedResult {
  const perPerson: Record<string, number> = {};
  for (const p of people) {
    perPerson[p.id] = 0;
  }

  let itemTotal = 0;
  for (const item of items) {
    const amt = Number.isFinite(item.amount) ? Math.max(0, item.amount) : 0;
    if (amt <= 0) {
      continue;
    }
    itemTotal = round2(itemTotal + amt);
    const assignees =
      item.assignedIds.length > 0
        ? people.filter((p) => item.assignedIds.includes(p.id))
        : people;
    if (assignees.length === 0) {
      continue;
    }
    const share = round2(amt / assignees.length);
    let allocated = 0;
    assignees.forEach((p, i) => {
      const isLast = i === assignees.length - 1;
      const piece = isLast ? round2(amt - allocated) : share;
      allocated = round2(allocated + piece);
      perPerson[p.id] = round2((perPerson[p.id] ?? 0) + piece);
    });
  }

  const tipSharePerPerson: Record<string, number> = {};
  const grandPerPerson: Record<string, number> = {};
  const tip = Number.isFinite(tipAmount) ? Math.max(0, tipAmount) : 0;
  const baseSum = Object.values(perPerson).reduce((a, b) => a + b, 0);

  people.forEach((p, i) => {
    const base = perPerson[p.id] ?? 0;
    let tipShare = 0;
    if (tip > 0 && baseSum > 0) {
      tipShare =
        i === people.length - 1
          ? round2(
              tip -
                people.slice(0, -1).reduce((acc, q) => {
                  const qb = perPerson[q.id] ?? 0;
                  return round2(acc + round2((tip * qb) / baseSum));
                }, 0)
            )
          : round2((tip * base) / baseSum);
    } else if (tip > 0 && people.length > 0) {
      tipShare =
        i === people.length - 1
          ? round2(tip - round2((tip / people.length) * (people.length - 1)))
          : round2(tip / people.length);
    }
    tipSharePerPerson[p.id] = Math.max(0, tipShare);
    grandPerPerson[p.id] = round2(base + tipSharePerPerson[p.id]!);
  });

  return {
    perPerson,
    itemTotal: round2(itemTotal),
    tipSharePerPerson,
    grandPerPerson,
  };
}

/** Percentage mode: each person pays pct of the bill+tip. Percents should sum ~100. */
export function computePercentSplit(
  people: Array<ItemizedPerson & { percent: number }>,
  billPlusTip: number
): Record<string, number> {
  const total = round2(billPlusTip);
  const out: Record<string, number> = {};
  let allocated = 0;
  people.forEach((p, i) => {
    const pct = Number.isFinite(p.percent) ? Math.max(0, p.percent) : 0;
    if (i === people.length - 1) {
      out[p.id] = round2(Math.max(0, total - allocated));
    } else {
      const amt = round2((total * pct) / 100);
      out[p.id] = amt;
      allocated = round2(allocated + amt);
    }
  });
  return out;
}

export function percentSum(people: Array<{ percent: number }>): number {
  return round2(people.reduce((s, p) => s + (Number.isFinite(p.percent) ? p.percent : 0), 0));
}
