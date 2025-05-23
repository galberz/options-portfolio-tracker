/* eslint-disable react-refresh/only-export-components */
import React, { createContext, ReactNode, useContext, useMemo } from 'react';
import { Trade, ProcessedPortfolio } from '../types/trades';
import { OptionPosition, SharePosition } from '../types/portfolio';
import { useTrades } from '../hooks/useTrades';

interface PortfolioContextType {
  trades: Trade[];
  processedPortfolio: ProcessedPortfolio;
  addTrade: (trade: Omit<Trade, 'id'>) => void;
  updateTrade: (id: string, changes: Partial<Trade>) => void;
  deleteTrade: (id: string) => void;
}

const PortfolioContext = createContext<PortfolioContextType | undefined>(undefined);

export const PortfolioProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { trades, addTrade, updateTrade, deleteTrade } = useTrades();

  const processedPortfolio = useMemo<ProcessedPortfolio>(() => {
    const openShares: SharePosition[] = [];
    const openOptions: OptionPosition[] = [];
    return { openShares, openOptions, realizedPL: 0, transactionLog: trades };
  }, [trades]);

  return (
    <PortfolioContext.Provider value={{ trades, addTrade, updateTrade, deleteTrade, processedPortfolio }}>
      {children}
    </PortfolioContext.Provider>
  );
};

export const usePortfolio = (): PortfolioContextType => {
  const ctx = useContext(PortfolioContext);
  if (!ctx) {
    throw new Error('usePortfolio must be used within a PortfolioProvider');
  }
  return ctx;
};

