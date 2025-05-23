import { useState, useCallback } from 'react';
import { Trade } from '../types/trades';

export const TRADES_STORAGE_KEY = 'optionsPortfolio_trades';

export function useTrades() {
  const [trades, setTrades] = useState<Trade[]>(() => {
    try {
      const saved = localStorage.getItem(TRADES_STORAGE_KEY);
      return saved ? (JSON.parse(saved) as Trade[]) : [];
    } catch {
      return [];
    }
  });

  const saveToStorage = useCallback((items: Trade[]) => {
    try {
      localStorage.setItem(TRADES_STORAGE_KEY, JSON.stringify(items));
    } catch (err) {
      console.error('Failed to save trades', err);
    }
  }, []);

  const addTrade = useCallback(
    (trade: Omit<Trade, 'id'>) => {
      const newTrade: Trade = {
        ...trade,
        id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      };
      setTrades((prev) => {
        const next = [...prev, newTrade].sort(
          (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
        );
        saveToStorage(next);
        return next;
      });
    },
    [saveToStorage]
  );

  const updateTrade = useCallback(
    (id: string, changes: Partial<Trade>) => {
      setTrades((prev) => {
        const next = prev.map((t) => (t.id === id ? { ...t, ...changes } : t));
        saveToStorage(next);
        return next;
      });
    },
    [saveToStorage]
  );

  const deleteTrade = useCallback(
    (id: string) => {
      setTrades((prev) => {
        const next = prev.filter((t) => t.id !== id);
        saveToStorage(next);
        return next;
      });
    },
    [saveToStorage]
  );

  const loadFromStorage = useCallback((): Trade[] => {
    try {
      const saved = localStorage.getItem(TRADES_STORAGE_KEY);
      const parsed = saved ? (JSON.parse(saved) as Trade[]) : [];
      setTrades(parsed);
      return parsed;
    } catch {
      return [];
    }
  }, []);

  return { trades, addTrade, updateTrade, deleteTrade, loadFromStorage, saveToStorage };
}
