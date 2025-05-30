// src/lib/api.ts
import { TimeSeriesDataPoint, FredResponse, FredObservation } from './indicators';
import {
    subYears,
    format,
    isValid,
    parseISO,
    differenceInDays,
    addDays,
    subDays, 
    startOfToday,
} from 'date-fns';

// --- API Base URLs ---
const FRED_API_URL = 'https://api.stlouisfed.org/fred/series/observations';
const FRED_API_RELEASES_URL = 'https://api.stlouisfed.org/fred';
const ALPHA_VANTAGE_API_URL = 'https://www.alphavantage.co/query';
const COINGECKO_API_URL = 'https://api.coingecko.com/api/v3';
const ALTERNATIVE_ME_API_URL = 'https://api.alternative.me/fng/';
const NEWSAPI_ORG_BASE_URL = 'https://newsapi.org/v2';
const FINNHUB_API_URL = 'https://finnhub.io/api/v1';
const DBNOMICS_API_URL_V22 = 'https://api.db.nomics.world/v22';
const POLYGON_API_URL = 'https://api.polygon.io/v2';
const API_NINJAS_BASE_URL = 'https://api.api-ninjas.com/v1';
const TIINGO_API_URL = 'https://api.tiingo.com/tiingo';


// --- Helper for Default API Fetch Date Range (Consistent) ---
function getApiDefaultDateRange(years: number = 1): { startDate: string; endDate: string } {
  const today = new Date();
  const pastDate = subYears(today, years);
  return {
    startDate: format(pastDate, 'yyyy-MM-dd'),
    endDate: format(today, 'yyyy-MM-dd')
  };
}

// --- API Key Check Helper ---
type ApiServiceName = 'FRED' | 'ALPHA_VANTAGE' | 'NEWSAPI_ORG' | 'FINNHUB' | 'POLYGON' | 'API_NINJAS' | 'TIINGO';

const getApiKey = (serviceName: ApiServiceName): string | null => {
    let key: string | undefined;
    let envVarName: string = '';
    switch(serviceName) {
        case 'FRED': envVarName = 'FRED_API_KEY'; key = process.env.FRED_API_KEY; break;
        case 'ALPHA_VANTAGE': envVarName = 'ALPHA_VANTAGE_API_KEY'; key = process.env.ALPHA_VANTage_API_KEY; break;
        case 'NEWSAPI_ORG': envVarName = 'NEWSAPI_ORG_KEY'; key = process.env.NEWSAPI_ORG_KEY; break;
        case 'FINNHUB': envVarName = 'FINNHUB_API_KEY'; key = process.env.FINNHUB_API_KEY; break;
        case 'POLYGON': envVarName = 'POLYGON_API_KEY'; key = process.env.POLYGON_API_KEY; break;
        case 'API_NINJAS': envVarName = 'API_NINJAS_KEY'; key = process.env.API_NINJAS_KEY; break;
        case 'TIINGO': envVarName = 'TIINGO_API_KEY'; key = process.env.TIINGO_API_KEY; break;
        default: 
            const exhaustiveCheck: never = serviceName; 
            console.error(`[API Lib] Unknown service name for API Key: ${exhaustiveCheck}`);
            return null;
    }
    if (!key) {
        console.error(`[API Lib] API Key for ${serviceName} (env: ${envVarName}) is missing. This service will be unavailable.`);
        return null;
    }
    return key;
};

