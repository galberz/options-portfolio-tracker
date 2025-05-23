import { describe, it, expect } from 'vitest';
import {
  calculateRealizedPL,
  calculateTradeResults,
  calculateSuccessRate,
  cumulativeReturnsByMonth,
  cumulativeReturnsByYear,
  Trade,
} from './performanceMetrics';

describe('performanceMetrics utilities', () => {
  const sampleTrades: Trade[] = [
    {
      id: 't1',
      entryDate: '2024-01-02',
      exitDate: '2024-01-10',
      entryPrice: 100,
      exitPrice: 110,
      quantity: 1,
      direction: 'long',
    },
    {
      id: 't2',
      entryDate: '2024-02-05',
      exitDate: '2024-03-01',
      entryPrice: 50,
      exitPrice: 40,
      quantity: 2,
      direction: 'long',
    },
    {
      id: 't3',
      entryDate: '2024-03-15',
      exitDate: '2024-03-20',
      entryPrice: 20,
      exitPrice: 15,
      quantity: 1,
      direction: 'short',
    },
  ];

  it('calculates realized P/L correctly', () => {
    expect(calculateRealizedPL(sampleTrades[0])).toBe(10);
    expect(calculateRealizedPL(sampleTrades[1])).toBe(-20);
    expect(calculateRealizedPL(sampleTrades[2])).toBe(5);
  });

  it('calculates success rate', () => {
    const results = calculateTradeResults(sampleTrades);
    expect(calculateSuccessRate(results)).toBeCloseTo(2 / 3 * 100);
  });

  it('aggregates cumulative returns by month', () => {
    const results = calculateTradeResults(sampleTrades);
    const monthPL = cumulativeReturnsByMonth(results);
    expect(monthPL['2024-01']).toBe(10);
    expect(monthPL['2024-03']).toBe(-5); // cumulative after March trades
  });

  it('aggregates cumulative returns by year', () => {
    const results = calculateTradeResults(sampleTrades);
    const yearPL = cumulativeReturnsByYear(results);
    expect(yearPL['2024']).toBe(-5);
  });
});

