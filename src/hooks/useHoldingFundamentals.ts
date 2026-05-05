import { useEffect, useLayoutEffect, useRef } from 'react';
import type { Holding, PayoutFrequency } from '@/lib/portfolio';
import { fetchFundamentals, getCachedFundamentals } from '@/lib/fundamentalsClient';

interface Options {
  holdings: Holding[];
  updateHolding: (id: string, patch: Partial<Holding>) => void;
}

export function useHoldingFundamentals({ holdings, updateHolding }: Options): void {
  const updateRef = useRef(updateHolding);
  const holdingsRef = useRef(holdings);

  useLayoutEffect(() => {
    updateRef.current = updateHolding;
    holdingsRef.current = holdings;
  });

  const symbolsKey = holdings
    .map((h) => h.symbol.trim().toUpperCase())
    .filter(Boolean)
    .sort()
    .join(',');

  useEffect(() => {
    if (!symbolsKey) return;
    const symbols = Array.from(new Set(symbolsKey.split(',')));
    let cancelled = false;

    for (const symbol of symbols) {
      const apply = (yieldPct: number | null, frequency: PayoutFrequency | null) => {
        const matches = holdingsRef.current.filter((h) => h.symbol.trim().toUpperCase() === symbol);
        for (const h of matches) {
          const patch: Partial<Holding> = {};
          if (h.yieldSource === 'auto' && yieldPct !== null) {
            patch.yieldPct = yieldPct;
          }
          if (h.frequencySource === 'auto' && frequency !== null) {
            patch.frequency = frequency;
          }
          if (Object.keys(patch).length > 0) {
            patch.lastFetched = Date.now();
            updateRef.current(h.id, patch);
          }
        }
      };

      const cached = getCachedFundamentals(symbol);
      if (cached) {
        apply(cached.yieldPct, cached.frequency);
        continue;
      }

      fetchFundamentals(symbol)
        .then((f) => {
          if (cancelled) return;
          apply(f.yieldPct, f.frequency);
        })
        .catch(() => {
          // ignore — manual entry remains available
        });
    }

    return () => {
      cancelled = true;
    };
  }, [symbolsKey]);
}
