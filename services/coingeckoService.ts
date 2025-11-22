import { CryptoData, MarketChartData } from '../types';

const BASE_URL = 'https://api.coingecko.com/api/v3';
const API_KEY = 'CG-oYUT41zxbzrafA4xrKMPp1vw';

// Helper to add a small random delay to prevent synchronized polling spikes
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Basic wrapper for fetch with error handling
async function fetchAPI<T>(endpoint: string): Promise<T> {
  // Remove custom headers to reduce preflight checks and CORS issues
  const options = {
    method: 'GET',
  };

  try {
    // Append API key to URL query params to authenticate and avoid CORS issues with custom headers
    const hasQuery = endpoint.includes('?');
    const separator = hasQuery ? '&' : '?';
    const url = `${BASE_URL}${endpoint}${separator}x_cg_demo_api_key=${API_KEY}`;

    const response = await fetch(url, options);
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Rate Limit Exceeded");
      }
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error: any) {
    // Handle specific fetch errors
    if (error instanceof TypeError && error.message === 'Failed to fetch') {
      // This is often a CORS error or network block
      throw new Error("Network Error");
    }
    throw error;
  }
}

export const getCoinData = async (coinId: string): Promise<CryptoData> => {
  // Add a small random jitter delay (0-500ms) to distribute load
  await delay(Math.random() * 500);
  const data = await fetchAPI<CryptoData[]>(`/coins/markets?vs_currency=usd&ids=${coinId}&order=market_cap_desc&per_page=1&page=1&sparkline=false`);
  if (data.length === 0) throw new Error("Coin not found");
  return data[0];
};

export const getMarketChart = async (coinId: string, days: number = 1): Promise<MarketChartData> => {
  return fetchAPI<MarketChartData>(`/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`);
};

export const searchCoins = async (query: string): Promise<{ id: string; symbol: string; name: string }[]> => {
  const data = await fetchAPI<{ coins: { id: string; symbol: string; name: string }[] }>(`/search?query=${query}`);
  return data.coins.slice(0, 5); // Limit to 5 results
};
