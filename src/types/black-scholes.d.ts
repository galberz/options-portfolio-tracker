declare module 'black-scholes' {
    /**
     * Calculates the Black-Scholes option price
     * @param stockPrice - Current stock price
     * @param strikePrice - Strike price
     * @param timeToExpiration - Time to expiration in years
     * @param volatility - Volatility (decimal, e.g., 0.30 for 30%)
     * @param riskFreeRate - Risk-free rate (decimal, e.g., 0.04 for 4%)
     * @param isCall - true for call option, false for put option
     * @returns The theoretical option price
     */
    export function blackScholes(
        stockPrice: number,
        strikePrice: number,
        timeToExpiration: number,
        volatility: number,
        riskFreeRate: number,
        isCall: boolean
    ): number;
} 