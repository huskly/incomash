import { useEffect, useState } from 'react';
import type { Holding } from '@/lib/portfolio';
import { fetchQuote, getCachedQuote, hasApiKey } from '@/lib/quoteClient';

export interface PriceState {
  price: number | null;
  loading: boolean;
  error: string | null;
}

export type PriceMap = Record<string, PriceState>;

interface FetchEntry {
  price?: number;
  loading: boolean;
  error: string | null;
}

export function useHoldingPrices(holdings: Holding[]): PriceMap {
  const [fetched, setFetched] = useState<Record<string, FetchEntry>>({});

  const symbolsKey = holdings
    .map((h) => h.symbol.trim().toUpperCase())
    .filter(Boolean)
    .sort()
    .join(',');

  useEffect(() => {
    if (!symbolsKey || !hasApiKey()) return;
    const symbols = Array.from(new Set(symbolsKey.split(',')));
    let cancelled = false;

    const toFetch = symbols.filter((s) => getCachedQuote(s) === null);
    if (toFetch.length === 0) return;

    for (const s of toFetch) {
      fetchQuote(s)
        .then((price) => {
          if (cancelled) return;
          setFetched((prev) => ({ ...prev, [s]: { price, loading: false, error: null } }));
        })
        .catch((err: Error) => {
          if (cancelled) return;
          setFetched((prev) => ({
            ...prev,
            [s]: { ...prev[s], loading: false, error: err.message },
          }));
        });
    }

    return () => {
      cancelled = true;
    };
  }, [symbolsKey]);

  const result: PriceMap = {};
  for (const h of holdings) {
    const sym = h.symbol.trim().toUpperCase();
    if (!sym) {
      result[h.id] = { price: null, loading: false, error: null };
      continue;
    }
    const entry = fetched[sym];
    const cached = getCachedQuote(sym);
    result[h.id] = {
      price: entry?.price ?? cached,
      loading: entry?.loading ?? (cached === null && hasApiKey()),
      error: entry?.error ?? null,
    };
  }
  return result;
}
