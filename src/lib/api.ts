// src/lib/api.ts
import { TimeSeriesDataPoint, FredResponse, FredObservation } from './indicators'; // Ensure Fred types are correctly defined or adjust if not needed by all functions
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
const DBNOMICS_API_URL_V22 = 'https://api.db.nomics.world/v22';

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
  console.log(`[fetchFredSeries API - ENTRY] Called with: seriesId=${seriesId}, dateRange=${JSON.stringify(dateRange)}`);
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
  console.log(`[API FRED] Attempting to fetch: ${seriesId} (${formattedStartDate} to ${formattedEndDate}) from URL: ${url.replace(apiKey, "REDACTED_KEY")}`);

  try {
    const response = await fetch(url, { next: { revalidate: 21600 } }); // 6 hours
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API FRED] Error response for ${seriesId}: ${response.status} - ${errorText.substring(0,500)}`);
      throw new Error(`FRED API Error (${response.status}) for ${seriesId}.`);
    }
    const data: FredResponse = await response.json();
    console.log(`[API FRED] Raw response for ${seriesId}:`, JSON.stringify(data).substring(0, 500));


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
    console.log(`[API FRED] Parsed ${seriesData.length} valid points for ${seriesId}`);
    return seriesData;
  } catch (error) {
    console.error(`[API FRED] Network or parsing error for ${seriesId}:`, error);
    return [];
  }
}

// --- Alpha Vantage API Fetcher ---
export async function fetchAlphaVantageData(
  apiIdentifier: string,
  dateRange?: { startDate?: string; endDate?: string }
): Promise<TimeSeriesDataPoint[]> {
  console.log(`[fetchAlphaVantageData API - ENTRY] Called with: apiIdentifier=${apiIdentifier}, dateRange=${JSON.stringify(dateRange)}`);
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
  const isKnownEconomicFunction = ['PMI', 'NMI'].includes(apiIdentifier.toUpperCase()) && false; // Disabled direct PMI/NMI calls for now

  if (isKnownEconomicFunction) {
    params = new URLSearchParams({ function: apiIdentifier.toUpperCase(), apikey: apiKey });
    dataKeyInResponse = 'data'; valueKeyInDataPoint = 'value';
    console.log(`[API AlphaVantage] Fetching economic indicator: ${apiIdentifier.toUpperCase()}`);
  } else {
    let outputSize = 'compact';
    if (isValid(parseISO(effectiveStartDateStr)) && isValid(parseISO(effectiveEndDateStr))) {
      if (differenceInDays(parseISO(effectiveEndDateStr), parseISO(effectiveStartDateStr)) > 90) outputSize = 'full';
    }
    params = new URLSearchParams({ function: 'TIME_SERIES_DAILY_ADJUSTED', symbol: apiIdentifier, apikey: apiKey, outputsize: outputSize });
    dataKeyInResponse = 'Time Series (Daily)'; valueKeyInDataPoint = '5. adjusted close';
    console.log(`[API AlphaVantage] Fetching stock/ETF: ${apiIdentifier} (output: ${outputSize})`);
  }
  const url = `${ALPHA_VANTAGE_API_URL}?${params.toString()}`;
  console.log(`[API AlphaVantage] Attempting to fetch: ${url.replace(apiKey, "REDACTED_KEY")}`);

  try {
    const response = await fetch(url, { next: { revalidate: 14400 } }); // Cache 4 hours
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API AlphaVantage] Error response for ${apiIdentifier}: ${response.status} - ${errorText.substring(0,500)}`);
      throw new Error(`Alpha Vantage API Error (${response.status}) for ${apiIdentifier}.`);
    }
    const data = await response.json();
    console.log(`[API AlphaVantage] Raw response for ${apiIdentifier}:`, JSON.stringify(data).substring(0, 500));

    if (data["Error Message"]) {
      console.error(`[API AlphaVantage] API returned error for ${apiIdentifier}: ${data["Error Message"]}`);
      throw new Error(`Alpha Vantage API Error: ${data["Error Message"]}`);
    }
    if (data["Note"]) console.warn(`[API AlphaVantage] API Note for ${apiIdentifier}: ${data["Note"]}.`);

    const timeSeriesArrayOrObject = data[dataKeyInResponse];
    if (!timeSeriesArrayOrObject || (Array.isArray(timeSeriesArrayOrObject) && timeSeriesArrayOrObject.length === 0) || (typeof timeSeriesArrayOrObject === 'object' && Object.keys(timeSeriesArrayOrObject).length === 0) ) {
      console.warn(`[API AlphaVantage] No '${dataKeyInResponse}' data or empty data in response for ${apiIdentifier}.`);
      return [];
    }
    let seriesData: TimeSeriesDataPoint[];
    if (Array.isArray(timeSeriesArrayOrObject)) { // Should not be hit if isKnownEconomicFunction is false
        seriesData = (timeSeriesArrayOrObject as Array<{ date: string; value: string }>)
          .map(item => {
            if (!item.date || !isValid(parseISO(item.date)) || item[valueKeyInDataPoint] === undefined) return null;
            const value = parseFloat(item[valueKeyInDataPoint]);
            return isNaN(value) ? null : { date: item.date, value };
          }).filter(dp => dp !== null) as TimeSeriesDataPoint[];
    } else {
        seriesData = Object.keys(timeSeriesArrayOrObject)
          .map(dateStr => {
            if (!isValid(parseISO(dateStr))) return null;
            const dayData = timeSeriesArrayOrObject[dateStr];
            const valueStr = dayData[valueKeyInDataPoint] || dayData['4. close'];
            if (valueStr === undefined) return null;
            const value = parseFloat(valueStr);
            return isNaN(value) ? null : { date: dateStr, value: value };
          }).filter(dp => dp !== null) as TimeSeriesDataPoint[];
    }
    seriesData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let filteredSeriesData = seriesData;
    if (isValid(parseISO(effectiveStartDateStr))) filteredSeriesData = filteredSeriesData.filter(dp => parseISO(dp.date) >= parseISO(effectiveStartDateStr));
    if (isValid(parseISO(effectiveEndDateStr))) filteredSeriesData = filteredSeriesData.filter(dp => parseISO(dp.date) <= parseISO(effectiveEndDateStr));
    console.log(`[API AlphaVantage] Parsed ${seriesData.length} raw points, ${filteredSeriesData.length} after date filtering for ${apiIdentifier}`);
    return filteredSeriesData;
  } catch (error) {
    console.error(`[API AlphaVantage] Network or parsing error for ${apiIdentifier}:`, error);
    return [];
  }
}

