// src/lib/api.ts
import { TimeSeriesDataPoint, FredResponse, FredObservation } from './indicators';
import {
    subYears,
    format,
    isValid,
    parseISO,
    differenceInYears,
    differenceInDays,
    startOfMonth,
    endOfMonth,
    addDays
} from 'date-fns';

// --- API Base URLs ---
const FRED_API_URL = 'https://api.stlouisfed.org/fred/series/observations';
const ALPHA_VANTAGE_API_URL = 'https://www.alphavantage.co/query';
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';
const ALTERNATIVE_ME_API_URL = 'https://api.alternative.me/fng/';
const NEWSAPI_ORG_BASE_URL = 'https://newsapi.org/v2';
const FINNHUB_API_URL = 'https://finnhub.io/api/v1';


// --- Helper for Default API Fetch Date Range (Consistent) ---
function getApiDefaultDateRange(years: number = 1): { startDate: string; endDate: string } {
  const today = new Date();
  const pastDate = subYears(today, years);
  return {
    startDate: format(pastDate, 'yyyy-MM-dd'),
    endDate: format(today, 'yyyy-MM-dd')
  };
}

// --- FRED API Fetcher ---
export async function fetchFredSeries(
  seriesId: string,
  dateRange?: { startDate?: string; endDate?: string }
): Promise<TimeSeriesDataPoint[]> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    console.error(`[API FRED] FRED_API_KEY is missing for series ${seriesId}. Cannot fetch real data.`);
    return [];
  }

  const apiDefaults = getApiDefaultDateRange();
  let formattedStartDate = (dateRange?.startDate && isValid(parseISO(dateRange.startDate)))
    ? dateRange.startDate
    : apiDefaults.startDate;
  let formattedEndDate = (dateRange?.endDate && isValid(parseISO(dateRange.endDate)))
    ? dateRange.endDate
    : apiDefaults.endDate;

  if (new Date(formattedStartDate) > new Date(formattedEndDate)) {
      console.warn(`[API FRED] Start date ${formattedStartDate} is after end date ${formattedEndDate} for ${seriesId}. Correcting to default range.`);
      formattedStartDate = apiDefaults.startDate;
      formattedEndDate = apiDefaults.endDate;
  }

  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: 'json',
    observation_start: formattedStartDate,
    observation_end: formattedEndDate,
  });
  const url = `${FRED_API_URL}?${params.toString()}`;
  console.log(`[API FRED] Fetching: ${seriesId} (${formattedStartDate} to ${formattedEndDate}) from URL: ${url}`);

  try {
    const response = await fetch(url, { next: { revalidate: 21600 } }); // 6 hours
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API FRED] Error response for ${seriesId}: ${response.status} - ${errorText.substring(0,500)}`);
      throw new Error(`FRED API Error (${response.status}) for ${seriesId}: ${errorText.substring(0, 200)}`);
    }
    const data: FredResponse = await response.json();

    if (!data || !data.observations || !Array.isArray(data.observations)) {
        console.warn(`[API FRED] No valid observations array in response for ${seriesId}`);
        return [];
    }
    const seriesData = data.observations
      .map((obs: FredObservation): TimeSeriesDataPoint | null => {
        if (obs.value === '.' || obs.date === null || !isValid(parseISO(obs.date))) return null;
        const value = parseFloat(obs.value);
        if (isNaN(value)) return null;
        return { date: obs.date, value: value };
      })
      .filter((point): point is TimeSeriesDataPoint => point !== null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    console.log(`[API FRED] Fetched ${seriesData.length} valid points for ${seriesId}`);
    return seriesData;
  } catch (error) {
    console.error(`[API FRED] Network or parsing error fetching/processing for ${seriesId}:`, error);
    return [];
  }
}

// --- Alpha Vantage API Fetcher (Refined) ---
export async function fetchAlphaVantageData(
  apiIdentifier: string,
  dateRange?: { startDate?: string; endDate?: string }
): Promise<TimeSeriesDataPoint[]> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    console.error(`[API AlphaVantage] ALPHA_VANTAGE_API_KEY is missing. Cannot fetch for ${apiIdentifier}.`);
    return [];
  }

  const apiDefaults = getApiDefaultDateRange();
  const effectiveStartDateStr = (dateRange?.startDate && isValid(parseISO(dateRange.startDate)))
    ? dateRange.startDate
    : apiDefaults.startDate;
  const effectiveEndDateStr = (dateRange?.endDate && isValid(parseISO(dateRange.endDate)))
    ? dateRange.endDate
    : apiDefaults.endDate;

  let params: URLSearchParams;
  let dataKeyInResponse: string;
  let valueKeyInDataPoint: string;

  const isEconomicIndicator = ['PMI', 'NMI'].includes(apiIdentifier.toUpperCase());

  if (isEconomicIndicator) {
    params = new URLSearchParams({
      function: apiIdentifier.toUpperCase(),
      apikey: apiKey,
    });
    dataKeyInResponse = 'data';
    valueKeyInDataPoint = 'value';
    console.log(`[API AlphaVantage] Fetching economic indicator: ${apiIdentifier.toUpperCase()}`);
  } else {
    let outputSize = 'compact';
    if (isValid(parseISO(effectiveStartDateStr)) && isValid(parseISO(effectiveEndDateStr))) {
      if (differenceInYears(parseISO(effectiveEndDateStr), parseISO(effectiveStartDateStr)) >= 0.25) {
          outputSize = 'full';
      }
    }
    params = new URLSearchParams({
      function: 'TIME_SERIES_DAILY_ADJUSTED',
      symbol: apiIdentifier,
      apikey: apiKey,
      outputsize: outputSize,
    });
    dataKeyInResponse = 'Time Series (Daily)';
    valueKeyInDataPoint = '5. adjusted close';
    console.log(`[API AlphaVantage] Fetching stock: ${apiIdentifier} (output: ${outputSize})`);
  }

  const url = `${ALPHA_VANTAGE_API_URL}?${params.toString()}`;

  try {
    const response = await fetch(url, { next: { revalidate: 3600 * 4 } }); // Cache for 4 hours
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API AlphaVantage] Error response for ${apiIdentifier}: ${response.status} - ${errorText.substring(0,500)}`);
      throw new Error(`Alpha Vantage API Error (${response.status}) for ${apiIdentifier}: ${errorText.substring(0, 200)}`);
    }
    const data = await response.json();

    if (data["Error Message"]) {
      console.error(`[API AlphaVantage] API returned error for ${apiIdentifier}: ${data["Error Message"]}`);
      throw new Error(`Alpha Vantage API Error: ${data["Error Message"]}`);
    }
    if (data["Note"] && !isEconomicIndicator) {
      console.warn(`[API AlphaVantage] API Note for ${apiIdentifier}: ${data["Note"]}`);
    }

    const timeSeriesArrayOrObject = data[dataKeyInResponse];
    if (!timeSeriesArrayOrObject || (Array.isArray(timeSeriesArrayOrObject) && timeSeriesArrayOrObject.length === 0) || (typeof timeSeriesArrayOrObject === 'object' && Object.keys(timeSeriesArrayOrObject).length === 0) ) {
      console.warn(`[API AlphaVantage] No '${dataKeyInResponse}' data or empty data in response for ${apiIdentifier}. Response:`, JSON.stringify(data).substring(0,300));
      return [];
    }

    let seriesData: TimeSeriesDataPoint[];

    if (Array.isArray(timeSeriesArrayOrObject)) {
        seriesData = (timeSeriesArrayOrObject as Array<{ date: string; value: string }>)
          .map(item => {
            if (!item.date || !isValid(parseISO(item.date)) || item[valueKeyInDataPoint] === undefined) return null;
            const value = parseFloat(item[valueKeyInDataPoint]);
            if (isNaN(value)) return null;
            return { date: item.date, value };
          })
          .filter(dp => dp !== null) as TimeSeriesDataPoint[];
    } else {
        seriesData = Object.keys(timeSeriesArrayOrObject)
          .map(dateStr => {
            if (!isValid(parseISO(dateStr))) return null;
            const dayData = timeSeriesArrayOrObject[dateStr];
            const valueStr = dayData[valueKeyInDataPoint] || dayData['4. close'];
            if (valueStr === undefined) return null;
            const value = parseFloat(valueStr);
            if (isNaN(value)) return null;
            return { date: dateStr, value: value };
          })
          .filter(dp => dp !== null) as TimeSeriesDataPoint[];
    }

    seriesData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let filteredSeriesData = seriesData;
    if (isValid(parseISO(effectiveStartDateStr))) {
        const startFilter = parseISO(effectiveStartDateStr);
        filteredSeriesData = filteredSeriesData.filter(dp => parseISO(dp.date) >= startFilter);
    }
    if (isValid(parseISO(effectiveEndDateStr))) {
        const endFilter = parseISO(effectiveEndDateStr);
        filteredSeriesData = filteredSeriesData.filter(dp => parseISO(dp.date) <= endFilter);
    }

    console.log(`[API AlphaVantage] Fetched ${seriesData.length} raw points, ${filteredSeriesData.length} after date filtering for ${apiIdentifier}`);
    return filteredSeriesData;
  } catch (error)
{
    console.error(`[API AlphaVantage] Network or parsing error fetching/processing for ${apiIdentifier}:`, error);
    return [];
  }
}


