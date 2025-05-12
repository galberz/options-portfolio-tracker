/**
 * Simple Black-Scholes model implementation
 */

// Cumulative normal distribution function
function normalCDF(x: number): number {
  // Approximation of the cumulative normal distribution function
  const b1 = 0.319381530;
  const b2 = -0.356563782;
  const b3 = 1.781477937;
  const b4 = -1.821255978;
  const b5 = 1.330274429;
  const p = 0.2316419;
  const c = 0.39894228;

  if (x >= 0) {
    const t = 1.0 / (1.0 + p * x);
    return 1.0 - c * Math.exp(-(x * x) / 2.0) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1);
  } else {
    const t = 1.0 / (1.0 - p * x);
    return c * Math.exp(-(x * x) / 2.0) * t * (t * (t * (t * (t * b5 + b4) + b3) + b2) + b1);
  }
}

/**
 * Black-Scholes option pricing formula implementation
 * 
 * @param underlyingPrice - Current price of the underlying asset
 * @param strikePrice - Strike price of the option
 * @param riskFreeRate - Risk-free interest rate (decimal)
 * @param timeToExpiration - Time to expiration in years
 * @param volatility - Volatility (decimal)
 * @param optionType - Type of option: 'call' or 'put'
 * @returns The option price
 */
export function blackScholes(
  underlyingPrice: number,
  strikePrice: number,
  riskFreeRate: number,
  timeToExpiration: number,
  volatility: number,
  optionType: 'call' | 'put'
): number {
  // Input validation
  if (underlyingPrice <= 0 || strikePrice <= 0 || timeToExpiration <= 0 || volatility <= 0) {
    console.warn("Invalid input parameters for Black-Scholes", {
      underlyingPrice, strikePrice, riskFreeRate, timeToExpiration, volatility
    });
    return 0;
  }

  // For very short expiration times, return intrinsic value
  if (timeToExpiration < 0.0001) {
    if (optionType === 'call') {
      return Math.max(0, underlyingPrice - strikePrice);
    } else {
      return Math.max(0, strikePrice - underlyingPrice);
    }
  }

  try {
    const d1 = (Math.log(underlyingPrice / strikePrice) + (riskFreeRate + volatility * volatility / 2) * timeToExpiration) / (volatility * Math.sqrt(timeToExpiration));
    const d2 = d1 - volatility * Math.sqrt(timeToExpiration);

    if (optionType === 'call') {
      return underlyingPrice * normalCDF(d1) - strikePrice * Math.exp(-riskFreeRate * timeToExpiration) * normalCDF(d2);
    } else {
      return strikePrice * Math.exp(-riskFreeRate * timeToExpiration) * normalCDF(-d2) - underlyingPrice * normalCDF(-d1);
    }
  } catch (error) {
    console.error("Error in Black-Scholes calculation:", error);
    return 0;
  }
} 