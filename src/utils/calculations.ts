// src/utils/calculations.ts

import { Portfolio, SharePosition, OptionPosition } from '../types/portfolio';
// Import our custom Black-Scholes implementation
import { blackScholes } from './black-scholes';

// --- Constants and Defaults ---
const DEFAULT_IMPLIED_VOLATILITY = 0.30; // 30% default IV
const DEFAULT_RISK_FREE_RATE = 0.04;   // 4% default risk-free rate
const DAYS_IN_YEAR = 365.25;

/**
 * Calculates the time to expiration in years (required by the 'financial' library's BS function).
 * @param expirationDateStr - The expiration date string (YYYY-MM-DD).
 * @param currentDate - The current date (defaults to now).
 * @returns Time to expiration in years (fractional). Returns 0 if expired or invalid.
 */
function getTimeToExpirationInYears(expirationDateStr: string, currentDate: Date = new Date()): number {
    try {
        const expiryDate = new Date(expirationDateStr + 'T00:00:00Z'); // Treat as UTC midnight
        const today = new Date(currentDate.toISOString().split('T')[0] + 'T00:00:00Z'); // Treat as UTC midnight

        if (isNaN(expiryDate.getTime())) {
            console.error("Invalid expiration date format:", expirationDateStr);
            return 0;
        }
        const timeDiff = expiryDate.getTime() - today.getTime();
        if (timeDiff <= 0) {
            return 0; // Expired or expiring today
        }
        const daysToExpiry = timeDiff / (1000 * 60 * 60 * 24);
        return daysToExpiry / DAYS_IN_YEAR;
    } catch (error) {
        console.error("Error parsing date in getTimeToExpirationInYears:", expirationDateStr, error);
        return 0;
    }
}

/**
 * Calculates the current value of a single share position.
 * @param share - The share position object.
 * @param underlyingPrice - The current price of the underlying stock.
 * @returns The total value of the shares.
 */
export function calculateShareValue(share: SharePosition, underlyingPrice: number): number {
  if (isNaN(underlyingPrice) || underlyingPrice < 0 || share.isIncludedInAnalysis === false) return 0;
  return share.quantity * underlyingPrice;
}

/**
 * Calculates the theoretical value of a single option position using the 'financial' library's Black-Scholes.
 * @param option - The option position object.
 * @param underlyingPrice - The current price of the underlying stock.
 * @param currentDate - The date for which to calculate the value (defaults to now).
 * @param impliedVolatility - The implied volatility (decimal, e.g., 0.3 for 30%).
 * @param riskFreeRate - The risk-free interest rate (decimal, e.g., 0.04 for 4%).
 * @returns The theoretical value of the option position (can be negative for short positions).
 */
export function calculateOptionTheoreticalValue(
    option: OptionPosition,
    underlyingPrice: number,
    currentDate: Date = new Date(),
    impliedVolatility: number = DEFAULT_IMPLIED_VOLATILITY,
    riskFreeRate: number = DEFAULT_RISK_FREE_RATE
): number {
    // Validate inputs
    if (isNaN(impliedVolatility) || impliedVolatility <= 0 ||
        isNaN(riskFreeRate)) {
        console.warn("Invalid input for option pricing:", { underlyingPrice, impliedVolatility, riskFreeRate });
        return 0;
    }

    const { strikePrice, expirationDate, optionType, positionType, quantity } = option;
    const timeToExpirationYears = getTimeToExpirationInYears(expirationDate, currentDate);

    // Handle expired options: value is intrinsic value
    if (timeToExpirationYears <= 0) {
        let intrinsicValue = 0;
        if (optionType === 'call') {
            intrinsicValue = Math.max(0, underlyingPrice - strikePrice);
        } else { // put
            intrinsicValue = Math.max(0, strikePrice - underlyingPrice);
        }
        const totalIntrinsicValue = intrinsicValue * quantity * 100;
        return positionType === 'long' ? totalIntrinsicValue : -totalIntrinsicValue;
    }

    try {
        // Use our custom Black-Scholes function
        // blackScholes(underlyingPrice, strikePrice, interestRate, timeToExpiration, volatility, type)
        const theoreticalValuePerShare = blackScholes(
            underlyingPrice,
            strikePrice,
            riskFreeRate,
            timeToExpirationYears,
            impliedVolatility,
            optionType // 'call' or 'put'
        );

        if (isNaN(theoreticalValuePerShare) || typeof theoreticalValuePerShare !== 'number') {
             console.warn("Black-Scholes returned invalid value for option:", option,
               { underlyingPrice, strikePrice, riskFreeRate, timeToExpirationYears, impliedVolatility, optionType },
               "Result:", theoreticalValuePerShare);
             return 0;
        }

        const totalValue = theoreticalValuePerShare * quantity * 100; // x100 shares per contract
        return positionType === 'long' ? totalValue : -totalValue;

    } catch (error) {
        console.error("Error in Black-Scholes calculation for option:", option, error);
        console.error("Inputs:", { optionType, underlyingPrice, strikePrice, timeToExpirationYears, riskFreeRate, impliedVolatility });
        return 0;
    }
}

