import { useMemo } from 'react';
import { usePortfolio } from '../contexts/PortfolioContext';

/**
 * Derives simple performance metrics from portfolio data.
 */
export function usePerformanceMetrics() {
  const { processedPortfolio } = usePortfolio();

  // Total realized P/L from the processed portfolio
  const totalPL = useMemo(() => {
    return processedPortfolio?.realizedPL ?? 0;
  }, [processedPortfolio]);

  // Placeholder success rate calculation. In a real app this would analyze
  // each closed trade to determine winners vs losers.
  const successRate = useMemo(() => {
    if (!processedPortfolio) return 0;
    return processedPortfolio.realizedPL > 0 ? 1 : 0;
  }, [processedPortfolio]);

  return { totalPL, successRate };
}
