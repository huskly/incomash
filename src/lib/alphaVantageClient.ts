const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY as string;
const BASE_URL = 'https://www.alphavantage.co/query';
const MIN_REQUEST_INTERVAL_MS = 12_500;
const MAX_RATE_LIMIT_RETRIES = 1;

let requestQueue = Promise.resolve();
let nextRequestAt = 0;

export type AlphaVantageJson = Record<string, unknown>;

export function hasApiKey(): boolean {
  return Boolean(API_KEY) && API_KEY !== 'your_api_key_here';
}

function asJsonObject(data: unknown): AlphaVantageJson {
  if (data && typeof data === 'object' && !Array.isArray(data)) {
    return data as AlphaVantageJson;
  }
  return {};
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function getAlphaVantageMessage(data: AlphaVantageJson): string | null {
  const message = data.Note ?? data.Information ?? data['Error Message'];
  return typeof message === 'string' ? message : null;
}

function isRateLimitMessage(message: string): boolean {
  return /frequency|rate limit|standard api rate limit|calls per minute/i.test(message);
}

async function waitForRequestSlot(): Promise<void> {
  const now = Date.now();
  const waitMs = Math.max(0, nextRequestAt - now);
  if (waitMs > 0) {
    await sleep(waitMs);
  }
  nextRequestAt = Date.now() + MIN_REQUEST_INTERVAL_MS;
}

async function fetchJsonWithRetries(url: URL): Promise<AlphaVantageJson> {
  for (let attempt = 0; attempt <= MAX_RATE_LIMIT_RETRIES; attempt++) {
    await waitForRequestSlot();

    const res = await fetch(url);
    const data = asJsonObject(await res.json());
    const message = getAlphaVantageMessage(data);

    if (!message || !isRateLimitMessage(message) || attempt === MAX_RATE_LIMIT_RETRIES) {
      return data;
    }
  }

  return {};
}

export async function fetchAlphaVantageJson(
  params: Record<string, string>
): Promise<AlphaVantageJson> {
  const url = new URL(BASE_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set('apikey', API_KEY);

  const request = requestQueue.then(() => fetchJsonWithRetries(url));

  requestQueue = request.then(
    () => undefined,
    () => undefined
  );

  return request;
}
