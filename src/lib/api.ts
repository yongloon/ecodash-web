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
// Used if a specific function doesn't receive a valid or complete dateRange
// Defaulting to last 1 year for time series data.
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
    console.error(`[API FRED] Key missing for series ${seriesId}.`); 
    return []; 
  }

  const apiDefaults = getApiDefaultDateRange();
  let formattedStartDate = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate;
  let formattedEndDate = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;
  
  if (new Date(formattedStartDate) > new Date(formattedEndDate)) {
      console.warn(`[API FRED] Start date ${formattedStartDate} is after end date ${formattedEndDate} for ${seriesId}. Using default range.`);
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
  console.log(`[API FRED] Fetching: ${seriesId} (${formattedStartDate} to ${formattedEndDate})`);

  try {
    const response = await fetch(url, { next: { revalidate: 3600 * 6 } }); // Cache for 6 hours
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FRED API Error (${response.status}) for ${seriesId}: ${errorText.substring(0, 300)}`);
    }
    const data: FredResponse = await response.json();
    if (!data || !data.observations || !Array.isArray(data.observations)) {
        console.warn(`[API FRED] No valid observations array in response for ${seriesId}`);
        return [];
    }
    const seriesData = data.observations
      .map((obs: FredObservation): TimeSeriesDataPoint | null => {
        if (!obs.date || !isValid(parseISO(obs.date))) return null;
        const value = obs.value === '.' ? null : parseFloat(obs.value);
        if (value === null || isNaN(value)) return null;
        return { date: obs.date, value: value };
      })
      .filter((point): point is TimeSeriesDataPoint => point !== null);
    console.log(`[API FRED] Fetched ${seriesData.length} valid points for ${seriesId}`);
    return seriesData;
  } catch (error) {
    console.error(`[API FRED] Error fetching/processing for ${seriesId}:`, error);
    return [];
  }
}

// --- Alpha Vantage API Fetcher ---
export async function fetchAlphaVantageData(
  symbol: string,
  dateRange?: { startDate?: string; endDate?: string }
): Promise<TimeSeriesDataPoint[]> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) { 
    console.error(`[API AlphaVantage] Key missing for symbol ${symbol}.`); 
    return []; 
  }

  const apiDefaults = getApiDefaultDateRange();
  const effectiveStartDateStr = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate;
  const effectiveEndDateStr = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;
  
  let outputSize = 'compact'; 
  if (isValid(parseISO(effectiveStartDateStr)) && isValid(parseISO(effectiveEndDateStr))) {
      if (differenceInYears(parseISO(effectiveEndDateStr), parseISO(effectiveStartDateStr)) > 0.8) {
          outputSize = 'full';
      }
  }

  const params = new URLSearchParams({
    function: 'TIME_SERIES_DAILY_ADJUSTED',
    symbol: symbol,
    apikey: apiKey,
    outputsize: outputSize,
  });
  const url = `${ALPHA_VANTAGE_API_URL}?${params.toString()}`;
  console.log(`[API AlphaVantage] Fetching: ${symbol} (output: ${outputSize})`);

  try {
    const response = await fetch(url, { next: { revalidate: 3600 * 1 } }); // Cache for 1 hour
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ "Error Message": `HTTP Error ${response.status}` }));
      throw new Error(`Alpha Vantage API Error for ${symbol}: ${errorData["Error Message"] || response.statusText}`);
    }
    const data = await response.json();
    if (data["Error Message"]) throw new Error(`Alpha Vantage API Error for ${symbol}: ${data["Error Message"]}`);
    if (data["Note"]) console.warn(`[API AlphaVantage] Note for ${symbol}: ${data["Note"]}`);

    const timeSeriesKey = 'Time Series (Daily)';
    const timeSeries = data[timeSeriesKey];
    if (!timeSeries) { 
      console.warn(`[API AlphaVantage] No '${timeSeriesKey}' data in response for ${symbol}.`);
      return []; 
    }

    let seriesData: TimeSeriesDataPoint[] = Object.keys(timeSeries)
      .map(dateStr => {
        if (!isValid(parseISO(dateStr))) return null;
        const dayData = timeSeries[dateStr];
        const valueStr = dayData['5. adjusted close'] || dayData['4. close'];
        const value = parseFloat(valueStr);
        if (isNaN(value)) return null;
        return { date: dateStr, value: value };
      })
      .filter(dp => dp !== null) as TimeSeriesDataPoint[];
    seriesData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (isValid(parseISO(effectiveStartDateStr)) && isValid(parseISO(effectiveEndDateStr))) {
      const start = parseISO(effectiveStartDateStr);
      const end = parseISO(effectiveEndDateStr);
      seriesData = seriesData.filter(dp => {
        const current = parseISO(dp.date);
        return current >= start && current <= end;
      });
    }
    console.log(`[API AlphaVantage] Fetched ${seriesData.length} valid points for ${symbol}`);
    return seriesData;
  } catch (error) {
    console.error(`[API AlphaVantage] Error fetching/processing for ${symbol}:`, error);
    return [];
  }
}

// --- CoinGecko API Fetcher ---
export async function fetchCoinGeckoPriceHistory(
  coinId: string,
  dateRange?: { startDate?: string; endDate?: string }
): Promise<TimeSeriesDataPoint[]> {
  const apiDefaults = getApiDefaultDateRange(); // Default 1 year
  const startDateStr = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate;
  const endDateStr = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;

  let fromTimestamp = Math.floor(parseISO(startDateStr).getTime() / 1000);
  let toTimestamp = Math.floor(parseISO(endDateStr).getTime() / 1000) + (60 * 60 * 23); // Ensure end day included by API

  if (fromTimestamp > toTimestamp) { // Ensure correct order
      [fromTimestamp, toTimestamp] = [toTimestamp, fromTimestamp];
  }

  const vsCurrency = 'usd';
  const url = `${COINGECKO_API_URL}/coins/${coinId}/market_chart/range?vs_currency=${vsCurrency}&from=${fromTimestamp}&to=${toTimestamp}`;
  console.log(`[API CoinGecko] Fetching: ${coinId} (${startDateStr} to ${endDateStr})`);

  try {
    const response = await fetch(url, { next: { revalidate: 3600 * 1 } }); // Cache for 1 hour
    if (!response.ok) {
        const errorData = await response.json().catch(() => ({message: `HTTP ${response.status}`}));
        throw new Error(`CoinGecko API Error (${response.status}) for ${coinId}: ${errorData.message || response.statusText}`);
    }
    const data = await response.json();
    if (!data.prices || !Array.isArray(data.prices)) { 
        console.warn(`[API CoinGecko] No 'prices' array in response for ${coinId}.`);
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
  const apiDefaults = getApiDefaultDateRange(2); // Default to 2 years for F&G as it has decent history
  const startDateToConsider = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate;
  const endDateToConsider = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;
  
  let limit = 365 * 2; // Default days to fetch, API max is ~2 years
  const daysInRange = differenceInDays(parseISO(endDateToConsider), parseISO(startDateToConsider));
  if (daysInRange > 0) {
      limit = Math.min(daysInRange + 1, 365 * 5); // Cap limit by API capability
  } else if (daysInRange <=0) {
      limit = 30; // Fetch last 30 if range is problematic for limit calculation
  }

  const url = `${ALTERNATIVE_ME_API_URL}?limit=${limit}&format=json`;
  console.log(`[API AlternativeMe] Fetching F&G Index (limit: ${limit} days)`);

  try {
    const response = await fetch(url, { next: { revalidate: 3600 * 3 } }); // Cache for 3 hours
    if (!response.ok) { /* ... error handling ... */ }
    const data: AlternativeMeFngResponse = await response.json();
    if (data.metadata.error) throw new Error(`Alternative.me API Error: ${data.metadata.error}`);
    if (!data.data || !Array.isArray(data.data)) { /* ... warning ... */ return []; }

    let seriesData: TimeSeriesDataPoint[] = data.data.map(item => ({
      date: format(new Date(parseInt(item.timestamp) * 1000), 'yyyy-MM-dd'), // Timestamp is in seconds
      value: parseInt(item.value, 10),
    }));
    seriesData.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    if (isValid(parseISO(startDateToConsider))) {
        const startFilterDate = parseISO(startDateToConsider);
        seriesData = seriesData.filter(dp => isValid(parseISO(dp.date)) && parseISO(dp.date) >= startFilterDate);
    }
    if (isValid(parseISO(endDateToConsider))) {
        const endFilterDate = parseISO(endDateToConsider);
        seriesData = seriesData.filter(dp => isValid(parseISO(dp.date)) && parseISO(dp.date) <= endFilterDate);
    }
    console.log(`[API AlternativeMe] Fetched ${seriesData.length} points for F&G Index`);
    return seriesData;
  } catch (error) {
    console.error('[API AlternativeMe] Error fetching/processing F&G Index:', error);
    return [];
  }
}

// --- NewsAPI.org Fetcher ---
export interface NewsArticle { source: { id: string | null; name: string }; author: string | null; title: string; description: string | null; url: string; urlToImage: string | null; publishedAt: string; content: string | null; }
export interface NewsApiResponse { status: string; totalResults: number; articles: NewsArticle[]; message?: string; }
export async function fetchNewsHeadlines(category: string = 'business', country: string = 'us', pageSize: number = 10): Promise<NewsArticle[]> {
  const apiKey = process.env.NEWSAPI_ORG_KEY;
  if (!apiKey) { console.error("[API NewsAPI] Key missing."); return []; }

  const params = new URLSearchParams({ country, category, pageSize: pageSize.toString(), apiKey });
  const url = `${NEWSAPI_ORG_BASE_URL}/top-headlines?${params.toString()}`;
  console.log(`[API NewsAPI] Fetching: ${category} in ${country}`);
  try {
    const response = await fetch(url, { next: { revalidate: 3600 * 1 } }); // Cache for 1 hour
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: `HTTP Error ${response.status}`}));
      throw new Error(`NewsAPI.org Error (${response.status}): ${errorData.message || 'Failed to fetch news'}`);
    }
    const data: NewsApiResponse = await response.json();
    if (data.status !== 'ok') {
      console.warn(`[API NewsAPI] Status not 'ok': ${data.message || 'Unknown error'}`);
      return [];
    }
    return data.articles?.filter(article => article.title && article.url) || [];
  } catch (error) {
    console.error("[API NewsAPI] Error fetching news:", error);
    return [];
  }
}

// --- Finnhub Economic Calendar Fetcher ---
export interface EconomicEvent { actual: number | null; country: string; estimate: number | null; event: string; impact: string; prev: number | null; time: string; unit: string; calendarId?: string; } // Added calendarId
export interface EconomicCalendarResponse { economicCalendar: EconomicEvent[]; }
export async function fetchEconomicCalendar(daysAhead: number = 7): Promise<EconomicEvent[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) { console.error("[API Finnhub] Key missing for Economic Calendar."); return []; }
  const today = new Date();
  const fromDate = format(today, 'yyyy-MM-dd');
  const toDate = format(addDays(today, daysAhead), 'yyyy-MM-dd');
  const url = `${FINNHUB_API_URL}/calendar/economic?token=${apiKey}&from=${fromDate}&to=${toDate}`; // Removed country/impact filters for broader data
  console.log(`[API Finnhub] Fetching Economic Calendar (${fromDate} to ${toDate})`);
  try {
    const response = await fetch(url, { next: { revalidate: 3600 * 2 } });
    if (!response.ok) { /* ... error handling ... */ }
    const data: EconomicCalendarResponse = await response.json();
    if (!data.economicCalendar || !Array.isArray(data.economicCalendar)) { /* ... warning ... */ return []; }
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
  if (!apiKey) { console.error("[API Finnhub] Key missing for Earnings Calendar."); return []; }
  const today = new Date();
  const fromDate = format(today, 'yyyy-MM-dd');
  const toDate = format(addDays(today, daysAhead), 'yyyy-MM-dd');
  const url = `${FINNHUB_API_URL}/calendar/earnings?token=${apiKey}&from=${fromDate}&to=${toDate}`;
  console.log(`[API Finnhub] Fetching Earnings Calendar (${fromDate} to ${toDate})`);
  try { 
    const response = await fetch(url, { next: { revalidate: 3600 * 4 } });
    if (!response.ok) { /* ... error handling ... */ }
    const data: EarningsCalendarResponseFinnhub = await response.json();
    if (!data.earningsCalendar || !Array.isArray(data.earningsCalendar)) { /* ... warning ... */ return []; }
    return data.earningsCalendar
        .filter(event => event.symbol)
        .sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (error) {
    console.error("[API Finnhub] Error fetching Earnings Calendar:", error);
    return [];
  }
}