// --- DB.nomics API Fetcher ---
interface DbNomicsSeriesData { series_code: string; period: string[]; value: (number | null)[]; }
interface DbNomicsResponse { series: DbNomicsSeriesData[]; docs?: any; message?: string; }

export async function fetchDbNomicsSeries(
  fullSeriesCode: string,
  dateRange?: { startDate?: string; endDate?: string }
): Promise<TimeSeriesDataPoint[]> {
  console.log(`[fetchDbNomicsSeries API - ENTRY] Called with: seriesCode=${fullSeriesCode}, dateRange=${JSON.stringify(dateRange)}`);
  const apiDefaults = getApiDefaultDateRange();
  const startDate = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate;
  const endDate = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;

  const params = new URLSearchParams({ series_ids: fullSeriesCode, observations: '1', format: 'json', start_period: startDate, end_period: endDate });
  const url = `${DBNOMICS_API_URL_V22}/series?${params.toString()}`;
  console.log(`[API DB.nomics] Attempting to fetch: ${fullSeriesCode} (Range: ${startDate} to ${endDate}) from URL: ${url}`);

  try {
    const response = await fetch(url, { next: { revalidate: 21600 } });
    if (!response.ok) {
      const errorBody = await response.text(); let errMsg = `DB.nomics API Error (${response.status}) for ${fullSeriesCode}.`;
      try { const errorJson = JSON.parse(errorBody); if (errorJson.message) errMsg = `DB.nomics: ${errorJson.message}`; else if (errorJson.errors?.[0]?.message) errMsg = `DB.nomics: ${errorJson.errors[0].message}`; else if (errorJson.detail) errMsg = `DB.nomics: ${errorJson.detail}`; } catch (e) {}
      console.error(`[API DB.nomics] Error response for ${fullSeriesCode}: ${response.status} - Body: ${errorBody.substring(0, 500)}`);
      throw new Error(errMsg);
    }
    const data: DbNomicsResponse = await response.json();
    console.log(`[API DB.nomics] Raw response for ${fullSeriesCode}:`, JSON.stringify(data).substring(0, 500));
    if (data.message?.toLowerCase().includes("error")) throw new Error(`DB.nomics API Error: ${data.message}`);
    if (data.docs?.series_count === 0 && data.series?.length === 0) { console.warn(`[API DB.nomics] No series found for ${fullSeriesCode}.`); return []; }
    if (!data.series?.length) { console.warn(`[API DB.nomics] No 'series' data for ${fullSeriesCode}.`); return []; }

    const seriesObject = data.series.find(s => s.series_code === fullSeriesCode);
    if (!seriesObject?.period || !seriesObject.value) {
        console.warn(`[API DB.nomics] Series ${fullSeriesCode} malformed. Available: ${data.series.map(s => s.series_code).join(', ')}`); return [];
    }
    const timeSeries: TimeSeriesDataPoint[] = [];
    for (let i = 0; i < seriesObject.period.length; i++) {
      const val = seriesObject.value[i];
      if (seriesObject.period[i] && isValid(parseISO(seriesObject.period[i])) && val !== null && !isNaN(val)) {
        timeSeries.push({ date: seriesObject.period[i], value: parseFloat(val.toFixed(2)) });
      }
    }
    // Data should be filtered by API if start_period/end_period are respected.
    console.log(`[API DB.nomics] Parsed ${timeSeries.length} points for ${fullSeriesCode}`);
    return timeSeries;
  } catch (error) { console.error(`[API DB.nomics] Error for ${fullSeriesCode}:`, error); return []; }
}

