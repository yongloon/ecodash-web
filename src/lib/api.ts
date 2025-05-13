// src/lib/api.ts
import { TimeSeriesDataPoint, FredResponse, FredObservation } from './indicators'; // Ensure Fred types are here or imported
import { 
    subYears, 
    format, 
    isValid, 
    parseISO, 
    differenceInYears, 
    differenceInDays,
    startOfMonth, // For default date range consistency
    endOfMonth   // For default date range consistency
} from 'date-fns';

// --- API Base URLs ---
const FRED_API_URL = 'https://api.stlouisfed.org/fred/series/observations';
const ALPHA_VANTAGE_API_URL = 'https://www.alphavantage.co/query';
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';
const ALTERNATIVE_ME_API_URL = 'https://api.alternative.me/fng/';

// --- Helper for Default API Fetch Date Range (Consistent) ---
// Used if a specific function doesn't receive a valid or complete dateRange
function getApiDefaultDateRange(): { startDate: string; endDate: string } {
  const today = new Date();
  const oneYearAgo = subYears(today, 1); // Default to last 1 year
  return {
    startDate: format(oneYearAgo, 'yyyy-MM-dd'),
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
    console.error(`FRED API Key not found for series ${seriesId}.`);
    return [];
  }

  let formattedStartDate: string;
  let formattedEndDate: string;
  const apiDefaults = getApiDefaultDateRange();

  if (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) {
    formattedStartDate = dateRange.startDate;
  } else {
    formattedStartDate = apiDefaults.startDate;
    if (dateRange?.startDate) console.warn(`FRED ${seriesId}: Invalid start date, using default: ${formattedStartDate}`);
  }

  if (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) {
    formattedEndDate = dateRange.endDate;
  } else {
    formattedEndDate = apiDefaults.endDate;
    if (dateRange?.endDate) console.warn(`FRED ${seriesId}: Invalid end date, using default: ${formattedEndDate}`);
  }
  
  if (new Date(formattedStartDate) > new Date(formattedEndDate)) {
      console.warn(`FRED: Start date ${formattedStartDate} is after end date ${formattedEndDate} for ${seriesId}. Using default range instead.`);
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
  console.log(`Fetching FRED: ${seriesId} (${formattedStartDate} to ${formattedEndDate})`);

  try {
    const response = await fetch(url, { next: { revalidate: 3600 * 6 } }); // Cache for 6 hours
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FRED API Error (${response.status}) for ${seriesId}: ${errorText.substring(0, 200)}`);
    }
    const data: FredResponse = await response.json();
    if (!data || !data.observations) {
        console.warn(`No observations found in FRED response for ${seriesId}`);
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
    console.log(`Fetched ${seriesData.length} valid points from FRED for ${seriesId}`);
    return seriesData;
  } catch (error) {
    console.error(`Error fetching/processing FRED for ${seriesId}:`, error);
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
    console.error(`Alpha Vantage API Key not found for symbol ${symbol}.`);
    return [];
  }

  const apiDefaults = getApiDefaultDateRange();
  const effectiveStartDateStr = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate;
  const effectiveEndDateStr = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;
  
  let outputSize = 'compact'; // Default for shorter ranges or recent data
  if (isValid(parseISO(effectiveStartDateStr)) && isValid(parseISO(effectiveEndDateStr))) {
      if (differenceInYears(parseISO(effectiveEndDateStr), parseISO(effectiveStartDateStr)) > 0.8) {
          outputSize = 'full'; // Fetch more for longer ranges
      }
  }

  const params = new URLSearchParams({
    function: 'TIME_SERIES_DAILY_ADJUSTED',
    symbol: symbol,
    apikey: apiKey,
    outputsize: outputSize,
  });
  const url = `${ALPHA_VANTAGE_API_URL}?${params.toString()}`;
  console.log(`Fetching Alpha Vantage: ${symbol} (output: ${outputSize})`);

  try {
    const response = await fetch(url, { next: { revalidate: 3600 * 1 } }); // Cache for 1 hour
    if (!response.ok) { /* ... error handling ... */ }
    const data = await response.json();
    if (data["Error Message"]) throw new Error(`Alpha Vantage API Error for ${symbol}: ${data["Error Message"]}`);
    if (data["Note"]) console.warn(`Alpha Vantage Note for ${symbol}: ${data["Note"]}`);

    const timeSeriesKey = 'Time Series (Daily)';
    const timeSeries = data[timeSeriesKey];
    if (!timeSeries) { /* ... warning ... */ return []; }

    let seriesData: TimeSeriesDataPoint[] = Object.keys(timeSeries)
      .map(dateStr => { /* ... parsing logic ... */
        if (!isValid(parseISO(dateStr))) return null;
        const dayData = timeSeries[dateStr];
        const valueStr = dayData['5. adjusted close'] || dayData['4. close'];
        const value = parseFloat(valueStr);
        if (isNaN(value)) return null;
        return { date: dateStr, value: value };
      })
      .filter(dp => dp !== null) as TimeSeriesDataPoint[];
    seriesData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Filter by the effective date range AFTER fetching
    if (isValid(parseISO(effectiveStartDateStr)) && isValid(parseISO(effectiveEndDateStr))) {
      const start = parseISO(effectiveStartDateStr);
      const end = parseISO(effectiveEndDateStr);
      seriesData = seriesData.filter(dp => {
        const current = parseISO(dp.date);
        return current >= start && current <= end;
      });
    }
    console.log(`Fetched ${seriesData.length} valid points from Alpha Vantage for ${symbol}`);
    return seriesData;
  } catch (error) {
    console.error(`Error fetching/processing Alpha Vantage for ${symbol}:`, error);
    return [];
  }
}

// --- CoinGecko API Fetcher ---
export async function fetchCoinGeckoPriceHistory(
  coinId: string,
  dateRange?: { startDate?: string; endDate?: string }
): Promise<TimeSeriesDataPoint[]> {
  const apiDefaults = getApiDefaultDateRange();
  let fromTimestamp: number;
  let toTimestamp: number;

  const startDateStr = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate;
  const endDateStr = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;

  fromTimestamp = Math.floor(parseISO(startDateStr).getTime() / 1000);
  toTimestamp = Math.floor(parseISO(endDateStr).getTime() / 1000) + (60 * 60 * 23); // Ensure end day included

  if (fromTimestamp > toTimestamp) {
      [fromTimestamp, toTimestamp] = [toTimestamp, fromTimestamp];
  }

  const vsCurrency = 'usd';
  const url = `${COINGECKO_API_URL}/coins/${coinId}/market_chart/range?vs_currency=${vsCurrency}&from=${fromTimestamp}&to=${toTimestamp}`;
  console.log(`Fetching CoinGecko: ${coinId} (${startDateStr} to ${endDateStr})`);

  try {
    const response = await fetch(url, { next: { revalidate: 3600 * 1 } }); // Cache for 1 hour
    if (!response.ok) { /* ... error handling ... */ }
    const data = await response.json();
    if (!data.prices || !Array.isArray(data.prices)) { /* ... warning ... */ return []; }

    const seriesData: TimeSeriesDataPoint[] = data.prices.map((pricePoint: [number, number]) => ({
      date: format(new Date(pricePoint[0]), 'yyyy-MM-dd'),
      value: parseFloat(pricePoint[1].toFixed(2)),
    }));
    
    const dailyData: Record<string, TimeSeriesDataPoint> = {}; // De-duplicate to one point per day
    for (const point of seriesData) { dailyData[point.date] = point; }
    const uniqueDailyData = Object.values(dailyData).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    console.log(`Fetched ${uniqueDailyData.length} daily points from CoinGecko for ${coinId}`);
    return uniqueDailyData;
  } catch (error) {
    console.error(`Error fetching/processing CoinGecko for ${coinId}:`, error);
    return [];
  }
}

// --- Alternative.me Fear & Greed Index Fetcher ---
interface AlternativeMeFngValue { value: string; timestamp: string; /* ... */ }
interface AlternativeMeFngResponse { name: string; data: AlternativeMeFngValue[]; metadata: { error: string | null; }; }

export async function fetchAlternativeMeFearGreedIndex(
  dateRange?: { startDate?: string; endDate?: string }
): Promise<TimeSeriesDataPoint[]> {
  const apiDefaults = getApiDefaultDateRange();
  let limit = 365 * 2; // Default days to fetch

  const startDateToConsider = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate;
  const endDateToConsider = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;
  
  // Calculate limit based on the date range from present, as API fetches latest N days
  const daysToFetch = differenceInDays(parseISO(endDateToConsider), parseISO(startDateToConsider));
  if (daysToFetch > 0) {
      limit = Math.min(daysToFetch + 1, 365 * 5); // Cap at ~5 years for alternative.me
  } else { // If range is single day or invalid, fetch a small default
      limit = 30; // Fetch last 30 days if range is problematic
  }


  const url = `${ALTERNATIVE_ME_API_URL}?limit=${limit}&format=json`;
  console.log(`Fetching Alternative.me F&G Index (limit: ${limit} days)`);

  try {
    const response = await fetch(url, { next: { revalidate: 3600 * 3 } }); // Cache for 3 hours
    if (!response.ok) { /* ... error handling ... */ }
    const data: AlternativeMeFngResponse = await response.json();
    if (data.metadata.error) throw new Error(`Alternative.me API Error: ${data.metadata.error}`);
    if (!data.data || !Array.isArray(data.data)) { /* ... warning ... */ return []; }

    let seriesData: TimeSeriesDataPoint[] = data.data.map(item => ({
      date: format(new Date(parseInt(item.timestamp) * 1000), 'yyyy-MM-dd'),
      value: parseInt(item.value, 10),
    }));
    seriesData.sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Filter by the actual start and end date of the requested range
    if (isValid(parseISO(startDateToConsider))) {
        const startFilterDate = parseISO(startDateToConsider);
        seriesData = seriesData.filter(dp => parseISO(dp.date) >= startFilterDate);
    }
    if (isValid(parseISO(endDateToConsider))) { // This filtering is important as limit fetches latest N
        const endFilterDate = parseISO(endDateToConsider);
        seriesData = seriesData.filter(dp => parseISO(dp.date) <= endFilterDate);
    }

    console.log(`Fetched ${seriesData.length} points from Alternative.me F&G`);
    return seriesData;
  } catch (error) {
    console.error('Error fetching/processing Alternative.me F&G:', error);
    return [];
  }
}