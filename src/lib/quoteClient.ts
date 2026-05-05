const CACHE_DURATION_MS = 60 * 60 * 1000; // 1 hour
const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY as string;

interface CacheEntry {
  price: number;
  timestamp: number;
}

export function hasApiKey(): boolean {
  return Boolean(API_KEY) && API_KEY !== 'your_api_key_here';
}

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
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    const price = parseFloat(data['Global Quote']?.['05. price']);
    if (isNaN(price)) {
      throw new Error(`No price returned for ${symbol}`);
    }
    setCache(symbol, price);
    return price;
  })();

  inflight.set(symbol, promise);
  promise.finally(() => inflight.delete(symbol));
  return promise;
}
