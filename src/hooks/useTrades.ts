import { usePortfolio } from '../contexts/PortfolioContext';

export const useTrades = () => {
  const { addTransaction } = usePortfolio();
  return {
    addTrade: addTransaction,
  };
};