// --- CoinGecko API Fetcher ---
export async function fetchCoinGeckoPriceHistory(
  coinId: string,
  dateRange?: { startDate?: string; endDate?: string }
): Promise<TimeSeriesDataPoint[]> {
  console.log(`[fetchCoinGeckoPriceHistory API - ENTRY] Called with: coinId=${coinId}, dateRange=${JSON.stringify(dateRange)}`);
  const apiDefaults = getApiDefaultDateRange();
  const startDateStr = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate;
  const endDateStr = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;
  let fromTimestamp = Math.floor(parseISO(startDateStr).getTime() / 1000);
  let toTimestamp = Math.floor(parseISO(endDateStr).getTime() / 1000) + (60 * 60 * 23);
  if (fromTimestamp > toTimestamp) [fromTimestamp, toTimestamp] = [toTimestamp, fromTimestamp];
  const url = `${COINGECKO_API_URL}/coins/${coinId}/market_chart/range?vs_currency=usd&from=${fromTimestamp}&to=${toTimestamp}`;
  console.log(`[API CoinGecko] Attempting to fetch: ${coinId} (${startDateStr} to ${endDateStr}) from URL: ${url}`);
  try {
    const response = await fetch(url, { next: { revalidate: 3600 } });
    if (!response.ok) {
      const errBody = await response.text(); let errMsg = `CoinGecko Error (${response.status}) for ${coinId}.`;
      try {errMsg = JSON.parse(errBody).error?.message || JSON.parse(errBody).error || errMsg;} catch(e){} // CoinGecko error can be {error: {message: "..."}} or {error: "..."}
      console.error(`[API CoinGecko] Error for ${coinId}: ${response.status} - ${errBody.substring(0,500)}`);
      throw new Error(errMsg);
    }
    const data = await response.json();
    console.log(`[API CoinGecko] Raw response for ${coinId}:`, JSON.stringify(data).substring(0, 500));
    if (!data.prices?.length) { console.warn(`[API CoinGecko] No prices for ${coinId}.`); return []; }
    const dailyData: Record<string, TimeSeriesDataPoint> = {};
    data.prices.forEach((p: [number, number]) => {
      const date = format(new Date(p[0]), 'yyyy-MM-dd');
      dailyData[date] = { date, value: parseFloat(p[1].toFixed(2)) };
    });
    const uniqueDaily = Object.values(dailyData).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    console.log(`[API CoinGecko] Parsed ${uniqueDaily.length} points for ${coinId}`);
    return uniqueDaily;
  } catch (error) { console.error(`[API CoinGecko] Error for ${coinId}:`, error); return []; }
}

