// src/utils/calculations.ts

import { blackScholes } from 'black-scholes';
import { Portfolio, SharePosition, OptionPosition } from '../types/portfolio';

// --- Constants and Defaults ---
const DEFAULT_IMPLIED_VOLATILITY = 0.30; // 30% default IV
const DEFAULT_RISK_FREE_RATE = 0.04;   // 4% default risk-free rate
const DAYS_IN_YEAR = 365.25;

/**
 * Calculates the time to expiration in years (required by js-quantities BS).
 * @param expirationDateStr - The expiration date string (YYYY-MM-DD).
 * @param currentDate - The current date (defaults to now).
 * @returns Time to expiration in years (fractional). Returns 0 if expired or invalid.
 */
function getTimeToExpirationInYears(expirationDateStr: string, currentDate: Date = new Date()): number {
    try {
        const expiryDate = new Date(expirationDateStr + 'T00:00:00Z');
        const today = new Date(currentDate.toISOString().split('T')[0] + 'T00:00:00Z');

        if (isNaN(expiryDate.getTime())) {
            console.error("Invalid expiration date format:", expirationDateStr);
            return 0;
        }
        const timeDiff = expiryDate.getTime() - today.getTime();
        if (timeDiff <= 0) {
            return 0;
        }
        const daysToExpiry = timeDiff / (1000 * 60 * 60 * 24);
        return daysToExpiry / DAYS_IN_YEAR;
    } catch (error) {
        console.error("Error parsing date:", expirationDateStr, error);
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
  if (isNaN(underlyingPrice) || underlyingPrice < 0) return 0;
  return share.quantity * underlyingPrice;
}

/**
 * Calculates the theoretical value of a single option position using js-quantities Black-Scholes.
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
    if (isNaN(underlyingPrice) || underlyingPrice <= 0 || isNaN(impliedVolatility) || impliedVolatility < 0 || isNaN(riskFreeRate)) {
        console.warn("Invalid input for option pricing:", { underlyingPrice, impliedVolatility, riskFreeRate });
        return 0;
    }

    const { strikePrice, expirationDate, optionType, positionType, quantity } = option;
    const timeToExpirationYears = getTimeToExpirationInYears(expirationDate, currentDate);

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
        const theoreticalValuePerShare = blackScholes(
            underlyingPrice,       // stock price
            strikePrice,           // strike price
            timeToExpirationYears, // time to expiry in years
            impliedVolatility,     // volatility (e.g., 0.30 for 30%)
            riskFreeRate,          // risk-free rate (e.g., 0.04 for 4%)
            optionType === 'call'  // isCall (true for call, false for put)
        );

        if (isNaN(theoreticalValuePerShare) || typeof theoreticalValuePerShare !== 'number') {
             console.warn("black-scholes returned invalid value for option:", option, { underlyingPrice, strikePrice, riskFreeRate, impliedVolatility, timeToExpirationYears, optionType }, "Result:", theoreticalValuePerShare);
            return 0;
        }

        const totalValue = theoreticalValuePerShare * quantity * 100; // x100 shares per contract

        return positionType === 'long' ? totalValue : -totalValue;

    } catch (error) {
        console.error("Error in black-scholes calculation for option:", option, error);
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

  // Add cost of shares
  portfolio.shares.forEach(share => {
    totalCost += share.quantity * share.costBasisPerShare;
  });

  // Add/Subtract cost/premium of options
  portfolio.options.forEach(option => {
    const premiumEffect = option.premium * option.quantity; // Premium is per contract
    if (option.positionType === 'long') {
      totalCost += premiumEffect; // Paid premium increases cost basis
    } else { // short
      totalCost -= premiumEffect; // Received premium decreases cost basis
    }
  });

  return totalCost;
}

/**
 * Calculates the current *theoretical* total value of the entire portfolio.
 * Uses js-quantities library for options.
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
        totalValue += calculateShareValue(share, underlyingPrice);
    });

    portfolio.options.forEach(option => {
        // Pass IV and Rate to the option calculation
        totalValue += calculateOptionTheoreticalValue(option, underlyingPrice, currentDate, iv, rate);
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
    if (isNaN(underlyingPrice) || underlyingPrice < 0) return 0;

    // Use the theoretical value calculation now
    const currentTotalValue = calculatePortfolioTheoreticalValue(portfolio, underlyingPrice, currentDate, iv, rate);
    const totalCostBasis = calculateTotalCostBasis(portfolio);

    return currentTotalValue - totalCostBasis;
}

/**
 * Generates an array of {price, pl} points for creating a P/L graph.
 * Uses the theoretical P/L calculation (js-quantities) for consistency.
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
  steps: number = 50,
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
  if (isNaN(underlyingPriceAtExpiration) || underlyingPriceAtExpiration < 0) return 0;

  const { strikePrice, optionType, positionType, quantity } = option;
  let intrinsicValuePerShare = 0;

  if (optionType === 'call') {
    intrinsicValuePerShare = Math.max(0, underlyingPriceAtExpiration - strikePrice);
  } else { // put
    intrinsicValuePerShare = Math.max(0, strikePrice - underlyingPriceAtExpiration);
  }

  const totalIntrinsicValue = intrinsicValuePerShare * quantity * 100; // x100 shares per contract

  // Value is positive if long, negative if short (representing the obligation/asset value flip)
  // However, for P/L calculation, we usually consider the *outcome*.
  // A long call makes money if ITM, a short call loses money if ITM.
  // Let's return the straightforward value *relative to zero* for now.
  // The P/L calculation will handle the initial premium correctly.
  // Wait, simplifying: the *value* of the position at expiration:
  // Long Call/Put: Max(0, intrinsic value)
  // Short Call/Put: -Max(0, intrinsic value) --> Liability if ITM
   return positionType === 'long' ? totalIntrinsicValue : -totalIntrinsicValue;

   // *** Correction: Rethinking P/L vs Value ***
   // For P/L curve, we want the final profit/loss relative to the *initial trade*.
   // P/L = (Value at Expiration - Initial Premium Effect)
   // Let's adjust this function and the portfolio P/L function accordingly.

   // Let's calculate the raw profit/loss *from the option itself* at expiration.
   // Long Call P/L = (Max(0, S - K) * 100 * Q) - (Premium * 100 * Q)
   // Short Call P/L = (Premium * 100 * Q) - (Max(0, S - K) * 100 * Q)
   // Long Put P/L = (Max(0, K - S) * 100 * Q) - (Premium * 100 * Q)
   // Short Put P/L = (Premium * 100 * Q) - (Max(0, K - S) * 100 * Q)

   const initialPremiumEffect = option.premium * quantity * 100;

   if (positionType === 'long') {
       return totalIntrinsicValue - initialPremiumEffect;
   } else { // short
       return initialPremiumEffect - totalIntrinsicValue;
   }
}

/**
 * Calculates the total Profit/Loss (P/L) of the entire portfolio AT EXPIRATION.
 * This assumes all options expire at the given underlying price.
 * P/L = (Share P/L) + (Option P/L at Expiration)
 * @param portfolio - The portfolio object.
 * @param underlyingPriceAtExpiration - The price of the underlying stock at expiration.
 * @returns The total P/L of the portfolio at expiration.
 */
export function calculatePortfolioPLAtExpiration(
  portfolio: Portfolio,
  underlyingPriceAtExpiration: number
): number {
  if (isNaN(underlyingPriceAtExpiration) || underlyingPriceAtExpiration < 0) return 0;

  let totalPL = 0;

  // 1. Calculate P/L from Shares
  // P/L = (Current Value - Cost Basis)
  portfolio.shares.forEach(share => {
    const currentShareValue = share.quantity * underlyingPriceAtExpiration;
    const shareCostBasis = share.quantity * share.costBasisPerShare;
    totalPL += (currentShareValue - shareCostBasis);
  });

  // 2. Calculate P/L from Options at Expiration
  portfolio.options.forEach(option => {
    // We now use the dedicated expiration P/L function for each option
    totalPL += calculateOptionValueAtExpiration(option, underlyingPriceAtExpiration);
    // Note: calculateOptionValueAtExpiration now DIRECTLY calculates the P/L for that specific option trade (expiration value vs premium).
  });

  return totalPL;
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
  steps: number = 50
): { price: number, pl: number }[] {
  const data: { price: number, pl: number }[] = [];
  if (rangeStart >= rangeEnd || steps <= 0) return data;

  const stepSize = (rangeEnd - rangeStart) / steps;
  for (let i = 0; i <= steps; i++) {
    const price = rangeStart + (i * stepSize);
    // Use the specific expiration P/L calculation
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
  if (isNaN(quantity) || quantity <= 0 || isNaN(costBasisPerShare) || isNaN(underlyingPrice)) {
    return 0; // Return 0 if inputs are invalid or quantity is zero
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
  steps: number = 50
): { price: number, pl: number }[] {
  const data: { price: number, pl: number }[] = [];
  // Only generate data if quantity and cost basis are valid positive numbers
  if (isNaN(quantity) || quantity <= 0 || isNaN(costBasisPerShare) || costBasisPerShare < 0 || rangeStart >= rangeEnd || steps <= 0) {
       return data; // Return empty array if benchmark isn't properly defined or range is invalid
  }

  const stepSize = (rangeEnd - rangeStart) / steps;
  for (let i = 0; i <= steps; i++) {
    const price = rangeStart + (i * stepSize);
    const pl = calculateBenchmarkPL(quantity, costBasisPerShare, price);
    // Benchmark P/L should not be NaN if inputs are valid numbers
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
    steps: number = 100 // Use a reasonable number of steps, matching chart is good
): number[] {
    const crossovers: number[] = [];

    // Ensure valid benchmark parameters and range
    if (benchmarkQuantity <= 0 || benchmarkCostBasis < 0 || rangeStart >= rangeEnd || steps <= 0) {
        return crossovers; // Cannot calculate crossovers without a valid benchmark/range
    }

    // Generate the data points for both curves
    // Use a higher number of steps for potentially better accuracy if desired
    const expirationData = generateExpirationPLData(portfolio, rangeStart, rangeEnd, steps);
    const benchmarkData = generateBenchmarkPLData(benchmarkQuantity, benchmarkCostBasis, rangeStart, rangeEnd, steps);

    // Ensure data was generated and arrays match length (they should if ranges/steps are same)
    if (expirationData.length === 0 || benchmarkData.length === 0 || expirationData.length !== benchmarkData.length) {
        console.warn("Crossover calc: Data generation failed or lengths mismatch.");
        return crossovers;
    }

    // Iterate through the data points, looking for sign changes in the difference
    let prevDiff = expirationData[0].pl - benchmarkData[0].pl;

    for (let i = 1; i < expirationData.length; i++) {
        const currentDiff = expirationData[i].pl - benchmarkData[i].pl;

        // Check if the difference crossed zero (sign change)
        // (prevDiff < 0 && currentDiff >= 0) -> Crossed from below
        // (prevDiff > 0 && currentDiff <= 0) -> Crossed from above
        if ((prevDiff < 0 && currentDiff >= 0) || (prevDiff > 0 && currentDiff <= 0)) {
            // We found a crossover between point i-1 and i.
            // For simplicity, we can take the price at point i as the approximate crossover.
            // More advanced: Interpolate between price i-1 and i based on P/L values.
            crossovers.push(expirationData[i].price);
        }

        // Don't update prevDiff if currentDiff is exactly 0 to catch subsequent crossings
        if (currentDiff !== 0) {
             prevDiff = currentDiff;
        }
    }

    console.log("[Calculations] Found Crossover Points:", crossovers);
    return crossovers;
} 