// --- CoinGecko API Fetcher ---
export async function fetchCoinGeckoPriceHistory(
  coinId: string,
  dateRange?: { startDate?: string; endDate?: string }
): Promise<TimeSeriesDataPoint[]> {
  const apiDefaults = getApiDefaultDateRange();
  const startDateStr = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate;
  const endDateStr = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;

  let fromTimestamp = Math.floor(parseISO(startDateStr).getTime() / 1000);
  let toTimestamp = Math.floor(parseISO(endDateStr).getTime() / 1000) + (60 * 60 * 23); // Ensure end day included

  if (fromTimestamp > toTimestamp) [fromTimestamp, toTimestamp] = [toTimestamp, fromTimestamp];

  const vsCurrency = 'usd';
  const url = `${COINGECKO_API_URL}/coins/${coinId}/market_chart/range?vs_currency=${vsCurrency}&from=${fromTimestamp}&to=${toTimestamp}`;
  console.log(`[API CoinGecko] Fetching: ${coinId} (${startDateStr} to ${endDateStr})`);

  try {
    const response = await fetch(url, { next: { revalidate: 3600 * 1 } }); // Cache 1 hour
    if (!response.ok) {
        const errorBody = await response.text();
        console.error(`[API CoinGecko] Error response for ${coinId}: ${response.status} - ${errorBody.substring(0,500)}`);
        throw new Error(`CoinGecko API Error (${response.status}) for ${coinId}: ${errorBody.substring(0, 200)}`);
    }
    const data = await response.json();
    if (!data.prices || !Array.isArray(data.prices)) {
        console.warn(`[API CoinGecko] No 'prices' array in response for ${coinId}. Response:`, JSON.stringify(data).substring(0,300));
        return [];
    }
    const seriesData: TimeSeriesDataPoint[] = data.prices.map((pricePoint: [number, number]) => ({
      date: format(new Date(pricePoint[0]), 'yyyy-MM-dd'), // Timestamp is in ms
      value: parseFloat(pricePoint[1].toFixed(2)),
    }));

    const dailyData: Record<string, TimeSeriesDataPoint> = {};
    for (const point of seriesData) { dailyData[point.date] = point; } // De-duplicate, keeping last for date
    const uniqueDailyData = Object.values(dailyData).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log(`[API CoinGecko] Fetched ${uniqueDailyData.length} daily points for ${coinId}`);
    return uniqueDailyData;
  } catch (error) {
    console.error(`[API CoinGecko] Error fetching/processing for ${coinId}:`, error);
    return [];
  }
}