/**
 * Calculates the total cost basis of the portfolio.
 * Long options cost money (positive cost), short options generate premium (negative cost).
 * @param portfolio - The portfolio object.
 * @returns The total cost basis.
 */
export function calculateTotalCostBasis(portfolio: Portfolio): number {
  let totalCost = 0;
  portfolio.shares.forEach(share => {
    if (share.isIncludedInAnalysis !== false) {
      totalCost += share.quantity * share.costBasisPerShare;
    }
  });
  portfolio.options.forEach(option => {
    if (option.isIncludedInAnalysis !== false) {
      const premiumEffect = option.premium; // Premium is already total per contract
      if (option.positionType === 'long') {
        totalCost += premiumEffect * option.quantity;
      } else {
        totalCost -= premiumEffect * option.quantity;
      }
    }
  });
  return totalCost;
}

/**
 * Calculates the current *theoretical* total value of the entire portfolio.
 * Uses the 'financial' library for options.
 * @param portfolio - The portfolio object.
 * @param underlyingPrice - The current price of the underlying stock.
 * @param currentDate - The date for valuation (defaults to now).
 * @param iv - Default Implied Volatility for options (decimal).
 * @param rate - Default Risk-Free Rate for options (decimal).
 * @returns The total theoretical value of the portfolio.
 */
export function calculatePortfolioTheoreticalValue(
    portfolio: Portfolio,
    underlyingPrice: number,
    currentDate: Date = new Date(),
    iv: number = DEFAULT_IMPLIED_VOLATILITY,
    rate: number = DEFAULT_RISK_FREE_RATE
): number {
    if (isNaN(underlyingPrice) || underlyingPrice < 0) return 0;
    let totalValue = 0;
    portfolio.shares.forEach(share => {
      if (share.isIncludedInAnalysis !== false) {
        totalValue += calculateShareValue(share, underlyingPrice);
      }
    });
    portfolio.options.forEach(option => {
      if (option.isIncludedInAnalysis !== false) {
        totalValue += calculateOptionTheoreticalValue(option, underlyingPrice, currentDate, iv, rate);
      }
    });
    return totalValue;
}

/**
 * Calculates the current *theoretical* Profit/Loss (P/L) of the portfolio.
 * P/L = Current Theoretical Portfolio Value - Total Cost Basis
 * @param portfolio - The portfolio object.
 * @param underlyingPrice - The current price of the underlying stock.
 * @param currentDate - The date for valuation (defaults to now).
 * @param iv - Default Implied Volatility for options (decimal).
 * @param rate - Default Risk-Free Rate for options (decimal).
 * @returns The total theoretical P/L.
 */
export function calculatePortfolioPL(
    portfolio: Portfolio,
    underlyingPrice: number,
    currentDate: Date = new Date(),
    iv: number = DEFAULT_IMPLIED_VOLATILITY,
    rate: number = DEFAULT_RISK_FREE_RATE
): number {
    if (isNaN(underlyingPrice) || underlyingPrice < 0) {
         console.warn(`calculatePortfolioPL: Skipped due to invalid price ${underlyingPrice}`);
         return 0;
    }
    const currentTotalValue = calculatePortfolioTheoreticalValue(portfolio, underlyingPrice, currentDate, iv, rate);
    const totalCostBasis = calculateTotalCostBasis(portfolio);
    const finalPL = currentTotalValue - totalCostBasis;

    // console.log(`--- CalcPL @ Price: ${underlyingPrice.toFixed(2)} --- TV: ${currentTotalValue.toFixed(2)}, CB: ${totalCostBasis.toFixed(2)}, P/L: ${finalPL.toFixed(2)}`);
    return finalPL;
}

/**
 * Generates an array of {price, pl} points for creating a THEORETICAL P/L graph.
 * Uses the theoretical P/L calculation ('financial' library) for consistency.
 *
 * @param portfolio - The portfolio object.
 * @param rangeStart - The starting underlying price for the range.
 * @param rangeEnd - The ending underlying price for the range.
 * @param steps - The number of price points to calculate within the range.
 * @param currentDate - The date for valuation (defaults to now).
 * @param iv - Default Implied Volatility for options (decimal).
 * @param rate - Default Risk-Free Rate for options (decimal).
 * @returns An array of objects { price: number, pl: number }.
 */
