import type { PayoutFrequency } from './portfolio';
import { hasApiKey } from './quoteClient';

const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24h
const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY as string;

export interface Fundamentals {
  yieldPct: number | null;
  frequency: PayoutFrequency | null;
}

interface CacheEntry extends Fundamentals {
  timestamp: number;
}

function cacheKey(symbol: string) {
  return `fundamentals_${symbol}`;
}

export function getCachedFundamentals(symbol: string): Fundamentals | null {
  try {
    const raw = localStorage.getItem(cacheKey(symbol));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp < CACHE_DURATION_MS) {
      return { yieldPct: entry.yieldPct, frequency: entry.frequency };
    }
  } catch {
    // ignore
  }
  return null;
}

function setCache(symbol: string, f: Fundamentals) {
  const entry: CacheEntry = { ...f, timestamp: Date.now() };
  localStorage.setItem(cacheKey(symbol), JSON.stringify(entry));
}

function inferFrequency(dates: string[]): PayoutFrequency | null {
  const sorted = dates
    .map((d) => Date.parse(d))
    .filter((t) => !isNaN(t))
    .sort((a, b) => b - a)
    .slice(0, 4);
  if (sorted.length < 2) return null;

  const gaps: number[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    gaps.push((sorted[i] - sorted[i + 1]) / (1000 * 60 * 60 * 24));
  }
  gaps.sort((a, b) => a - b);
  const median = gaps[Math.floor(gaps.length / 2)];

  if (median < 45) return 'monthly';
  if (median < 120) return 'quarterly';
  if (median < 240) return 'semi-annual';
  return 'annual';
}

async function fetchOverviewYield(symbol: string): Promise<number | null> {
  const url = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  const raw = data?.DividendYield;
  if (!raw || raw === 'None' || raw === '0' || raw === '-') return null;
  const num = parseFloat(raw);
  if (isNaN(num) || num <= 0) return null;
  // Alpha Vantage returns yield as a decimal (e.g. "0.0125" = 1.25%)
  return num * 100;
}

async function fetchDividendsFrequency(symbol: string): Promise<PayoutFrequency | null> {
  const url = `https://www.alphavantage.co/query?function=DIVIDENDS&symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  const records: Array<{ ex_dividend_date?: string }> = Array.isArray(data?.data) ? data.data : [];
  const dates = records.map((r) => r.ex_dividend_date ?? '').filter(Boolean);
  return inferFrequency(dates);
}

const inflight = new Map<string, Promise<Fundamentals>>();

export async function fetchFundamentals(symbol: string): Promise<Fundamentals> {
  if (!hasApiKey()) {
    return { yieldPct: null, frequency: null };
  }

  const cached = getCachedFundamentals(symbol);
  if (cached !== null) return cached;

  const existing = inflight.get(symbol);
  if (existing) return existing;

  const promise = (async () => {
    const [yieldPct, frequency] = await Promise.all([
      fetchOverviewYield(symbol).catch(() => null),
      fetchDividendsFrequency(symbol).catch(() => null),
    ]);
    const result: Fundamentals = { yieldPct, frequency };
    setCache(symbol, result);
    return result;
  })();

  inflight.set(symbol, promise);
  promise.finally(() => inflight.delete(symbol));
  return promise;
}
