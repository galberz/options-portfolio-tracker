// src/utils/performanceMetrics.ts

/**
 * Utility types and functions to measure trading performance.
 * These utilities are deliberately framework agnostic so they can be
 * consumed by different parts of the app or future analysis tools.
 */

/**
 * Basic trade representation used for performance calculations.
 * `direction` specifies whether the trade was opened long or short.
 */
export interface Trade {
  id: string;
  entryDate: string; // ISO 8601 date string
  exitDate: string;  // ISO 8601 date string
  entryPrice: number;
  exitPrice: number;
  quantity: number; // Positive quantity of shares/contracts
  direction: 'long' | 'short';
}

/** Result of a trade including the realised P/L. */
export interface TradeResult extends Trade {
  realizedPL: number;
}

/**
 * Calculate the realized profit/loss for a single trade.
 * For long trades P/L = (exitPrice - entryPrice) * quantity.
 * For short trades P/L = (entryPrice - exitPrice) * quantity.
 */
export function calculateRealizedPL(trade: Trade): number {
  const { entryPrice, exitPrice, quantity, direction } = trade;
  if (
    isNaN(entryPrice) || isNaN(exitPrice) ||
    isNaN(quantity) || quantity <= 0
  ) {
    return 0;
  }
  const priceDiff = direction === 'long'
    ? exitPrice - entryPrice
    : entryPrice - exitPrice;
  return priceDiff * quantity;
}

/** Calculate realized P/L for each trade in an array. */
export function calculateTradeResults(trades: Trade[]): TradeResult[] {
  return trades.map((t) => ({ ...t, realizedPL: calculateRealizedPL(t) }));
}

/**
 * Success rate of a set of trades, expressed as a percentage of profitable
 * trades. Break-even trades (realized P/L == 0) are not counted as winners.
 */
export function calculateSuccessRate(trades: TradeResult[]): number {
  if (trades.length === 0) return 0;
  const winners = trades.filter((t) => t.realizedPL > 0).length;
  return (winners / trades.length) * 100;
}

/** Helper to group values by a key and accumulate totals. */
function accumulateBy<T extends string>(
  trades: TradeResult[],
  keyFn: (trade: TradeResult) => T
): Record<T, number> {
  const totals: Record<string, number> = {};
  for (const trade of trades) {
    const key = keyFn(trade);
    totals[key] = (totals[key] ?? 0) + trade.realizedPL;
  }
  return totals as Record<T, number>;
}

/**
 * Calculate cumulative realized P/L by month (YYYY-MM).
 * The returned object keys are months in ascending order with cumulative totals.
 */
export function cumulativeReturnsByMonth(trades: TradeResult[]): Record<string, number> {
  const monthly = accumulateBy(trades, (t) => t.exitDate.slice(0, 7));
  const sortedMonths = Object.keys(monthly).sort();
  const cumulative: Record<string, number> = {};
  let running = 0;
  for (const m of sortedMonths) {
    running += monthly[m];
    cumulative[m] = running;
  }
  return cumulative;
}

/**
 * Calculate cumulative realized P/L by year (YYYY).
 * Returns an object keyed by year with cumulative totals.
 */
export function cumulativeReturnsByYear(trades: TradeResult[]): Record<string, number> {
  const yearly = accumulateBy(trades, (t) => t.exitDate.slice(0, 4));
  const sortedYears = Object.keys(yearly).sort();
  const cumulative: Record<string, number> = {};
  let running = 0;
  for (const y of sortedYears) {
    running += yearly[y];
    cumulative[y] = running;
  }
  return cumulative;
}