// --- FRED API Fetcher (Series Observations) ---
export async function fetchFredSeries(
  seriesId: string,
  dateRange?: { startDate?: string; endDate?: string }
): Promise<TimeSeriesDataPoint[]> {
  const apiKey = getApiKey('FRED');
  if (!apiKey) {
    throw new Error(`[FRED API Key Missing] Cannot fetch series ${seriesId}. Ensure FRED_API_KEY is set.`);
  }
  const apiDefaults = getApiDefaultDateRange();
  let formattedStartDate = (dateRange?.startDate && isValid(parseISO(dateRange.startDate)))
    ? dateRange.startDate : apiDefaults.startDate;
  let formattedEndDate = (dateRange?.endDate && isValid(parseISO(dateRange.endDate)))
    ? dateRange.endDate : apiDefaults.endDate;
  
  if (new Date(formattedStartDate) > new Date(formattedEndDate)) {
      console.warn(`[API FRED] Correcting invalid date range for ${seriesId}: start ${formattedStartDate} > end ${formattedEndDate}. Using defaults.`);
      formattedStartDate = apiDefaults.startDate; 
      formattedEndDate = apiDefaults.endDate;
  }

  const params = new URLSearchParams({
    series_id: seriesId, api_key: apiKey, file_type: 'json',
    observation_start: formattedStartDate, observation_end: formattedEndDate,
  });
  const url = `${FRED_API_URL}?${params.toString()}`;
  try {
    const response = await fetch(url, { next: { revalidate: 21600 } }); 
    if (!response.ok) {
      const errorText = await response.text();
      const errorMessage = `FRED API Error (${response.status}) for ${seriesId}. Response: ${errorText.substring(0,150)}`;
      console.error(`[API FRED Fetch Error] Series: ${seriesId}, Status: ${response.status}, Body: ${errorText.substring(0,500)}`);
      throw new Error(errorMessage);
    }
    const data: FredResponse = await response.json();
    if (!data?.observations || !Array.isArray(data.observations) || data.observations.length === 0) {
      return [];
    }
    return data.observations
      .map((obs: FredObservation): TimeSeriesDataPoint | null => {
        if (obs.value === '.' || !obs.date || !isValid(parseISO(obs.date))) return null;
        const value = parseFloat(obs.value);
        return isNaN(value) ? null : { date: obs.date, value };
      })
      .filter((p): p is TimeSeriesDataPoint => p !== null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (error: any) { 
    if (error.message.startsWith('[FRED API Error]') || error.message.startsWith('[FRED API Key Missing]')) {
        throw error;
    }
    console.error(`[API FRED] Network/parsing error for ${seriesId}:`, error); 
    throw new Error(`[FRED Network/Parse Error] Failed to fetch or parse data for ${seriesId}. Original: ${error.message?.substring(0,100)}`);
  }
}

// --- FRED API Fetcher (Releases Calendar) ---
export interface FredReleaseDate { release_id: number; release_name: string; date: string; }
export interface FredReleasesDatesResponse { release_dates: FredReleaseDate[]; count?: number; offset?: number; limit?: number; }

export async function fetchFredReleaseCalendar(
  _daysAheadForDisplay: number = 30,
  includeReleaseDatesWithNoData: boolean = false
): Promise<FredReleaseDate[]> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) { console.error("[API FRED Releases] Key missing."); return []; }

  const today = new Date();
  const queryStartDate = format(subDays(today, 7), 'yyyy-MM-dd');
  const queryEndDate = format(addDays(today, 60), 'yyyy-MM-dd');

  const params = new URLSearchParams({
    api_key: apiKey, file_type: 'json',
    realtime_start: queryStartDate,
    realtime_end: queryEndDate,
    include_release_dates_with_no_data: String(includeReleaseDatesWithNoData),
    limit: '200', 
    sort_order: 'asc',
  });
  const url = `${FRED_API_RELEASES_URL}/releases/dates?${params.toString()}`;

  try {
    const response = await fetch(url, { next: { revalidate: 43200 } }); 
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API FRED Releases] Error: ${response.status} - Body: ${errorText.substring(0,500)}`);
      throw new Error(`FRED Releases API Error (${response.status}).`);
    }
    const data: FredReleasesDatesResponse = await response.json();
    if (!data?.release_dates?.length) {
        return [];
    }
    const uniqueReleasesMap = new Map<string, FredReleaseDate>();
    data.release_dates.forEach(current => {
      if (current.date && current.release_name && current.release_id != null && isValid(parseISO(current.date))) {
        uniqueReleasesMap.set(`${current.release_id}-${current.date}`, current);
      }
    });
    const allUniqueSortedReleases = Array.from(uniqueReleasesMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return allUniqueSortedReleases;
  } catch (error) {
    console.error(`[API FRED Releases] Error:`, error);
    return [];
  }
}

// --- Alpha Vantage API Fetcher (MODIFIED for Stocks/ETF/Currency/Commodity) ---
export async function fetchAlphaVantageData(
  apiIdentifier: string, 
  dateRange?: { startDate?: string; endDate?: string }
): Promise<TimeSeriesDataPoint[]> {
  const apiKey = getApiKey('ALPHA_VANTAGE');
  if (!apiKey) throw new Error(`[AlphaVantage API Key Missing] Cannot fetch ${apiIdentifier}.`);

  const apiDefaults = getApiDefaultDateRange();
  const effStart = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate;
  const effEnd = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;
  
  let params: URLSearchParams;
  let dataKey: string; 
  let valKey: string;  
  let isSingleValueCommodityOrCurrency = false;
  let isCommodityTimeseries = false;

  if (apiIdentifier.includes('/')) { 
    const [from, to] = apiIdentifier.split('/');
    if (!from || !to) { throw new Error(`[AlphaVantage API Error] Invalid currency pair: ${apiIdentifier}`); }
    
    const digitalCurrencies = ['BTC', 'ETH']; 
    if (digitalCurrencies.includes(from.toUpperCase())) {
        params = new URLSearchParams({ function: 'DIGITAL_CURRENCY_DAILY', symbol: from.toUpperCase(), market: to.toUpperCase(), apikey: apiKey, outputsize: 'full' });
        dataKey = 'Time Series (Digital Currency Daily)';
        valKey = `4a. close (${to.toUpperCase()})`; 
    } else {
        params = new URLSearchParams({ function: 'CURRENCY_EXCHANGE_RATE', from_currency: from.toUpperCase(), to_currency: to.toUpperCase(), apikey: apiKey });
        dataKey = 'Realtime Currency Exchange Rate';
        valKey = '5. Exchange Rate';
        isSingleValueCommodityOrCurrency = true;
    }
  } else if (apiIdentifier.toUpperCase() === 'NATURAL_GAS') { 
    params = new URLSearchParams({ function: 'NATURAL_GAS', interval: 'daily', apikey: apiKey }); 
    dataKey = 'data'; 
    valKey = 'value';
    isCommodityTimeseries = true; 
  } else { 
    const output = (isValid(parseISO(effStart)) && isValid(parseISO(effEnd)) && differenceInDays(parseISO(effEnd), parseISO(effStart)) > 90) ? 'full' : 'compact';
    params = new URLSearchParams({ function: 'TIME_SERIES_DAILY_ADJUSTED', symbol: apiIdentifier, apikey: apiKey, outputsize: output });
    dataKey = 'Time Series (Daily)';
    valKey = '5. adjusted close';
  }

  const url = `${ALPHA_VANTAGE_API_URL}?${params.toString()}`;
  try {
    const res = await fetch(url, { next: { revalidate: isSingleValueCommodityOrCurrency ? 300 : 14400 } });
    if (!res.ok) { const txt = await res.text(); throw new Error(`[AlphaVantage API Error] (${res.status}) for ${apiIdentifier}. Details: ${txt.substring(0,150)}`); }
    const data = await res.json();

    if (data["Error Message"]) throw new Error(`[AlphaVantage API Error] ${data["Error Message"]} for ${apiIdentifier}.`);
    if (data["Information"] || data["Note"]) {
        const note = data["Information"] || data["Note"];
        console.warn(`[API AlphaVantage] Note for ${apiIdentifier}: ${note}.`);
        if (note.toLowerCase().includes("api call frequency") || note.toLowerCase().includes("premium endpoint")) {
            throw new Error(`[AlphaVantage API Limit/Access Error] Note: ${note} for ${apiIdentifier}.`);
        }
    }
    
    const block = data[dataKey];
    if (!block || (typeof block === 'object' && !Array.isArray(block) && !Object.keys(block).length) || (Array.isArray(block) && block.length === 0) ) { 
        console.warn(`[API AlphaVantage] No data block found for key "${dataKey}" or block is empty for ${apiIdentifier}. Response:`, JSON.stringify(data).substring(0,200));
        return []; 
    }
    
    let series: TimeSeriesDataPoint[] = [];

    if (isSingleValueCommodityOrCurrency) { 
      const rateStr = block[valKey];
      const rate = rateStr ? parseFloat(rateStr) : NaN;
      if (!isNaN(rate)) series = [{ date: format(new Date(), 'yyyy-MM-dd'), value: parseFloat(rate.toFixed(4)) }];
    } else if (isCommodityTimeseries) { 
      if (Array.isArray(block)) {
        series = block.map((item: any) => {
          if (!item.date || !isValid(parseISO(item.date)) || item[valKey] === '.' || item[valKey] === undefined || item[valKey] === null) return null;
          const value = parseFloat(item[valKey]);
          return isNaN(value) ? null : { date: item.date, value: parseFloat(value.toFixed(4)) };
        }).filter(dp => dp !== null) as TimeSeriesDataPoint[];
      }
    } else { 
        series = Object.keys(block).map(dateStr => {
          if (!isValid(parseISO(dateStr))) return null;
          const dayData = block[dateStr]; 
          const valStr = dayData[valKey] || dayData['4. close']; 
          if (valStr === undefined || valStr === null) return null; 
          const value = parseFloat(valStr);
          return isNaN(value) ? null : { date: dateStr, value: parseFloat(value.toFixed(4)) };
        }).filter(dp => dp !== null) as TimeSeriesDataPoint[];
    }

    series.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (!isSingleValueCommodityOrCurrency) {
        if (isValid(parseISO(effStart))) series = series.filter(dp => parseISO(dp.date) >= parseISO(effStart));
        if (isValid(parseISO(effEnd))) series = series.filter(dp => parseISO(dp.date) <= parseISO(effEnd));
    }
    return series;
  } catch (e: any) { 
    if (e.message.startsWith('[AlphaVantage API')) throw e;
    console.error(`[API AlphaVantage] Network/parse error for ${apiIdentifier}:`, e); 
    throw new Error(`[AlphaVantage Network/Parse Error] ${apiIdentifier}. Original: ${e.message?.substring(0,100)}`);
  }
}

// --- DXY Calculation Function ---
interface FxRateMap { [pair: string]: number; }

export async function calculateDxyIndex(
    componentPairs: string[], 
    _dateRange?: { startDate?: string; endDate?: string } 
): Promise<TimeSeriesDataPoint[]> {
    const weights: Record<string, number> = {
        'EUR/USD': 0.576, 'USD/JPY': 0.136, 'GBP/USD': 0.119,
        'USD/CAD': 0.091, 'USD/SEK': 0.042, 'USD/CHF': 0.036,
    };
    const powers: Record<string, number> = { 
        'EUR/USD': -0.576, 'USD/JPY': 0.136, 'GBP/USD': -0.119,
        'USD/CAD': 0.091,  'USD/SEK': 0.042, 'USD/CHF': 0.036,
    };

    const rates: FxRateMap = {};
    const fetchPromises = componentPairs.map(async (pair) => {
        try {
            const dataPoints = await fetchAlphaVantageData(pair); 
            if (dataPoints.length > 0 && dataPoints[0].value !== null) {
                rates[pair] = dataPoints[0].value;
            } else {
                console.warn(`[DXY Calc] No rate found for ${pair}`);
            }
        } catch (error) {
            console.error(`[DXY Calc] Error fetching rate for ${pair}:`, error);
        }
    });

    await Promise.all(fetchPromises);

    if (Object.keys(rates).length !== componentPairs.length) {
        const missingPairs = componentPairs.filter(p => !rates[p]);
        console.error("[DXY Calc] Failed to fetch all required FX rates for DXY calculation. Missing:", missingPairs.join(', '));
        return []; 
    }

    let dxyValue = 50.14348112; 

    for (const pair of componentPairs) {
        if (rates[pair] && powers[pair]) {
            dxyValue *= Math.pow(rates[pair], powers[pair]);
        } else {
            console.warn(`[DXY Calc] Missing rate or power for ${pair}, DXY will be inaccurate.`);
            return []; 
        }
    }
    return [{
        date: format(new Date(), 'yyyy-MM-dd'),
        value: parseFloat(dxyValue.toFixed(4))
    }];
}

// --- Alpha Vantage News & Sentiment ---
export interface NewsSentimentArticle { title: string; url: string; time_published: string; authors: string[]; summary: string; banner_image: string | null; source: string; category_within_source: string | null; source_domain: string; topics: Array<{ topic: string; relevance_score: string }>; overall_sentiment_score: number; overall_sentiment_label: string; ticker_sentiment: Array<{ ticker: string; relevance_score: string; ticker_sentiment_score: string; ticker_sentiment_label: string; }>; }
export interface AlphaVantageNewsSentimentResponse { items: string; sentiment_score_definition: string; relevance_score_definition: string; feed: NewsSentimentArticle[]; "Information"?: string; "Error Message"?: string; }
export async function fetchAlphaVantageNewsSentiment( tickers?: string, topics?: string, limit: number = 5 ): Promise<NewsSentimentArticle[]> {
  const apiKey = getApiKey('ALPHA_VANTAGE');
  if (!apiKey) throw new Error(`[AlphaVantage API Key Missing] Cannot fetch news sentiment.`);

  const params = new URLSearchParams({ function: 'NEWS_SENTIMENT', apikey: apiKey, limit: String(Math.min(limit, 50)), });
  if (tickers) params.set('tickers', tickers); if (topics) params.set('topics', topics);
  const url = `${ALPHA_VANTAGE_API_URL}?${params.toString()}`;
  try {
    const response = await fetch(url, { next: { revalidate: 3600 } });
    if (!response.ok) {
      const errorText = await response.text(); 
      throw new Error(`[AlphaVantage News API Error] (${response.status}). Details: ${errorText.substring(0,100)}`);
    }
    const data: AlphaVantageNewsSentimentResponse = await response.json();
    if (data["Error Message"]) {
        throw new Error(`[AlphaVantage News API Error] ${data["Error Message"]}`);
    }
    if (data["Information"]) {
      console.warn(`[API AlphaVantage News] Message: ${data["Information"]}`);
      if (data["Information"].toLowerCase().includes("api call frequency") || data["Information"].toLowerCase().includes("premium endpoint")) {
          throw new Error(`[AlphaVantage News API Limit/Access Error] ${data["Information"]}`);
      }
    }
    if (!data.feed || !Array.isArray(data.feed)) { 
      return []; 
    }
    return data.feed;
  } catch (error: any) { 
    if (error.message.startsWith('[AlphaVantage')) throw error;
    console.error("[API AlphaVantage News] Network/Parse Error:", error); 
    throw new Error(`[AlphaVantage News Network/Parse Error] Original: ${error.message?.substring(0,100)}`);
  }
}

// --- Alpha Vantage Insider Transactions ---
export interface InsiderTransaction { symbol: string; filingDate: string; transactionDate: string; reportingCik: string; reportingName: string; reportingTitle: string; transactionType: string; transactionCode: string; shares: string; value: string; pricePerShare: string; }
function parseInsiderCSV(csvText: string): Record<string, string>[] {
    const lines = csvText.trim().split('\n'); if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"/, '').replace(/"$/, '')); 
    return lines.slice(1).map(rowText => { 
        const values = rowText.split(',').map(v => v.trim().replace(/^"/, '').replace(/"$/, '')); 
        const rowObject: Record<string, string> = {}; 
        headers.forEach((header, index) => { rowObject[header] = values[index] || ''; }); 
        return rowObject; 
    });
}
export async function fetchAlphaVantageInsiderTransactions( ticker: string, limit: number = 10 ): Promise<InsiderTransaction[]> {
  const apiKey = getApiKey('ALPHA_VANTAGE');
  if (!apiKey) throw new Error(`[AlphaVantage API Key Missing] Cannot fetch insider transactions for ${ticker}.`);
  if (!ticker) throw new Error("[AlphaVantage Insider API Error] Symbol is required.");

  const params = new URLSearchParams({ function: 'INSIDER_TRANSACTIONS', apikey: apiKey, symbol: ticker.toUpperCase() });
  const url = `${ALPHA_VANTAGE_API_URL}?${params.toString()}`;
  
  try {
    const response = await fetch(url, { cache: 'no-store' }); 
    if (!response.ok) {
      const errorText = await response.text(); 
      let errorDetail = errorText.substring(0,500);
      try { const jsonError = JSON.parse(errorText); errorDetail = jsonError["Error Message"] || jsonError["Information"] || errorDetail; } catch(e) {}
      throw new Error(`[AlphaVantage Insider API Error] (${response.status}) for ${ticker}. Details: ${errorDetail.substring(0,100)}`);
    }
    const csvData = await response.text();
    if (!csvData || csvData.trim() === '' || csvData.toLowerCase().includes("error message")) {
        throw new Error(`[AlphaVantage Insider API Error] Received error message in CSV for ${ticker}: ${csvData.substring(0,100)}`);
    }
    if (csvData.toLowerCase().includes("thank you for using alpha vantage") && !csvData.toLowerCase().includes("symbol,companyname")) { 
       console.warn("[API AlphaVantage Insider] Rate limit or key issue for " + ticker);
       throw new Error(`[AlphaVantage Insider API Limit/Access Error] for ${ticker}. Response: ${csvData.substring(0,100)}`);
    }
    
    const parsedObjects = parseInsiderCSV(csvData); 
    return parsedObjects.map(obj => ({
      symbol: obj.symbol?.toUpperCase() || 'N/A',
      filingDate: obj.filingDate || '', 
      transactionDate: obj.transactionDate || '',
      reportingCik: obj.reporterCik || '', 
      reportingName: obj.reporterName || 'Unknown Insider', 
      reportingTitle: obj.relationship || 'N/A', 
      transactionType: obj.transactionType || 'N/A', 
      transactionCode: obj.transactionCode || 'N/A', 
      shares: obj.shares || '0',
      value: obj.value || '0', 
      pricePerShare: obj.price || '0', 
    }))
    .filter(t => t.symbol !== 'N/A' && t.filingDate && isValid(parseISO(t.filingDate)))
    .sort((a,b) => new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime())
    .slice(0, limit); 
  } catch (error: any) { 
    if (error.message.startsWith('[AlphaVantage')) throw error;
    console.error(`[API AlphaVantage Insider] Network/parsing error for ${ticker}:`, error); 
    throw new Error(`[AlphaVantage Insider Network/Parse Error] ${ticker}. Original: ${error.message?.substring(0,100)}`);
  }
}

// --- DB.nomics API Fetcher ---
interface DbNomicsSeriesDoc { '@frequency'?: string; dataset_code?: string; dataset_name?: string; dimensions?: any; indexed_at?: string; period: string[]; period_start_day?: string[]; provider_code?: string; series_code?: string; series_name?: string; value: (number | null)[]; }
interface DbNomicsResponse { series: { docs: DbNomicsSeriesDoc[]; limit?: number; num_found?: number; offset?: number; }; datasets?: any; errors?: any; providers?: any; _meta?: any; message?: string; }
export async function fetchDbNomicsSeries( fullSeriesCode: string, dateRange?: { startDate?: string; endDate?: string } ): Promise<TimeSeriesDataPoint[]> {
  const params = new URLSearchParams({ series_ids: fullSeriesCode, observations: '1', format: 'json', });
  const url = `${DBNOMICS_API_URL_V22}/series?${params.toString()}`;
  try {
    const response = await fetch(url, { next: { revalidate: 21600 } });
    if (!response.ok) {
      const errorBody = await response.text(); let errMsg = `DB.nomics Error (${response.status}) for ${fullSeriesCode}.`;
      try { const jsonError = JSON.parse(errorBody); errMsg = `DB.nomics: ${jsonError.message || jsonError.errors?.[0]?.message || jsonError.detail || errorBody.substring(0,100)}`; } catch (e) { /* ignore */ }
      throw new Error(errMsg);
    }
    const data: DbNomicsResponse = await response.json();
    if (data.message && data.message.toLowerCase().includes("error")) { 
        if (data.message.includes("Invalid value")) throw new Error(`[DB.nomics API Error] ${data.message} for ${fullSeriesCode}.`);
        return []; 
    }
    if (!data.series?.docs?.length) { return []; }
    const seriesObject = data.series.docs[0];
    if (!seriesObject || !seriesObject.period || !seriesObject.value || !Array.isArray(seriesObject.period) || !Array.isArray(seriesObject.value)) { return []; }
    
    let timeSeries: TimeSeriesDataPoint[] = []; const dateArray = seriesObject.period_start_day || seriesObject.period;
    for (let i = 0; i < dateArray.length; i++) {
      const val = seriesObject.value[i]; const dateStr = dateArray[i];
      let fullDate = dateStr; if (dateStr && dateStr.length === 7 && dateStr.includes('-')) fullDate = `${dateStr}-01`;
      if (fullDate && isValid(parseISO(fullDate)) && val !== null && !isNaN(val)) {
        timeSeries.push({ date: format(parseISO(fullDate), 'yyyy-MM-dd'), value: parseFloat(val.toFixed(2)) });
      }
    }
    timeSeries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    let filtered = timeSeries;
    if (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) filtered = filtered.filter(dp => parseISO(dp.date) >= parseISO(dateRange.startDate!));
    if (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) filtered = filtered.filter(dp => parseISO(dp.date) <= parseISO(dateRange.endDate!));
    return filtered;
  } catch (error: any) { 
    if (error.message.startsWith('[DB.nomics')) throw error;
    console.error(`[API DB.nomics] Network/Parse Error for ${fullSeriesCode}:`, error); 
    throw new Error(`[DB.nomics Network/Parse Error] ${fullSeriesCode}. Original: ${error.message?.substring(0,100)}`);
  }
}

// --- Polygon.io API Fetcher ---
interface PolygonAggregatesResult { c: number; h: number; l: number; n: number; o: number; t: number; v: number; vw: number; }
interface PolygonAggregatesResponse { ticker?: string; queryCount?: number; resultsCount?: number; adjusted?: boolean; results?: PolygonAggregatesResult[]; status?: string; request_id?: string; count?: number; message?: string; }
export async function fetchPolygonIOData( ticker: string, dateRange?: { startDate?: string; endDate?: string } ): Promise<TimeSeriesDataPoint[]> {
  const apiKey = getApiKey('POLYGON'); 
  if (!apiKey) throw new Error(`[Polygon.io API Key Missing] Cannot fetch data for ${ticker}.`);

  const apiDefaults = getApiDefaultDateRange(2); 
  const startDate = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate; 
  const endDate = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;
  if (new Date(startDate) > new Date(endDate)) { return []; }

  const params = new URLSearchParams({ adjusted: 'true', sort: 'asc', limit: '5000', apiKey: apiKey, });
  const url = `${POLYGON_API_URL}/aggs/ticker/${ticker}/range/1/day/${startDate}/${endDate}?${params.toString()}`;
  try {
    const response = await fetch(url, { next: { revalidate: 14400 } });
    if (!response.ok) {
      const errorBody = await response.text(); let errMsg = `Polygon.io Error (${response.status}) for ${ticker}.`;
      try { const errorJson: PolygonAggregatesResponse = JSON.parse(errorBody); if (errorJson.message) errMsg = `Polygon.io: ${errorJson.message}`; } catch (e) { /* ignore */ }
      throw new Error(errMsg);
    }
    const data: PolygonAggregatesResponse = await response.json();
    if (data.status === 'ERROR' || (data.message && data.status !== 'OK' && data.status !== 'DELAYED')) throw new Error(`[Polygon.io API Error] ${data.message || data.status} for ${ticker}.`);
    if (!data.results?.length) { return []; }
    return data.results.map((agg: PolygonAggregatesResult) => ({ date: format(new Date(agg.t), 'yyyy-MM-dd'), value: parseFloat(agg.c.toFixed(4)), }));
  } catch (error: any) { 
    if (error.message.startsWith('[Polygon.io')) throw error;
    console.error(`[API Polygon.io] Network/Parse Error for ${ticker}:`, error); 
    throw new Error(`[Polygon.io Network/Parse Error] ${ticker}. Original: ${error.message?.substring(0,100)}`);
  }
}

// --- API-Ninjas.com Commodity Latest Price Fetcher ---
interface ApiNinjasCommodityLatestPriceResponse { name: string; price: number; updated: number; unit?:string; exchange?:string;}
export async function fetchApiNinjasMetalPrice( commodityName: string ): Promise<TimeSeriesDataPoint[]> {
  const apiKey = getApiKey('API_NINJAS'); 
  if (!apiKey) throw new Error(`[API-Ninjas API Key Missing] Cannot fetch latest price for ${commodityName}.`);

  const url = `${API_NINJAS_BASE_URL}/commodityprice?name=${encodeURIComponent(commodityName)}`;
  try {
    const response = await fetch(url, { headers: { 'X-Api-Key': apiKey }, next: { revalidate: 300 } });
    if (!response.ok) {
      const errorText = await response.text(); let errMsg = `API-Ninjas Price Error (${response.status}) for ${commodityName}.`;
      try { const errorJson = JSON.parse(errorText); if (errorJson.message || errorJson.error) errMsg = `API-Ninjas: ${errorJson.message || errorJson.error}`; } catch (e) { /* ignore */ }
      throw new Error(errMsg);
    }
    const data: ApiNinjasCommodityLatestPriceResponse = await response.json();
    if (typeof data?.price !== 'number' || typeof data?.updated !== 'number') { return []; }
    return [{ date: format(new Date(data.updated * 1000), 'yyyy-MM-dd'), value: parseFloat(data.price.toFixed(4)), }];
  } catch (error: any) { 
    if (error.message.startsWith('[API-Ninjas')) throw error;
    console.error(`[API API-Ninjas Commodity] Network/Parse Error for ${commodityName}:`, error); 
    throw new Error(`[API-Ninjas Commodity Network/Parse Error] ${commodityName}. Original: ${error.message?.substring(0,100)}`);
  }
}

// --- API-Ninjas.com Commodity Historical Price Fetcher ---
interface ApiNinjasHistoricalDataPoint { open: number; low: number; high: number; close: number; time: number; volume?:number; }
type ApiNinjasHistoricalResponse = ApiNinjasHistoricalDataPoint[];
export async function fetchApiNinjasCommodityHistoricalPrice( commodityName: string, dateRange?: { startDate?: string; endDate?: string }, period: '1h' | '1d' = '1d' ): Promise<TimeSeriesDataPoint[]> {
  const apiKey = getApiKey('API_NINJAS'); 
  if (!apiKey) throw new Error(`[API-Ninjas API Key Missing] Cannot fetch historical price for ${commodityName}.`);

  const apiDefaults = getApiDefaultDateRange(1); 
  const startDateStr = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate; 
  const endDateStr = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;
  const startTimestamp = Math.floor(parseISO(startDateStr).getTime() / 1000); 
  const endTimestamp = Math.floor(parseISO(endDateStr).getTime() / 1000);
  if (startTimestamp >= endTimestamp) { return []; }

  const params = new URLSearchParams({ name: commodityName, period, start: startTimestamp.toString(), end: endTimestamp.toString(), });
  const url = `${API_NINJAS_BASE_URL}/commoditypricehistorical?${params.toString()}`;
  try {
    const response = await fetch(url, { headers: { 'X-Api-Key': apiKey }, next: { revalidate: 14400 } });
    if (!response.ok) {
      const errorText = await response.text(); let errMsg = `API-Ninjas Hist. Error (${response.status}) for ${commodityName}.`;
      try { const errorJson = JSON.parse(errorText); if (errorJson.error || errorJson.message) errMsg = `API-Ninjas Hist: ${errorJson.error || errorJson.message}`; } catch (e) { /* ignore */ }
      throw new Error(errMsg);
    }
    const data: ApiNinjasHistoricalResponse = await response.json();
    if (!Array.isArray(data) || data.length === 0) { return []; }
    
    let seriesData: TimeSeriesDataPoint[] = data
      .map(item => (typeof item.close !== 'number' || typeof item.time !== 'number') ? null : { date: format(new Date(item.time * 1000), 'yyyy-MM-dd'), value: parseFloat(item.close.toFixed(4)), })
      .filter((p): p is TimeSeriesDataPoint => p !== null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    if (period === '1h' && seriesData.length > 0) {
        const dailyAggregated: TimeSeriesDataPoint[] = []; 
        const tempMap = new Map<string, TimeSeriesDataPoint>();
        seriesData.forEach(point => { tempMap.set(point.date, point); }); 
        dailyAggregated.push(...Array.from(tempMap.values())); 
        dailyAggregated.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return dailyAggregated;
    }
    return seriesData;
  } catch (error: any) { 
    if (error.message.startsWith('[API-Ninjas')) throw error;
    console.error(`[API API-Ninjas Hist] Network/Parse Error for ${commodityName}:`, error); 
    throw new Error(`[API-Ninjas Hist Network/Parse Error] ${commodityName}. Original: ${error.message?.substring(0,100)}`);
  }
}

// --- CoinGecko API Fetcher ---
export async function fetchCoinGeckoPriceHistory( coinId: string, dateRange?: { startDate?: string; endDate?: string } ): Promise<TimeSeriesDataPoint[]> {
  const apiDefaults = getApiDefaultDateRange(); 
  const startDateStr = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate; 
  const endDateStr = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;
  let fromTimestamp = Math.floor(parseISO(startDateStr).getTime() / 1000);  
  let toTimestamp = Math.floor(parseISO(endDateStr).getTime() / 1000) + (60 * 60 * 23); 
  if (fromTimestamp > toTimestamp) [fromTimestamp, toTimestamp] = [toTimestamp, fromTimestamp];

  const url = `${COINGECKO_API_URL}/coins/${coinId}/market_chart/range?vs_currency=usd&from=${fromTimestamp}&to=${toTimestamp}`;
  try {
    const response = await fetch(url, { next: { revalidate: 3600 } }); 
    if (!response.ok) { 
      const errBody = await response.text(); let errMsg = `CoinGecko Error (${response.status}) for ${coinId}.`; 
      try { const jsonError = JSON.parse(errBody); errMsg = jsonError.error?.message || jsonError.error || errMsg; } catch(e){} 
      throw new Error(`[CoinGecko API Error] ${errMsg}`); 
    }
    const data = await response.json(); if (!data.prices?.length) { return []; }
    
    const dailyData: Record<string, TimeSeriesDataPoint> = {}; 
    data.prices.forEach((p: [number, number]) => { 
        const date = format(new Date(p[0]), 'yyyy-MM-dd'); 
        dailyData[date] = { date, value: parseFloat(p[1].toFixed(2)) };
    });
    return Object.values(dailyData).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (error: any) { 
    if (error.message.startsWith('[CoinGecko')) throw error;
    console.error(`[API CoinGecko] Network/Parse Error for ${coinId}:`, error); 
    throw new Error(`[CoinGecko Network/Parse Error] ${coinId}. Original: ${error.message?.substring(0,100)}`);
  }
}

// --- Alternative.me Fear & Greed Index Fetcher ---
interface AlternativeMeFngValue { value: string; timestamp: string; value_classification: string; }
interface AlternativeMeFngResponse { name: string; data: AlternativeMeFngValue[]; metadata: { error: string | null; }; }
export async function fetchAlternativeMeFearGreedIndex( dateRange?: { startDate?: string; endDate?: string } ): Promise<TimeSeriesDataPoint[]> {
    const apiDefaults = getApiDefaultDateRange(5); 
    const startConsider = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate; 
    const endConsider = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;
    
    const daysFromTodayToStartConsider = differenceInDays(new Date(), parseISO(startConsider)); 
    const limit = Math.max(1, Math.min(daysFromTodayToStartConsider + 2, 1825)); 
    
    const url = `${ALTERNATIVE_ME_API_URL}?limit=${limit}&format=json`;
    try {
        const res = await fetch(url, { next: { revalidate: 10800 } }); 
        if (!res.ok) { const errTxt = await res.text(); throw new Error(`[Alternative.me API Error] (${res.status}). Details: ${errTxt.substring(0,100)}`); }
        const data: AlternativeMeFngResponse = await res.json(); 
        if (data.metadata.error) throw new Error(`[Alternative.me API Error] ${data.metadata.error}`);
        if (!data.data?.length) { return []; }
        
        let series: TimeSeriesDataPoint[] = data.data.map(item => ({ date: format(new Date(parseInt(item.timestamp) * 1000), 'yyyy-MM-dd'), value: parseInt(item.value, 10), })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        if (isValid(parseISO(startConsider))) series = series.filter(dp => parseISO(dp.date) >= parseISO(startConsider));
        if (isValid(parseISO(endConsider))) series = series.filter(dp => parseISO(dp.date) <= parseISO(endConsider));
        return series;
    } catch (e: any) { 
        if (e.message.startsWith('[Alternative.me')) throw e;
        console.error('[API AlternativeMe] F&G Network/Parse Error:', e); 
        throw new Error(`[Alternative.me F&G Network/Parse Error] Original: ${e.message?.substring(0,100)}`);
    }
}

// --- NewsAPI.org Fetcher ---
export interface NewsArticle { source: { id: string | null; name: string }; author: string | null; title: string; description: string | null; url: string; urlToImage: string | null; publishedAt: string; content: string | null; }
export interface NewsApiResponse { status: string; totalResults: number; articles: NewsArticle[]; message?: string; code?: string; }
export async function fetchNewsHeadlines(category: string = 'business', country: string = 'us', pageSize: number = 10): Promise<NewsArticle[]> {
  const apiKey = getApiKey('NEWSAPI_ORG'); 
  if (!apiKey) throw new Error(`[NewsAPI.org Key Missing] Cannot fetch headlines.`);

  const params = new URLSearchParams({ country, category, pageSize: pageSize.toString(), apiKey });
  const url = `${NEWSAPI_ORG_BASE_URL}/top-headlines?${params.toString()}`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } }); 
    if (!res.ok) { 
        const errData: NewsApiResponse = await res.json().catch(() => ({ status: 'error', articles:[], message: `HTTP ${res.status}`}) as any); 
        const errMsg = errData.message || errData.code || `NewsAPI Error (${res.status})`; 
        throw new Error(`[NewsAPI.org API Error] ${errMsg}`); 
    }
    const data: NewsApiResponse = await res.json(); 
    if (data.status !== 'ok') { 
        if (['apiKeyDisabled', 'apiKeyInvalid', 'keyInvalid', 'rateLimited'].includes(data.code||'')) {
            throw new Error(`[NewsAPI.org API Access Error] ${data.message || data.code}`);
        }
        return []; 
    }
    return data.articles?.filter(a => a.title && a.url) || [];
  } catch (e: any) { 
    if (e.message.startsWith('[NewsAPI.org')) throw e;
    console.error("[API NewsAPI] Network/Parse Error:", e); 
    throw new Error(`[NewsAPI.org Network/Parse Error] Original: ${e.message?.substring(0,100)}`);
  }
}

// --- Finnhub Economic Calendar Fetcher ---
export interface EconomicEvent { actual: number | null; country: string; estimate: number | null; event: string; impact: string; prev: number | null; time: string; unit: string; calendarId?: string; }
export interface EconomicCalendarResponse { economicCalendar: EconomicEvent[]; }
export async function fetchEconomicCalendar(daysAhead: number = 30): Promise<EconomicEvent[]> {
  const apiKey = getApiKey('FINNHUB'); 
  if (!apiKey) throw new Error(`[Finnhub API Key Missing] Cannot fetch economic calendar.`);

  const from = format(new Date(), 'yyyy-MM-dd'); 
  const to = format(addDays(new Date(), daysAhead), 'yyyy-MM-dd');
  const url = `${FINNHUB_API_URL}/calendar/economic?token=${apiKey}&from=${from}&to=${to}`;
  try {
    const res = await fetch(url, { next: { revalidate: 7200 } }); 
    if (!res.ok) { 
        const errTxt = await res.text(); 
        throw new Error(`[Finnhub Eco Calendar API Error] (${res.status}). Details: ${errTxt.substring(0,100)}`); 
    }
    const data: EconomicCalendarResponse | { error?: string } = await res.json(); 
    if ('error' in data && data.error) throw new Error(`[Finnhub Eco Calendar API Error] ${data.error}`);
    if (!('economicCalendar' in data) || !Array.isArray(data.economicCalendar) || data.economicCalendar.length === 0) { 
        // console.warn("[API Finnhub] No 'economicCalendar' array or empty.");
        return []; 
    }
    return data.economicCalendar.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  } catch (e: any) { 
    if (e.message.startsWith('[Finnhub')) throw e;
    console.error("[API Finnhub] Eco Calendar Network/Parse Error:", e); 
    throw new Error(`[Finnhub Eco Calendar Network/Parse Error] Original: ${e.message?.substring(0,100)}`);
  }
}

// --- Alpha Vantage Earnings Calendar ---
export interface EarningsEventAV { symbol: string; name: string; reportDate: string; fiscalDateEnding: string; estimate: number | null; currency: string; }
export async function fetchAlphaVantageEarningsCalendar( horizon: '3month' | '6month' | '12month' = '3month', symbol?: string ): Promise<EarningsEventAV[]> {
  const apiKey = getApiKey('ALPHA_VANTAGE'); 
  if (!apiKey) throw new Error(`[AlphaVantage API Key Missing] Cannot fetch earnings calendar.`);

  const params = new URLSearchParams({ function: 'EARNINGS_CALENDAR', horizon: horizon, apikey: apiKey, }); 
  if (symbol) params.set('symbol', symbol);
  const url = `${ALPHA_VANTAGE_API_URL}?${params.toString()}`;
  try {
    const response = await fetch(url, { next: { revalidate: 14400 } }); 
    if (!response.ok) { 
        const errorText = await response.text(); 
        throw new Error(`[AlphaVantage Earnings API Error] (${response.status}). Details: ${errorText.substring(0,100)}`); 
    }
    const csvData = await response.text();
    if (!csvData || csvData.trim() === '') {
        // console.warn(`[API AlphaVantage Earnings] CSV data is empty.`);
        return [];
    }
    if (csvData.toLowerCase().includes("error message")) {
        throw new Error(`[AlphaVantage Earnings API Error] Received error message in CSV: ${csvData.substring(0,100)}`);
    }
    if (csvData.toLowerCase().includes("thank you for using alpha vantage") && !csvData.toLowerCase().includes("symbol,name")) { 
       console.warn("[API AlphaVantage Earnings] Rate limit or key/access issue."); 
       throw new Error(`[AlphaVantage Earnings API Limit/Access Error] Response: ${csvData.substring(0,100)}`);
    }
    
    const parsedObjects = parseInsiderCSV(csvData); 
    return parsedObjects.map(obj => { 
        const estimateVal = obj.estimate ? parseFloat(obj.estimate) : null; 
        return { 
            symbol: obj.symbol || 'N/A', 
            name: obj.name || 'Unknown Company', 
            reportDate: obj.reportDate || '', 
            fiscalDateEnding: obj.fiscalDateEnding || '', 
            estimate: isNaN(estimateVal as any) ? null : estimateVal, 
            currency: obj.currency || 'USD', 
        }; 
    })
    .filter(event => event.symbol !== 'N/A' && event.reportDate && isValid(parseISO(event.reportDate)))
    .sort((a,b) => new Date(a.reportDate).getTime() - new Date(b.reportDate).getTime());
  } catch (error: any) { 
    if (error.message.startsWith('[AlphaVantage')) throw error;
    console.error("[API AlphaVantage Earnings] Network/Parse Error:", error); 
    throw new Error(`[AlphaVantage Earnings Network/Parse Error] Original: ${error.message?.substring(0,100)}`);
  }
}

// --- Tiingo EOD Price Fetcher ---
interface TiingoEodPrice { date: string; close: number; adjClose: number; open?: number; high?: number; low?: number; volume?: number; }
export async function fetchTiingoEodData( ticker: string, dateRange?: { startDate?: string; endDate?: string } ): Promise<TimeSeriesDataPoint[]> {
  const apiKey = getApiKey('TIINGO'); 
  if (!apiKey) throw new Error(`[Tiingo API Key Missing] Cannot fetch EOD data for ${ticker}.`);

  const apiDefaults = getApiDefaultDateRange(); 
  const startDate = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate; 
  const endDate = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;
  if (new Date(startDate) > new Date(endDate)) { return []; }
  
  const url = `${TIINGO_API_URL}/daily/${ticker.toLowerCase()}/prices?startDate=${startDate}&endDate=${endDate}&token=${apiKey}&format=json&resampleFreq=daily`;
  try {
    const response = await fetch(url, { next: { revalidate: 14400 } }); 
    if (!response.ok) {
      const errorBody = await response.text(); let errMsg = `Tiingo API Error (${response.status}) for ${ticker}.`;
      try { const errorJson = JSON.parse(errorBody); if (errorJson.detail) errMsg = `Tiingo: ${errorJson.detail}`; } catch (e) { /* ignore */ }
      throw new Error(errMsg);
    }
    const data: TiingoEodPrice[] = await response.json();
    if (!Array.isArray(data) || data.length === 0) { return []; }
    return data.map((item: TiingoEodPrice) => { 
        if (!item.date || item.adjClose === null || item.adjClose === undefined) return null; 
        const parsedDate = parseISO(item.date); 
        if (!isValid(parsedDate)) return null; 
        return { date: format(parsedDate, 'yyyy-MM-dd'), value: parseFloat(item.adjClose.toFixed(2)), }; 
    })
    .filter((point): point is TimeSeriesDataPoint => point !== null)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (error: any) { 
    if (error.message.startsWith('[Tiingo')) throw error;
    console.error(`[API Tiingo] Network/Parse Error for ${ticker}:`, error); 
    throw new Error(`[Tiingo Network/Parse Error] ${ticker}. Original: ${error.message?.substring(0,100)}`);
  }
}