// --- Alternative.me Fear & Greed Index Fetcher ---
interface AlternativeMeFngValue { value: string; timestamp: string; value_classification: string; }
interface AlternativeMeFngResponse { name: string; data: AlternativeMeFngValue[]; metadata: { error: string | null; }; }
export async function fetchAlternativeMeFearGreedIndex(
  dateRange?: { startDate?: string; endDate?: string }
): Promise<TimeSeriesDataPoint[]> {
    const apiDefaults = getApiDefaultDateRange(5);
    const startDateToConsider = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate;
    const endDateToConsider = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;

    const daysFromTodayToStart = Math.max(0, differenceInDays(new Date(), parseISO(startDateToConsider)));
    const limit = Math.min(daysFromTodayToStart + 1, 1825);


    const url = `${ALTERNATIVE_ME_API_URL}?limit=${limit}&format=json`;
    console.log(`[API AlternativeMe] Fetching F&G Index (limit: ${limit} days for range ending ${endDateToConsider})`);

    try {
        const response = await fetch(url, { next: { revalidate: 3600 * 3 } }); // Cache 3 hours
        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[API AlternativeMe] Error response for F&G Index: ${response.status} - ${errorText.substring(0,500)}`);
            throw new Error(`Alternative.me API Error ${response.status}: ${errorText.substring(0, 200)}`);
        }
        const data: AlternativeMeFngResponse = await response.json();
        if (data.metadata.error) {
            console.error(`[API AlternativeMe] API returned error for F&G Index: ${data.metadata.error}`);
            throw new Error(`Alternative.me API Error: ${data.metadata.error}`);
        }
        if (!data.data || !Array.isArray(data.data)) {
            console.warn(`[API AlternativeMe] No 'data' array in response for F&G Index.`);
            return [];
        }

        let seriesData: TimeSeriesDataPoint[] = data.data.map(item => ({
        date: format(new Date(parseInt(item.timestamp) * 1000), 'yyyy-MM-dd'), // Timestamp is in seconds
        value: parseInt(item.value, 10),
        })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        if (isValid(parseISO(startDateToConsider))) {
            const startFilterDate = parseISO(startDateToConsider);
            seriesData = seriesData.filter(dp => isValid(parseISO(dp.date)) && parseISO(dp.date) >= startFilterDate);
        }
        if (isValid(parseISO(endDateToConsider))) {
            const endFilterDate = parseISO(endDateToConsider);
            seriesData = seriesData.filter(dp => isValid(parseISO(dp.date)) && parseISO(dp.date) <= endFilterDate);
        }
        console.log(`[API AlternativeMe] Fetched and filtered ${seriesData.length} points for F&G Index`);
        return seriesData;
    } catch (error) {
        console.error('[API AlternativeMe] Error fetching/processing F&G Index:', error);
        return [];
    }
}


// --- NewsAPI.org Fetcher ---
export interface NewsArticle { source: { id: string | null; name: string }; author: string | null; title: string; description: string | null; url: string; urlToImage: string | null; publishedAt: string; content: string | null; }
export interface NewsApiResponse { status: string; totalResults: number; articles: NewsArticle[]; message?: string; code?: string; }
export async function fetchNewsHeadlines(category: string = 'business', country: string = 'us', pageSize: number = 10): Promise<NewsArticle[]> {
  const apiKey = process.env.NEWSAPI_ORG_KEY;
  if (!apiKey) { console.error("[API NewsAPI] NEWSAPI_ORG_KEY is missing."); return []; }

  const params = new URLSearchParams({ country, category, pageSize: pageSize.toString(), apiKey });
  const url = `${NEWSAPI_ORG_BASE_URL}/top-headlines?${params.toString()}`;
  console.log(`[API NewsAPI] Fetching: ${category} in ${country}`);
  try {
    const response = await fetch(url, { next: { revalidate: 3600 * 1 } }); // Cache 1 hour
    if (!response.ok) {
      const errorData: NewsApiResponse = await response.json().catch(() => ({ status: 'error', totalResults: 0, articles:[], message: `HTTP Error ${response.status}`}));
      const errorMessage = errorData.message || errorData.code || `Failed to fetch news (${response.status})`;
      console.error(`[API NewsAPI] Error (${response.status}) for ${category}/${country}: ${errorMessage}`);
      throw new Error(`NewsAPI.org Error: ${errorMessage}`);
    }
    const data: NewsApiResponse = await response.json();
    if (data.status !== 'ok') {
      console.warn(`[API NewsAPI] Status not 'ok' for ${category}/${country}: ${data.message || data.code || 'Unknown API issue'}`);
      if (data.code === 'apiKeyDisabled' || data.code === 'apiKeyInvalid') {
          console.error("[API NewsAPI] NewsAPI key is disabled or invalid.");
      }
      return [];
    }
    return data.articles?.filter(article => article.title && article.url) || [];
  } catch (error) {
    console.error("[API NewsAPI] Network or parsing error fetching news:", error);
    return [];
  }
}

// --- Finnhub Economic Calendar Fetcher ---
export interface EconomicEvent { actual: number | null; country: string; estimate: number | null; event: string; impact: string; prev: number | null; time: string; unit: string; calendarId?: string; }
export interface EconomicCalendarResponse { economicCalendar: EconomicEvent[]; }
export async function fetchEconomicCalendar(daysAhead: number = 7): Promise<EconomicEvent[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) { console.error("[API Finnhub] FINNHUB_API_KEY missing for Economic Calendar."); return []; }

  const today = new Date();
  const fromDate = format(today, 'yyyy-MM-dd');
  const toDate = format(addDays(today, daysAhead), 'yyyy-MM-dd');
  const url = `${FINNHUB_API_URL}/calendar/economic?token=${apiKey}&from=${fromDate}&to=${toDate}`;
  console.log(`[API Finnhub] Fetching Economic Calendar (${fromDate} to ${toDate})`);
  try {
    const response = await fetch(url, { next: { revalidate: 3600 * 2 } }); // Cache 2 hours
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API Finnhub] Economic Calendar Error ${response.status}: ${errorText.substring(0,300)}`);
      throw new Error(`Finnhub Eco Calendar Error: ${response.statusText}`);
    }
    const data: EconomicCalendarResponse | { error?: string } = await response.json();
    if ('error' in data && data.error) {
        console.error(`[API Finnhub] Economic Calendar API returned error: ${data.error}`);
        throw new Error(`Finnhub Eco Calendar API: ${data.error}`);
    }
    if (!('economicCalendar' in data) || !Array.isArray(data.economicCalendar)) {
        console.warn("[API Finnhub] No 'economicCalendar' array in response.");
        return [];
    }
    return data.economicCalendar.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  } catch (error) {
    console.error("[API Finnhub] Error fetching Economic Calendar:", error);
    return [];
  }
}

