export type PayoutFrequency = 'monthly' | 'quarterly' | 'semi-annual' | 'annual';

export type FieldSource = 'auto' | 'manual';

export interface Holding {
  id: string;
  symbol: string;
  shares: number;
  yieldPct: number | null;
  yieldSource: FieldSource;
  frequency: PayoutFrequency;
  frequencySource: FieldSource;
  lastFetched?: number;
}

export interface Portfolio {
  holdings: Holding[];
  costOfCapital: string;
}

const STORAGE_KEY = 'portfolio';

const EMPTY: Portfolio = { holdings: [], costOfCapital: '' };

export function loadPortfolio(): Portfolio {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY;
    const parsed = JSON.parse(raw) as Partial<Portfolio>;
    return {
      holdings: Array.isArray(parsed.holdings) ? parsed.holdings : [],
      costOfCapital: typeof parsed.costOfCapital === 'string' ? parsed.costOfCapital : '',
    };
  } catch {
    return EMPTY;
  }
}

export function savePortfolio(portfolio: Portfolio): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(portfolio));
  } catch {
    // ignore quota / disabled storage
  }
}

export function newHolding(): Holding {
  return {
    id: crypto.randomUUID(),
    symbol: '',
    shares: 0,
    yieldPct: null,
    yieldSource: 'auto',
    frequency: 'monthly',
    frequencySource: 'auto',
  };
}
