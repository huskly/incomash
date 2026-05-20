import { fetchAlphaVantageJson, hasApiKey } from './alphaVantageClient';

const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  price: number;
  timestamp: number;
}

export { hasApiKey };

export function getCachedQuote(symbol: string): number | null {
  try {
    const raw = localStorage.getItem(`quote_${symbol}`);
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp < CACHE_DURATION_MS) {
      return entry.price;
    }
  } catch {
    // ignore
  }
  return null;
}

function setCache(symbol: string, price: number) {
  const entry: CacheEntry = { price, timestamp: Date.now() };
  localStorage.setItem(`quote_${symbol}`, JSON.stringify(entry));
}

const inflight = new Map<string, Promise<number>>();

export async function fetchQuote(symbol: string): Promise<number> {
  const cached = getCachedQuote(symbol);
  if (cached !== null) return cached;

  const existing = inflight.get(symbol);
  if (existing) return existing;

  const promise = (async () => {
    const data = await fetchAlphaVantageJson({ function: 'GLOBAL_QUOTE', symbol });
    const quote = data['Global Quote'];
    const rawPrice =
      quote && typeof quote === 'object' && !Array.isArray(quote)
        ? (quote as Record<string, unknown>)['05. price']
        : null;
    const price = typeof rawPrice === 'string' ? parseFloat(rawPrice) : NaN;
    if (isNaN(price)) {
      throw new Error(`No price returned for ${symbol}`);
    }
    setCache(symbol, price);
    return price;
  })();

  inflight.set(symbol, promise);
  void promise.then(
    () => inflight.delete(symbol),
    () => inflight.delete(symbol)
  );
  return promise;
}
