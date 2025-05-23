import { usePortfolio } from '../contexts/PortfolioContext';

/**
 * Simple hook returning the raw transaction log.
 */
export function useTrades() {
  const { transactionLog } = usePortfolio();
  return transactionLog;
}
