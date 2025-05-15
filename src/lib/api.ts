// src/lib/api.ts
import { TimeSeriesDataPoint, FredResponse, FredObservation } from './indicators';
import {
    subYears,
    format,
    isValid,
    parseISO,
    differenceInYears,
    differenceInDays,
    addDays
} from 'date-fns';

// --- API Base URLs ---
const FRED_API_URL = 'https://api.stlouisfed.org/fred/series/observations';
const ALPHA_VANTAGE_API_URL = 'https://www.alphavantage.co/query';
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';
const ALTERNATIVE_ME_API_URL = 'https://api.alternative.me/fng/';
const NEWSAPI_ORG_BASE_URL = 'https://newsapi.org/v2';
const FINNHUB_API_URL = 'https://finnhub.io/api/v1';
const DBNOMICS_API_URL = 'https://api.db.nomics.world/v22/series'; // DB.nomics API URL

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
    console.error(`[API FRED] FRED_API_KEY is missing for series ${seriesId}.`);
    return [];
  }
  const apiDefaults = getApiDefaultDateRange();
  let formattedStartDate = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate;
  let formattedEndDate = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;
  if (new Date(formattedStartDate) > new Date(formattedEndDate)) {
      formattedStartDate = apiDefaults.startDate;
      formattedEndDate = apiDefaults.endDate;
  }
  const params = new URLSearchParams({ series_id: seriesId, api_key: apiKey, file_type: 'json', observation_start: formattedStartDate, observation_end: formattedEndDate });
  const url = `${FRED_API_URL}?${params.toString()}`;
  console.log(`[API FRED] Fetching: ${seriesId} (${formattedStartDate} to ${formattedEndDate})`);
  try {
    const response = await fetch(url, { next: { revalidate: 21600 } });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API FRED] Error response for ${seriesId}: ${response.status} - ${errorText.substring(0,500)}`);
      throw new Error(`FRED API Error (${response.status}) for ${seriesId}.`);
    }
    const data: FredResponse = await response.json();
    if (!data?.observations?.length) {
        console.warn(`[API FRED] No observations in response for ${seriesId}`);
        return [];
    }
    const seriesData = data.observations
      .map((obs: FredObservation): TimeSeriesDataPoint | null => {
        if (obs.value === '.' || !obs.date || !isValid(parseISO(obs.date))) return null;
        const value = parseFloat(obs.value);
        return isNaN(value) ? null : { date: obs.date, value };
      })
      .filter((p): p is TimeSeriesDataPoint => p !== null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    console.log(`[API FRED] Fetched ${seriesData.length} points for ${seriesId}`);
    return seriesData;
  } catch (error) {
    console.error(`[API FRED] Error for ${seriesId}:`, error);
    return [];
  }
}

// --- Alpha Vantage API Fetcher ---
export async function fetchAlphaVantageData(
  apiIdentifier: string,
  dateRange?: { startDate?: string; endDate?: string }
): Promise<TimeSeriesDataPoint[]> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) {
    console.error(`[API AlphaVantage] Key missing for ${apiIdentifier}.`);
    return [];
  }
  const apiDefaults = getApiDefaultDateRange();
  const effStart = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate;
  const effEnd = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;
  let params: URLSearchParams, dataKey: string, valKey: string;
  const isEcon = ['PMI', 'NMI'].includes(apiIdentifier.toUpperCase());
  if (isEcon) {
    params = new URLSearchParams({ function: apiIdentifier.toUpperCase(), apikey: apiKey });
    dataKey = 'data'; valKey = 'value';
    console.log(`[API AlphaVantage] Fetching econ: ${apiIdentifier.toUpperCase()}`);
  } else {
    let outSize = 'compact';
    if (isValid(parseISO(effStart)) && isValid(parseISO(effEnd)) && differenceInYears(parseISO(effEnd), parseISO(effStart)) >= 0.25) outSize = 'full';
    params = new URLSearchParams({ function: 'TIME_SERIES_DAILY_ADJUSTED', symbol: apiIdentifier, apikey: apiKey, outputsize: outSize });
    dataKey = 'Time Series (Daily)'; valKey = '5. adjusted close';
    console.log(`[API AlphaVantage] Fetching stock: ${apiIdentifier} (size: ${outSize})`);
  }
  const url = `${ALPHA_VANTAGE_API_URL}?${params.toString()}`;
  try {
    const res = await fetch(url, { next: { revalidate: 14400 } });
    if (!res.ok) {
      const errTxt = await res.text();
      console.error(`[API AlphaVantage] Error for ${apiIdentifier}: ${res.status} - ${errTxt.substring(0,500)}`);
      throw new Error(`Alpha Vantage Error (${res.status}) for ${apiIdentifier}.`);
    }
    const data = await res.json();
    if (data["Error Message"]) throw new Error(`Alpha Vantage API Error: ${data["Error Message"]}`);
    if (data["Note"] && !isEcon) console.warn(`[API AlphaVantage] Note for ${apiIdentifier}: ${data["Note"]}`);
    const tsObj = data[dataKey];
    if (!tsObj || (Array.isArray(tsObj) && !tsObj.length) || (typeof tsObj === 'object' && !Object.keys(tsObj).length)) {
      console.warn(`[API AlphaVantage] No data for ${apiIdentifier}.`); return [];
    }
    let series: TimeSeriesDataPoint[];
    if (Array.isArray(tsObj)) {
      series = (tsObj as Array<{ date: string; value: string }>)
        .map(item => {
          if (!item.date || !isValid(parseISO(item.date)) || item[valKey] === undefined) return null;
          const val = parseFloat(item[valKey]);
          return isNaN(val) ? null : { date: item.date, value: val };
        }).filter(dp => dp !== null) as TimeSeriesDataPoint[];
    } else {
      series = Object.keys(tsObj)
        .map(dateStr => {
          if (!isValid(parseISO(dateStr))) return null;
          const dayData = tsObj[dateStr];
          const valStr = dayData[valKey] || dayData['4. close'];
          if (valStr === undefined) return null;
          const val = parseFloat(valStr);
          return isNaN(val) ? null : { date: dateStr, value: val };
        }).filter(dp => dp !== null) as TimeSeriesDataPoint[];
    }
    series.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let filtered = series;
    if (isValid(parseISO(effStart))) filtered = filtered.filter(dp => parseISO(dp.date) >= parseISO(effStart));
    if (isValid(parseISO(effEnd))) filtered = filtered.filter(dp => parseISO(dp.date) <= parseISO(effEnd));
    console.log(`[API AlphaVantage] Fetched ${series.length} raw, ${filtered.length} filtered for ${apiIdentifier}`);
    return filtered;
  } catch (e) {
    console.error(`[API AlphaVantage] Error for ${apiIdentifier}:`, e); return [];
  }
}

// --- DB.nomics API Fetcher ---
interface DbNomicsSeriesObservation { period: string; value: number; }
interface DbNomicsSeriesData { series_code: string; period: string[]; value: (number | null)[]; }
interface DbNomicsResponse { series: DbNomicsSeriesData[]; message?: string; }

export async function fetchDbNomicsSeries(
  seriesCode: string, // e.g., "ISM/PMI/TOTAL.SA"
  dateRange?: { startDate?: string; endDate?: string }
): Promise<TimeSeriesDataPoint[]> {
  const apiDefaults = getApiDefaultDateRange();
  const startDate = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate;
  const endDate = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;

  const params = new URLSearchParams({ observations: '1', format: 'json' });
  // For single series, DB.nomics seems to return all data; filtering is done client-side after fetch.
  // Date params (start_date, end_date) are more effective with the /series?series_ids=... endpoint.
  const url = `${DBNOMICS_API_URL}/${seriesCode}?${params.toString()}`;
  console.log(`[API DB.nomics] Fetching: ${seriesCode} (will filter to range: ${startDate} - ${endDate})`);

  try {
    const response = await fetch(url, { next: { revalidate: 21600 } }); // Cache 6 hours
    if (!response.ok) {
      const errorBody = await response.text();
      let errMsg = `DB.nomics API Error (${response.status}) for ${seriesCode}.`;
      try {errMsg = JSON.parse(errorBody).message || errMsg;} catch(e){}
      console.error(`[API DB.nomics] Error for ${seriesCode}: ${response.status} - ${errorBody.substring(0,500)}`);
      throw new Error(errMsg);
    }
    const data: DbNomicsResponse = await response.json();
    if (data.message && data.message.toLowerCase().includes("error")) throw new Error(`DB.nomics API: ${data.message}`);
    if (!data.series?.[0]?.period || !data.series[0].value) {
      console.warn(`[API DB.nomics] Malformed/empty series for ${seriesCode}.`); return [];
    }
    const { period, value: values } = data.series[0];
    const timeSeries: TimeSeriesDataPoint[] = [];
    for (let i = 0; i < period.length; i++) {
      const val = values[i];
      if (period[i] && isValid(parseISO(period[i])) && val !== null && !isNaN(val)) {
        timeSeries.push({ date: period[i], value: parseFloat(val.toFixed(2)) });
      }
    }
    // Data usually comes sorted from DB.nomics for a single series.
    let filtered = timeSeries;
    if (isValid(parseISO(startDate))) filtered = filtered.filter(dp => parseISO(dp.date) >= parseISO(startDate));
    if (isValid(parseISO(endDate))) filtered = filtered.filter(dp => parseISO(dp.date) <= parseISO(endDate));
    console.log(`[API DB.nomics] Fetched ${timeSeries.length} raw, ${filtered.length} filtered for ${seriesCode}`);
    return filtered;
  } catch (error) {
    console.error(`[API DB.nomics] Error for ${seriesCode}:`, error); return [];
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
  let toTimestamp = Math.floor(parseISO(endDateStr).getTime() / 1000) + (60 * 60 * 23);
  if (fromTimestamp > toTimestamp) [fromTimestamp, toTimestamp] = [toTimestamp, fromTimestamp];
  const url = `${COINGECKO_API_URL}/coins/${coinId}/market_chart/range?vs_currency=usd&from=${fromTimestamp}&to=${toTimestamp}`;
  console.log(`[API CoinGecko] Fetching: ${coinId} (${startDateStr} to ${endDateStr})`);
  try {
    const response = await fetch(url, { next: { revalidate: 3600 } });
    if (!response.ok) {
      const errBody = await response.text(); let errMsg = `CoinGecko Error (${response.status}) for ${coinId}.`;
      try {errMsg = JSON.parse(errBody).error || errMsg;} catch(e){}
      console.error(`[API CoinGecko] Error for ${coinId}: ${response.status} - ${errBody.substring(0,500)}`);
      throw new Error(errMsg);
    }
    const data = await response.json();
    if (!data.prices?.length) { console.warn(`[API CoinGecko] No prices for ${coinId}.`); return []; }
    const dailyData: Record<string, TimeSeriesDataPoint> = {};
    data.prices.forEach((p: [number, number]) => {
      const date = format(new Date(p[0]), 'yyyy-MM-dd');
      dailyData[date] = { date, value: parseFloat(p[1].toFixed(2)) };
    });
    const uniqueDaily = Object.values(dailyData).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    console.log(`[API CoinGecko] Fetched ${uniqueDaily.length} points for ${coinId}`);
    return uniqueDaily;
  } catch (error) { console.error(`[API CoinGecko] Error for ${coinId}:`, error); return []; }
}

// --- Alternative.me Fear & Greed Index Fetcher ---
interface AlternativeMeFngValue { value: string; timestamp: string; value_classification: string; }
interface AlternativeMeFngResponse { name: string; data: AlternativeMeFngValue[]; metadata: { error: string | null; }; }
export async function fetchAlternativeMeFearGreedIndex(
  dateRange?: { startDate?: string; endDate?: string }
): Promise<TimeSeriesDataPoint[]> {
    const apiDefaults = getApiDefaultDateRange(5);
    const startConsider = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate;
    const endConsider = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;
    const daysToStart = Math.max(0, differenceInDays(new Date(), parseISO(startConsider)));
    const limit = Math.min(daysToStart + 1, 1825);
    const url = `${ALTERNATIVE_ME_API_URL}?limit=${limit}&format=json`;
    console.log(`[API AlternativeMe] Fetching F&G (limit: ${limit}, filter end: ${endConsider})`);
    try {
        const res = await fetch(url, { next: { revalidate: 10800 } });
        if (!res.ok) {
            const errTxt = await res.text();
            console.error(`[API AlternativeMe] F&G Error: ${res.status} - ${errTxt.substring(0,500)}`);
            throw new Error(`Alternative.me Error ${res.status}.`);
        }
        const data: AlternativeMeFngResponse = await res.json();
        if (data.metadata.error) throw new Error(`Alternative.me API Error: ${data.metadata.error}`);
        if (!data.data?.length) { console.warn(`[API AlternativeMe] No F&G data.`); return []; }
        let series: TimeSeriesDataPoint[] = data.data.map(item => ({
            date: format(new Date(parseInt(item.timestamp) * 1000), 'yyyy-MM-dd'),
            value: parseInt(item.value, 10),
        })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        if (isValid(parseISO(startConsider))) series = series.filter(dp => parseISO(dp.date) >= parseISO(startConsider));
        if (isValid(parseISO(endConsider))) series = series.filter(dp => parseISO(dp.date) <= parseISO(endConsider));
        console.log(`[API AlternativeMe] Fetched/filtered ${series.length} F&G points`);
        return series;
    } catch (e) { console.error('[API AlternativeMe] F&G Error:', e); return []; }
}

// --- NewsAPI.org Fetcher ---
export interface NewsArticle { source: { id: string | null; name: string }; author: string | null; title: string; description: string | null; url: string; urlToImage: string | null; publishedAt: string; content: string | null; }
export interface NewsApiResponse { status: string; totalResults: number; articles: NewsArticle[]; message?: string; code?: string; }
export async function fetchNewsHeadlines(category: string = 'business', country: string = 'us', pageSize: number = 10): Promise<NewsArticle[]> {
  const apiKey = process.env.NEWSAPI_ORG_KEY;
  if (!apiKey) { console.error("[API NewsAPI] Key missing."); return []; }
  const params = new URLSearchParams({ country, category, pageSize: pageSize.toString(), apiKey });
  const url = `${NEWSAPI_ORG_BASE_URL}/top-headlines?${params.toString()}`;
  console.log(`[API NewsAPI] Fetching: ${category} in ${country}`);
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      const errData: NewsApiResponse = await res.json().catch(() => ({ status: 'error', articles:[], message: `HTTP ${res.status}`}) as any);
      const errMsg = errData.message || errData.code || `NewsAPI Error (${res.status})`;
      console.error(`[API NewsAPI] Error for ${category}/${country}: ${errMsg}`);
      throw new Error(errMsg);
    }
    const data: NewsApiResponse = await res.json();
    if (data.status !== 'ok') {
      console.warn(`[API NewsAPI] Status not 'ok' for ${category}/${country}: ${data.message || data.code}`);
      if (['apiKeyDisabled', 'apiKeyInvalid', 'keyInvalid'].includes(data.code||'')) console.error("[API NewsAPI] Key issue.");
      return [];
    }
    return data.articles?.filter(a => a.title && a.url) || [];
  } catch (e) { console.error("[API NewsAPI] Error:", e); return []; }
}

// --- Finnhub Economic Calendar Fetcher ---
export interface EconomicEvent { actual: number | null; country: string; estimate: number | null; event: string; impact: string; prev: number | null; time: string; unit: string; calendarId?: string; }
export interface EconomicCalendarResponse { economicCalendar: EconomicEvent[]; }
export async function fetchEconomicCalendar(daysAhead: number = 7): Promise<EconomicEvent[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) { console.error("[API Finnhub] Key missing for Eco Calendar."); return []; }
  const from = format(new Date(), 'yyyy-MM-dd');
  const to = format(addDays(new Date(), daysAhead), 'yyyy-MM-dd');
  const url = `${FINNHUB_API_URL}/calendar/economic?token=${apiKey}&from=${from}&to=${to}`;
  console.log(`[API Finnhub] Fetching Eco Calendar (${from} to ${to})`);
  try {
    const res = await fetch(url, { next: { revalidate: 7200 } });
    if (!res.ok) {
      const errTxt = await res.text();
      console.error(`[API Finnhub] Eco Calendar Error ${res.status}: ${errTxt.substring(0,300)}`);
      throw new Error(`Finnhub Eco Calendar Error (${res.status}).`);
    }
    const data: EconomicCalendarResponse | { error?: string } = await res.json();
    if ('error' in data && data.error) throw new Error(`Finnhub Eco Calendar API: ${data.error}`);
    if (!('economicCalendar' in data) || !Array.isArray(data.economicCalendar)) {
        console.warn("[API Finnhub] No 'economicCalendar' array."); return [];
    }
    return data.economicCalendar.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  } catch (e) { console.error("[API Finnhub] Eco Calendar Error:", e); return []; }
}

// --- Finnhub Earnings Calendar Fetcher ---
export interface EarningsEvent { date: string; epsActual: number | null; epsEstimate: number | null; hour: string; quarter: number; revenueActual: number | null; revenueEstimate: number | null; symbol: string; year: number; }
export interface EarningsCalendarResponseFinnhub { earningsCalendar: EarningsEvent[]; }
export async function fetchEarningsCalendar(daysAhead: number = 7): Promise<EarningsEvent[]> {
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) { console.error("[API Finnhub] Key missing for Earnings Calendar."); return []; }
  const from = format(new Date(), 'yyyy-MM-dd');
  const to = format(addDays(new Date(), daysAhead), 'yyyy-MM-dd');
  const url = `${FINNHUB_API_URL}/calendar/earnings?token=${apiKey}&from=${from}&to=${to}`;
  console.log(`[API Finnhub] Fetching Earnings Calendar (${from} to ${to})`);
  try {
    const res = await fetch(url, { next: { revalidate: 14400 } });
    if (!res.ok) {
      const errTxt = await res.text();
      console.error(`[API Finnhub] Earnings Calendar Error ${res.status}: ${errTxt.substring(0,300)}`);
      throw new Error(`Finnhub Earnings Calendar Error (${res.status}).`);
    }
    const data: EarningsCalendarResponseFinnhub | { error?: string } = await res.json();
     if ('error' in data && data.error) throw new Error(`Finnhub Earnings Calendar API: ${data.error}`);
    if (!('earningsCalendar' in data) || !Array.isArray(data.earningsCalendar)) {
        console.warn("[API Finnhub] No 'earningsCalendar' array."); return [];
    }
    return data.earningsCalendar.filter(e => e.symbol).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (e) { console.error("[API Finnhub] Earnings Calendar Error:", e); return []; }
}