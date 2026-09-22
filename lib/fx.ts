import { round2 } from "../hooks/useTipCalculator";

/** Convert an amount in `from` to `to` using rates quoted vs a pivot (usually USD or app currency). */
export type FxRateTable = Record<string, number>;

/**
 * Rates mean: 1 unit of key = `rate` units of pivot currency.
 * Example pivot USD: { USD: 1, EUR: 1.08, DKK: 0.145 }
 */
export function convertAmount(
  amount: number,
  fromCurrency: string,
  toCurrency: string,
  rates: FxRateTable,
  pivot = "USD"
): number {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  if (!Number.isFinite(amount)) {
    return 0;
  }
  if (from === to) {
    return round2(amount);
  }
  const fromRate = rates[from];
  const toRate = rates[to];
  const pivotRate = rates[pivot.toUpperCase()] ?? 1;
  if (!fromRate || !toRate || fromRate <= 0 || toRate <= 0) {
    return round2(amount);
  }
  const inPivot = (amount * fromRate) / pivotRate;
  return round2((inPivot * pivotRate) / toRate);
}

/** Default offline rates vs USD (approx; user can override in Settings). */
export const DEFAULT_FX_RATES_USD: FxRateTable = {
  USD: 1,
  EUR: 1.08,
  GBP: 1.27,
  DKK: 0.145,
  SEK: 0.095,
  NOK: 0.092,
  CHF: 1.12,
  CAD: 0.74,
  AUD: 0.66,
  JPY: 0.0067,
  CNY: 0.14,
  HKD: 0.13,
  PLN: 0.25,
  INR: 0.012,
};

export function applyManualCrossRate(
  amount: number,
  /** How many units of app currency equal 1 unit of expense currency. */
  appPerForeign: number
): number {
  if (!Number.isFinite(amount) || !Number.isFinite(appPerForeign)) {
    return 0;
  }
  return round2(amount * Math.max(0, appPerForeign));
}
