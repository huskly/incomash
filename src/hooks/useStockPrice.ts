import { useState, useEffect, useRef } from 'react';

const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour
const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY as string;

interface CacheEntry {
  price: number;
  timestamp: number;
}

function getCached(symbol: string): number | null {
  try {
    const raw = localStorage.getItem(`quote_${symbol}`);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp < CACHE_DURATION_MS) {
      return entry.price;
    }
  } catch {
    // ignore corrupted cache
  }
  return null;
}

function setCache(symbol: string, price: number) {
  const entry: CacheEntry = { price, timestamp: Date.now() };
  localStorage.setItem(`quote_${symbol}`, JSON.stringify(entry));
}

// Module-level in-flight promise map to deduplicate concurrent fetches
const inflightRequests = new Map<string, Promise<number>>();

async function fetchPrice(symbol: string): Promise<number> {
  const existing = inflightRequests.get(symbol);
  if (existing) return existing;

  const promise = (async () => {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    const price = parseFloat(data['Global Quote']?.['05. price']);
    if (isNaN(price)) {
      throw new Error(`No price returned for ${symbol}: ${JSON.stringify(data)}`);
    }
    return price;
  })();

  inflightRequests.set(symbol, promise);
  promise.finally(() => inflightRequests.delete(symbol));

  return promise;
}

export function useStockPrice(symbol: string, fallback: number) {
  const [price, setPrice] = useState<number>(() => getCached(symbol) ?? fallback);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  useEffect(() => {
    if (!API_KEY || API_KEY === 'your_api_key_here') return;

    const cached = getCached(symbol);
    if (cached !== null) {
      setPrice(cached);
      return;
    }

    // Prevent StrictMode double-fetch
    if (hasFetched.current) return;
    hasFetched.current = true;

    setLoading(true);
    setError(null);

    fetchPrice(symbol)
      .then((p) => {
        setPrice(p);
        setCache(symbol, p);
      })
      .catch((err) => {
        setError(err.message);
        console.error(`Failed to fetch ${symbol} price:`, err);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [symbol]);

  return { price, loading, error };
}
