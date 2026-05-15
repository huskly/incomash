const API_KEY = import.meta.env.VITE_ALPHA_VANTAGE_API_KEY as string;
const BASE_URL = 'https://www.alphavantage.co/query';

let requestQueue = Promise.resolve();

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

export async function fetchAlphaVantageJson(
  params: Record<string, string>
): Promise<AlphaVantageJson> {
  const url = new URL(BASE_URL);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set('apikey', API_KEY);

  const request = requestQueue.then(async () => {
    const res = await fetch(url);
    return asJsonObject(await res.json());
  });

  requestQueue = request.then(
    () => undefined,
    () => undefined
  );

  return request;
}
