declare module 'black-scholes-js' {
    export class BlackScholes {
        constructor(stock: string, strike: number, time: number, riskFree: number, deviation: number, type: 'call' | 'put');
        calculate(): number;
    }
} 