export function generatePLData(
  portfolio: Portfolio,
  rangeStart: number,
  rangeEnd: number,
  steps: number = 100, // Increased default for smoother chart
  currentDate: Date = new Date(),
  iv: number = DEFAULT_IMPLIED_VOLATILITY,
  rate: number = DEFAULT_RISK_FREE_RATE
): { price: number, pl: number }[] {
  const data: { price: number, pl: number }[] = [];
  if (rangeStart >= rangeEnd || steps <= 0) return data;

  const stepSize = (rangeEnd - rangeStart) / steps;
  for (let i = 0; i <= steps; i++) {
    const price = rangeStart + (i * stepSize);
    const pl = calculatePortfolioPL(portfolio, price, currentDate, iv, rate);
    if (isNaN(pl)) {
        console.warn(`generatePLData: NaN P/L calculated for price ${price}`);
    } else {
        data.push({ price: parseFloat(price.toFixed(2)), pl: parseFloat(pl.toFixed(2)) });
    }
  }
  return data;
}

/**
 * Calculates the value of a single option position AT EXPIRATION based on intrinsic value.
 * @param option - The option position object.
 * @param underlyingPriceAtExpiration - The price of the underlying stock at expiration.
 * @returns The total intrinsic value of the option position at expiration (positive for long, negative for short).
 */
export function calculateOptionValueAtExpiration(
  option: OptionPosition,
  underlyingPriceAtExpiration: number
): number {
  if (isNaN(underlyingPriceAtExpiration) || underlyingPriceAtExpiration < 0 || option.isIncludedInAnalysis === false) return 0;
  const { strikePrice, optionType, positionType, quantity } = option;
  let intrinsicValuePerShare = 0;
  if (optionType === 'call') {
    intrinsicValuePerShare = Math.max(0, underlyingPriceAtExpiration - strikePrice);
  } else {
    intrinsicValuePerShare = Math.max(0, strikePrice - underlyingPriceAtExpiration);
  }
  const totalIntrinsicValue = intrinsicValuePerShare * quantity * 100;
  return positionType === 'long' ? totalIntrinsicValue : -totalIntrinsicValue;
}

/**
 * Calculates the total portfolio value AT EXPIRATION.
 * @param portfolio - The portfolio object.
 * @param underlyingPriceAtExpiration - The price of the underlying stock at expiration.
 * @returns The total portfolio value at expiration.
 */
export function calculatePortfolioPLAtExpiration(
  portfolio: Portfolio,
  underlyingPriceAtExpiration: number
): number {
  if (isNaN(underlyingPriceAtExpiration) || underlyingPriceAtExpiration < 0) return 0;
  let totalValueAtExpiration = 0;
  portfolio.shares.forEach(share => {
    if (share.isIncludedInAnalysis !== false) {
      totalValueAtExpiration += calculateShareValue(share, underlyingPriceAtExpiration);
    }
  });
  portfolio.options.forEach(option => {
    if (option.isIncludedInAnalysis !== false) {
      totalValueAtExpiration += calculateOptionValueAtExpiration(option, underlyingPriceAtExpiration);
    }
  });
  const totalCostBasis = calculateTotalCostBasis(portfolio);
  return totalValueAtExpiration - totalCostBasis;
}

/**
 * Generates an array of {price, pl} points for creating an EXPIRATION P/L graph.
 *
 * @param portfolio - The portfolio object.
 * @param rangeStart - The starting underlying price for the range.
 * @param rangeEnd - The ending underlying price for the range.
 * @param steps - The number of price points to calculate within the range.
 * @returns An array of objects { price: number, pl: number }.
 */
export function generateExpirationPLData(
  portfolio: Portfolio,
  rangeStart: number,
  rangeEnd: number,
  steps: number = 100 // Increased default for smoother chart
): { price: number, pl: number }[] {
  const data: { price: number, pl: number }[] = [];
  if (rangeStart >= rangeEnd || steps <= 0) return data;
  const stepSize = (rangeEnd - rangeStart) / steps;
  for (let i = 0; i <= steps; i++) {
    const price = rangeStart + (i * stepSize);
    const pl = calculatePortfolioPLAtExpiration(portfolio, price);
    if (isNaN(pl)) {
       console.warn(`generateExpirationPLData: NaN P/L calculated for price ${price}`);
    } else {
       data.push({ price: parseFloat(price.toFixed(2)), pl: parseFloat(pl.toFixed(2)) });
    }
  }
  return data;
}

// --- START: Add Benchmark Calculation Functions ---