// --- Alternative.me Fear & Greed Index Fetcher ---
// interface AlternativeMeFngValue { value: string; timestamp: string; value_classification: string; } // Defined above if needed
// interface AlternativeMeFngResponse { name: string; data: AlternativeMeFngValue[]; metadata: { error: string | null; }; } // Defined above
export async function fetchAlternativeMeFearGreedIndex(
  dateRange?: { startDate?: string; endDate?: string }
): Promise<TimeSeriesDataPoint[]> {
    console.log(`[fetchAlternativeMeFearGreedIndex API - ENTRY] Called with: dateRange=${JSON.stringify(dateRange)}`);
    const apiDefaults = getApiDefaultDateRange(5);
    const startConsider = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate;
    const endConsider = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;
    const daysToStart = Math.max(0, differenceInDays(new Date(), parseISO(startConsider)));
    const limit = Math.min(daysToStart + 1, 1825); // Max ~5 years
    const url = `${ALTERNATIVE_ME_API_URL}?limit=${limit}&format=json`;
    console.log(`[API AlternativeMe] Attempting to fetch F&G (limit: ${limit}, filter end: ${endConsider}) from URL: ${url}`);
    try {
        const res = await fetch(url, { next: { revalidate: 10800 } });
        if (!res.ok) {
            const errTxt = await res.text();
            console.error(`[API AlternativeMe] F&G Error: ${res.status} - ${errTxt.substring(0,500)}`);
            throw new Error(`Alternative.me Error ${res.status}.`);
        }
        const data: AlternativeMeFngResponse = await res.json();
        console.log(`[API AlternativeMe] Raw F&G response:`, JSON.stringify(data).substring(0, 500));
        if (data.metadata.error) throw new Error(`Alternative.me API Error: ${data.metadata.error}`);
        if (!data.data?.length) { console.warn(`[API AlternativeMe] No F&G data.`); return []; }
        let series: TimeSeriesDataPoint[] = data.data.map(item => ({
            date: format(new Date(parseInt(item.timestamp) * 1000), 'yyyy-MM-dd'),
            value: parseInt(item.value, 10),
        })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        if (isValid(parseISO(startConsider))) series = series.filter(dp => parseISO(dp.date) >= parseISO(startConsider));
        if (isValid(parseISO(endConsider))) series = series.filter(dp => parseISO(dp.date) <= parseISO(endConsider));
        console.log(`[API AlternativeMe] Parsed and filtered ${series.length} F&G points`);
        return series;
    } catch (e) { console.error('[API AlternativeMe] F&G Error:', e); return []; }
}

// --- NewsAPI.org Fetcher ---
export interface NewsArticle { source: { id: string | null; name: string }; author: string | null; title: string; description: string | null; url: string; urlToImage: string | null; publishedAt: string; content: string | null; }
export interface NewsApiResponse { status: string; totalResults: number; articles: NewsArticle[]; message?: string; code?: string; }
export async function fetchNewsHeadlines(category: string = 'business', country: string = 'us', pageSize: number = 10): Promise<NewsArticle[]> {
  console.log(`[fetchNewsHeadlines API - ENTRY] Called with: category=${category}, country=${country}, pageSize=${pageSize}`);
  const apiKey = process.env.NEWSAPI_ORG_KEY;
  if (!apiKey) {
    console.error("[fetchNewsHeadlines API] NEWSAPI_ORG_KEY is missing.");
    return [];
  }
  const params = new URLSearchParams({ country, category, pageSize: pageSize.toString(), apiKey });
  const url = `${NEWSAPI_ORG_BASE_URL}/top-headlines?${params.toString()}`;
  console.log(`[API NewsAPI] Attempting to fetch: ${url.replace(apiKey, "REDACTED_KEY")}`);
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) {
      const errData: NewsApiResponse = await res.json().catch(() => ({ status: 'error', articles:[], message: `HTTP ${res.status}`}) as any);
      const errMsg = errData.message || errData.code || `NewsAPI Error (${res.status})`;
      console.error(`[API NewsAPI] Error for ${category}/${country}: ${errMsg}`);
      throw new Error(errMsg);
    }
    const data: NewsApiResponse = await res.json();
    console.log(`[API NewsAPI] Raw response status for ${category}/${country}: ${data.status}, totalResults: ${data.totalResults}. Articles (first few):`, JSON.stringify(data.articles?.slice(0,2)).substring(0,500));
    if (data.status !== 'ok') {
      console.warn(`[API NewsAPI] Status not 'ok' for ${category}/${country}: ${data.message || data.code}`);
      if (['apiKeyDisabled', 'apiKeyInvalid', 'keyInvalid'].includes(data.code||'')) console.error("[API NewsAPI] Key issue.");
      return [];
    }
    const articles = data.articles?.filter(a => a.title && a.url) || [];
    console.log(`[API NewsAPI] Parsed ${articles.length} articles for ${category}/${country}`);
    return articles;
  } catch (e) { console.error("[API NewsAPI] Error:", e); return []; }
}

