import { useCallback, useEffect, useState } from 'react';
import {
  loadPortfolio,
  newHolding,
  savePortfolio,
  type Holding,
  type Portfolio,
} from '@/lib/portfolio';

export function usePortfolio() {
  const [portfolio, setPortfolio] = useState<Portfolio>(() => loadPortfolio());

  useEffect(() => {
    savePortfolio(portfolio);
  }, [portfolio]);

  const addHolding = useCallback(() => {
    setPortfolio((p) => ({ ...p, holdings: [...p.holdings, newHolding()] }));
  }, []);

  const updateHolding = useCallback((id: string, patch: Partial<Holding>) => {
    setPortfolio((p) => ({
      ...p,
      holdings: p.holdings.map((h) => (h.id === id ? { ...h, ...patch } : h)),
    }));
  }, []);

  const removeHolding = useCallback((id: string) => {
    setPortfolio((p) => ({ ...p, holdings: p.holdings.filter((h) => h.id !== id) }));
  }, []);

  const setCostOfCapital = useCallback((value: string) => {
    setPortfolio((p) => ({ ...p, costOfCapital: value }));
  }, []);

  return {
    holdings: portfolio.holdings,
    costOfCapital: portfolio.costOfCapital,
    addHolding,
    updateHolding,
    removeHolding,
    setCostOfCapital,
  };
}