/**
 * Calculates the Profit/Loss for a simple Buy & Hold benchmark strategy.
 * @param quantity - Number of shares held in the benchmark.
 * @param costBasisPerShare - The average cost per share for the benchmark holding.
 * @param underlyingPrice - The current or projected price of the underlying.
 * @returns The total P/L of the benchmark position.
 */
export function calculateBenchmarkPL(
  quantity: number,
  costBasisPerShare: number,
  underlyingPrice: number
): number {
  if (isNaN(quantity) || quantity <= 0 || isNaN(costBasisPerShare) || costBasisPerShare < 0 || isNaN(underlyingPrice)) {
    return 0;
  }
  const currentValue = quantity * underlyingPrice;
  const initialCost = quantity * costBasisPerShare;
  return currentValue - initialCost;
}

/**
 * Generates an array of {price, pl} points for a Buy & Hold benchmark P/L graph.
 * @param quantity - Number of shares held in the benchmark.
 * @param costBasisPerShare - The average cost per share for the benchmark holding.
 * @param rangeStart - The starting underlying price for the range.
 * @param rangeEnd - The ending underlying price for the range.
 * @param steps - The number of price points to calculate within the range.
 * @returns An array of objects { price: number, pl: number }.
 */
export function generateBenchmarkPLData(
  quantity: number,
  costBasisPerShare: number,
  rangeStart: number,
  rangeEnd: number,
  steps: number = 100 // Increased default for smoother chart
): { price: number, pl: number }[] {
  const data: { price: number, pl: number }[] = [];
  if (isNaN(quantity) || quantity <= 0 || isNaN(costBasisPerShare) || costBasisPerShare < 0 || rangeStart >= rangeEnd || steps <= 0) {
       return data;
  }
  const stepSize = (rangeEnd - rangeStart) / steps;
  for (let i = 0; i <= steps; i++) {
    const price = rangeStart + (i * stepSize);
    const pl = calculateBenchmarkPL(quantity, costBasisPerShare, price);
    data.push({ price: parseFloat(price.toFixed(2)), pl: parseFloat(pl.toFixed(2)) });
  }
  return data;
}
// --- END: Add Benchmark Calculation Functions --- 

/**
 * Finds approximate underlying price points where the portfolio's expiration P/L
 * crosses over the benchmark P/L.
 *
 * @param portfolio - The current portfolio.
 * @param benchmarkQuantity - Number of shares in the benchmark.
 * @param benchmarkCostBasis - Cost basis per share for the benchmark.
 * @param rangeStart - The starting price for analysis (should match chart).
 * @param rangeEnd - The ending price for analysis (should match chart).
 * @param steps - The number of steps for analysis (should match chart).
 * @returns An array of approximate crossover prices. Returns empty array if none found or invalid inputs.
 */
export function findCrossoverPoints(
    portfolio: Portfolio,
    benchmarkQuantity: number,
    benchmarkCostBasis: number,
    rangeStart: number,
    rangeEnd: number,
    steps: number = 100
): number[] {
    const crossovers: number[] = [];
    if (benchmarkQuantity <= 0 || benchmarkCostBasis < 0 || rangeStart >= rangeEnd || steps <= 0) {
        return crossovers;
    }
    const expirationData = generateExpirationPLData(portfolio, rangeStart, rangeEnd, steps);
    const benchmarkData = generateBenchmarkPLData(benchmarkQuantity, benchmarkCostBasis, rangeStart, rangeEnd, steps);

    if (expirationData.length === 0 || benchmarkData.length === 0 || expirationData.length !== benchmarkData.length) {
        console.warn("Crossover calc: Data generation failed or lengths mismatch.");
        return crossovers;
    }

    let prevDiff = expirationData[0].pl - benchmarkData[0].pl;
    for (let i = 1; i < expirationData.length; i++) {
        const currentDiff = expirationData[i].pl - benchmarkData[i].pl;
        if ((prevDiff < 0 && currentDiff >= 0) || (prevDiff > 0 && currentDiff <= 0)) {
            // Basic interpolation for a slightly more accurate crossover point
            if (currentDiff - prevDiff !== 0) { // Avoid division by zero
                const price1 = expirationData[i-1].price;
                const price2 = expirationData[i].price;
                // t is the fraction of the way from point1 to point2 where crossover occurs
                const t = Math.abs(prevDiff) / Math.abs(currentDiff - prevDiff);
                crossovers.push(price1 + t * (price2 - price1));
            } else {
                 crossovers.push(expirationData[i].price); // Fallback if diff is zero
            }
        }
        if (currentDiff !== 0) {
             prevDiff = currentDiff;
        }
    }
    // console.log("[Calculations] Found Crossover Points:", crossovers);
    return crossovers.filter((val, idx, self) => self.indexOf(val) === idx); // Deduplicate
} 