// --- Finnhub Earnings Calendar Fetcher ---
export interface EarningsEvent { date: string; epsActual: number | null; epsEstimate: number | null; hour: string; quarter: number; revenueActual: number | null; revenueEstimate: number | null; symbol: string; year: number; }
export interface EarningsCalendarResponseFinnhub { earningsCalendar: EarningsEvent[]; }
export async function fetchEarningsCalendar(daysAhead: number = 7): Promise<EarningsEvent[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) { console.error("[API Finnhub] FINNHUB_API_KEY missing for Earnings Calendar."); return []; }

  const today = new Date();
  const fromDate = format(today, 'yyyy-MM-dd');
  const toDate = format(addDays(today, daysAhead), 'yyyy-MM-dd');
  const url = `${FINNHUB_API_URL}/calendar/earnings?token=${apiKey}&from=${fromDate}&to=${toDate}`;
  console.log(`[API Finnhub] Fetching Earnings Calendar (${fromDate} to ${toDate})`);
  try {
    const response = await fetch(url, { next: { revalidate: 3600 * 4 } }); // Cache 4 hours
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API Finnhub] Earnings Calendar Error ${response.status}: ${errorText.substring(0,300)}`);
      throw new Error(`Finnhub Earnings Calendar Error: ${response.statusText}`);
    }
    const data: EarningsCalendarResponseFinnhub | { error?: string } = await response.json();
     if ('error' in data && data.error) {
        console.error(`[API Finnhub] Earnings Calendar API returned error: ${data.error}`);
        throw new Error(`Finnhub Earnings Calendar API: ${data.error}`);
    }
    if (!('earningsCalendar' in data) || !Array.isArray(data.earningsCalendar)) {
        console.warn("[API Finnhub] No 'earningsCalendar' array in response.");
        return [];
    }
    return data.earningsCalendar
        .filter(event => event.symbol) // Ensure symbol exists
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (error) {
    console.error("[API Finnhub] Error fetching Earnings Calendar:", error);
    return [];
  }
}