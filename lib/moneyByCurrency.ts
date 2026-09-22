import { formatCurrency } from "./currency";

/** One money item with an ISO currency code. */
export type MoneyLine = {
  amount: number;
  currency: string;
};

export type CurrencyAmount = {
  currency: string;
  amount: number;
};

/**
 * Per-currency totals. Never sum across codes.
 * `mixed` is true only when more than one currency has a non-zero amount.
 */
export type AmountsByCurrency = {
  lines: CurrencyAmount[];
  mixed: boolean;
  single: CurrencyAmount | null;
};

function normalizeCode(code: string | null | undefined, fallback: string): string {
  const raw = (code ?? "").trim().toUpperCase();
  return /^[A-Z]{3}$/.test(raw) ? raw : fallback.toUpperCase();
}

/** Prefer app currency first, then largest absolute amount, then code. */
export function sortCurrencyAmounts(
  lines: CurrencyAmount[],
  preferredCurrency?: string
): CurrencyAmount[] {
  const preferred = preferredCurrency?.toUpperCase();
  return [...lines].sort((a, b) => {
    if (preferred) {
      if (a.currency === preferred && b.currency !== preferred) return -1;
      if (b.currency === preferred && a.currency !== preferred) return 1;
    }
    const byAbs = Math.abs(b.amount) - Math.abs(a.amount);
    if (byAbs !== 0) return byAbs;
    return a.currency.localeCompare(b.currency);
  });
}

export function sumByCurrency(
  items: Iterable<MoneyLine>,
  opts?: { fallbackCurrency?: string; preferredCurrency?: string }
): AmountsByCurrency {
  const fallback = (opts?.fallbackCurrency ?? opts?.preferredCurrency ?? "USD").toUpperCase();
  const map = new Map<string, number>();

  for (const item of items) {
    if (!Number.isFinite(item.amount) || item.amount === 0) {
      continue;
    }
    const code = normalizeCode(item.currency, fallback);
    map.set(code, (map.get(code) ?? 0) + item.amount);
  }

  const lines = sortCurrencyAmounts(
    [...map.entries()]
      .map(([currency, amount]) => ({
        currency,
        amount: Math.round(amount * 100) / 100,
      }))
      .filter((line) => line.amount !== 0),
    opts?.preferredCurrency ?? fallback
  );

  if (lines.length === 0) {
    return {
      lines: [],
      mixed: false,
      single: { currency: fallback, amount: 0 },
    };
  }

  if (lines.length === 1) {
    return { lines, mixed: false, single: lines[0]! };
  }

  return { lines, mixed: true, single: null };
}

/** Rough magnitude for sorting / bar widths: not for display as money. */
export function amountsMagnitude(bag: AmountsByCurrency): number {
  return bag.lines.reduce((sum, line) => sum + Math.abs(line.amount), 0);
}

export function formatAmountsByCurrency(
  bag: AmountsByCurrency,
  opts?: { joiner?: string; format?: (amount: number, currency: string) => string }
): string {
  const format = opts?.format ?? formatCurrency;
  const joiner = opts?.joiner ?? "\n";
  if (!bag.mixed && bag.single) {
    return format(bag.single.amount, bag.single.currency);
  }
  if (bag.lines.length === 0) {
    return format(0, "USD");
  }
  return bag.lines.map((line) => format(line.amount, line.currency)).join(joiner);
}

export function emptyAmounts(currency: string): AmountsByCurrency {
  const code = currency.toUpperCase();
  return {
    lines: [],
    mixed: false,
    single: { currency: code, amount: 0 },
  };
}