// --- Finnhub Economic Calendar Fetcher ---
export interface EconomicEvent { actual: number | null; country: string; estimate: number | null; event: string; impact: string; prev: number | null; time: string; unit: string; calendarId?: string; }
export interface EconomicCalendarResponse { economicCalendar: EconomicEvent[]; }
export async function fetchEconomicCalendar(daysAhead: number = 7): Promise<EconomicEvent[]> {
  console.log(`[fetchEconomicCalendar API - ENTRY] Called with: daysAhead=${daysAhead}`);
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    console.error("[fetchEconomicCalendar API] FINNHUB_API_KEY missing.");
    return [];
  }
  const from = format(new Date(), 'yyyy-MM-dd');
  const to = format(addDays(new Date(), daysAhead), 'yyyy-MM-dd');
  const url = `${FINNHUB_API_URL}/calendar/economic?token=${apiKey}&from=${from}&to=${to}`;
  console.log(`[API Finnhub] Attempting to fetch Economic Calendar: ${url.replace(apiKey, "REDACTED_KEY")}`);
  try {
    const res = await fetch(url, { next: { revalidate: 7200 } });
    if (!res.ok) {
      const errTxt = await res.text();
      console.error(`[API Finnhub] Eco Calendar Error ${res.status}: ${errTxt.substring(0,300)}`);
      throw new Error(`Finnhub Eco Calendar Error (${res.status}).`);
    }
    const data: EconomicCalendarResponse | { error?: string } = await res.json();
    console.log(`[API Finnhub] Raw Economic Calendar response:`, JSON.stringify(data).substring(0, 500));
    if ('error' in data && data.error) throw new Error(`Finnhub Eco Calendar API: ${data.error}`);
    if (!('economicCalendar' in data) || !Array.isArray(data.economicCalendar)) {
        console.warn("[API Finnhub] No 'economicCalendar' array."); return [];
    }
    const events = data.economicCalendar.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    console.log(`[API Finnhub] Parsed ${events.length} economic events.`);
    return events;
  } catch (e) { console.error("[API Finnhub] Eco Calendar Error:", e); return []; }
}

// --- Finnhub Earnings Calendar Fetcher ---
export interface EarningsEvent { date: string; epsActual: number | null; epsEstimate: number | null; hour: string; quarter: number; revenueActual: number | null; revenueEstimate: number | null; symbol: string; year: number; }
export interface EarningsCalendarResponseFinnhub { earningsCalendar: EarningsEvent[]; }
export async function fetchEarningsCalendar(daysAhead: number = 7): Promise<EarningsEvent[]> {
  console.log(`[fetchEarningsCalendar API - ENTRY] Called with: daysAhead=${daysAhead}`);
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) {
    console.error("[fetchEarningsCalendar API] FINNHUB_API_KEY missing.");
    return [];
  }
  const from = format(new Date(), 'yyyy-MM-dd');
  const to = format(addDays(new Date(), daysAhead), 'yyyy-MM-dd');
  const url = `${FINNHUB_API_URL}/calendar/earnings?token=${apiKey}&from=${from}&to=${to}`;
  console.log(`[API Finnhub] Attempting to fetch Earnings Calendar: ${url.replace(apiKey, "REDACTED_KEY")}`);
  try {
    const res = await fetch(url, { next: { revalidate: 14400 } });
    if (!res.ok) {
      const errTxt = await res.text();
      console.error(`[API Finnhub] Earnings Calendar Error ${res.status}: ${errTxt.substring(0,300)}`);
      throw new Error(`Finnhub Earnings Calendar Error (${res.status}).`);
    }
    const data: EarningsCalendarResponseFinnhub | { error?: string } = await res.json();
    console.log(`[API Finnhub] Raw Earnings Calendar response:`, JSON.stringify(data).substring(0, 500));
     if ('error' in data && data.error) throw new Error(`Finnhub Earnings Calendar API: ${data.error}`);
    if (!('earningsCalendar' in data) || !Array.isArray(data.earningsCalendar)) {
        console.warn("[API Finnhub] No 'earningsCalendar' array."); return [];
    }
    const events = data.earningsCalendar.filter(e => e.symbol).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    console.log(`[API Finnhub] Parsed ${events.length} earnings events.`);
    return events;
  } catch (e) { console.error("[API Finnhub] Earnings Calendar Error:", e); return []; }
}