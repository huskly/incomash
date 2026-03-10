import { useEffect, useReducer, useRef } from 'react';

const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour
const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY as string;

interface CacheEntry {
  price: number;
  timestamp: number;
}

interface StockPriceState {
  symbol: string;
  price: number | null;
  loading: boolean;
  error: string | null;
}

type StockPriceAction =
  | { type: 'reset'; symbol: string }
  | { type: 'load'; symbol: string }
  | { type: 'success'; symbol: string; price: number }
  | { type: 'error'; symbol: string; error: string };

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

function createInitialState(symbol: string): StockPriceState {
  return {
    symbol,
    price: getCached(symbol),
    loading: false,
    error: null,
  };
}

function stockPriceReducer(
  state: StockPriceState,
  action: StockPriceAction
): StockPriceState {
  switch (action.type) {
    case 'reset':
      return createInitialState(action.symbol);
    case 'load':
      return {
        symbol: action.symbol,
        price: state.symbol === action.symbol ? state.price : getCached(action.symbol),
        loading: true,
        error: null,
      };
    case 'success':
      return {
        symbol: action.symbol,
        price: action.price,
        loading: false,
        error: null,
      };
    case 'error':
      return {
        symbol: action.symbol,
        price: state.symbol === action.symbol ? state.price : getCached(action.symbol),
        loading: false,
        error: action.error,
      };
    default:
      return state;
  }
}

export function useStockPrice(symbol: string, fallback: number) {
  const [state, dispatch] = useReducer(stockPriceReducer, symbol, createInitialState);
  const hasFetched = useRef(false);

  useEffect(() => {
    hasFetched.current = false;
    dispatch({ type: 'reset', symbol });
  }, [symbol]);

  useEffect(() => {
    if (!API_KEY || API_KEY === 'your_api_key_here') return;

    const cached = getCached(symbol);
    if (cached !== null) {
      return;
    }

    // Prevent StrictMode double-fetch
    if (hasFetched.current) return;
    hasFetched.current = true;

    dispatch({ type: 'load', symbol });

    fetchPrice(symbol)
      .then((p) => {
        setCache(symbol, p);
        dispatch({ type: 'success', symbol, price: p });
      })
      .catch((err) => {
        dispatch({ type: 'error', symbol, error: err.message });
        console.error(`Failed to fetch ${symbol} price:`, err);
      });
  }, [symbol]);

  return {
    price: state.symbol === symbol ? (state.price ?? fallback) : fallback,
    loading: state.symbol === symbol ? state.loading : false,
    error: state.symbol === symbol ? state.error : null,
  };
}
