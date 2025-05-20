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

// --- FRED API Fetcher (Series Observations) ---
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
  let formattedStartDate = (dateRange?.startDate && isValid(parseISO(dateRange.startDate)))
    ? dateRange.startDate : apiDefaults.startDate;
  let formattedEndDate = (dateRange?.endDate && isValid(parseISO(dateRange.endDate)))
    ? dateRange.endDate : apiDefaults.endDate;
  if (new Date(formattedStartDate) > new Date(formattedEndDate)) {
      formattedStartDate = apiDefaults.startDate; formattedEndDate = apiDefaults.endDate;
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
      console.error(`[API FRED] Error for ${seriesId}: ${response.status} - ${errorText.substring(0,500)}`);
      throw new Error(`FRED API Error (${response.status}) for ${seriesId}.`);
    }
    const data: FredResponse = await response.json();
    if (!data?.observations?.length) return [];
    return data.observations
      .map((obs: FredObservation): TimeSeriesDataPoint | null => {
        if (obs.value === '.' || !obs.date || !isValid(parseISO(obs.date))) return null;
        const value = parseFloat(obs.value);
        return isNaN(value) ? null : { date: obs.date, value };
      })
      .filter((p): p is TimeSeriesDataPoint => p !== null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (error) { console.error(`[API FRED] Network/parsing error for ${seriesId}:`, error); return []; }
}

// --- FRED API Fetcher (Releases Calendar) ---
export interface FredReleaseDate { release_id: number; release_name: string; date: string; }
export interface FredReleasesDatesResponse { release_dates: FredReleaseDate[]; count?: number; offset?: number; limit?: number; }
export async function fetchFredReleaseCalendar( _daysAheadForDisplay: number = 30, includeReleaseDatesWithNoData: boolean = false ): Promise<FredReleaseDate[]> {
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) { console.error("[API FRED Releases] Key missing."); return []; }
  const today = new Date();
  const queryStartDate = format(subDays(today, 7), 'yyyy-MM-dd'); 
  const queryEndDate = format(addDays(today, 60), 'yyyy-MM-dd');   
  const params = new URLSearchParams({
    api_key: apiKey, file_type: 'json', realtime_start: queryStartDate, 
    realtime_end: queryEndDate, include_release_dates_with_no_data: String(includeReleaseDatesWithNoData),
    limit: '200', sort_order: 'asc', 
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
        // console.warn(`[API FRED Releases] No release_dates. Data:`, data); // Can be verbose if often empty
        return []; 
    }
    
    const uniqueReleasesMap = new Map<string, FredReleaseDate>();
    data.release_dates.forEach(current => {
      if (current.date && current.release_name && current.release_id != null && isValid(parseISO(current.date))) {
        uniqueReleasesMap.set(`${current.date}-${current.release_name}`, current);
      }
    });
    const allUniqueSortedReleases = Array.from(uniqueReleasesMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); 
    // console.log(`[API FRED Releases] Returning ${allUniqueSortedReleases.length} unique entries (widget will filter for future).`);
    return allUniqueSortedReleases;
  } catch (error) { console.error(`[API FRED Releases] Error:`, error); return []; }
}

// --- Alpha Vantage API Fetcher (Stock/ETF/Currency) ---
export async function fetchAlphaVantageData( apiIdentifier: string, dateRange?: { startDate?: string; endDate?: string } ): Promise<TimeSeriesDataPoint[]> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) { console.error(`[API AlphaVantage] Key missing for ${apiIdentifier}.`); return []; }
  const apiDefaults = getApiDefaultDateRange();
  const effStart = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate;
  const effEnd = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;
  let params: URLSearchParams, dataKey: string, valKey: string, isCurrency = false;
  if (apiIdentifier.includes('/')) {
    const [from, to] = apiIdentifier.split('/');
    if (!from || !to) { console.error(`[API AlphaVantage] Invalid currency pair: ${apiIdentifier}`); return []; }
    params = new URLSearchParams({ function: 'CURRENCY_EXCHANGE_RATE', from_currency: from, to_currency: to, apikey: apiKey });
    dataKey = 'Realtime Currency Exchange Rate'; valKey = '5. Exchange Rate'; isCurrency = true;
  } else {
    const output = (isValid(parseISO(effStart)) && isValid(parseISO(effEnd)) && differenceInDays(parseISO(effEnd), parseISO(effStart)) > 90) ? 'full' : 'compact';
    params = new URLSearchParams({ function: 'TIME_SERIES_DAILY_ADJUSTED', symbol: apiIdentifier, apikey: apiKey, outputsize: output });
    dataKey = 'Time Series (Daily)'; valKey = '5. adjusted close';
  }
  const url = `${ALPHA_VANTAGE_API_URL}?${params.toString()}`;
  try {
    const res = await fetch(url, { next: { revalidate: isCurrency ? 300 : 14400 } });
    if (!res.ok) { const txt = await res.text(); console.error(`[API AlphaVantage] Error for ${apiIdentifier}: ${res.status} - ${txt.substring(0,500)}`); throw new Error(`AV Error ${res.status}`); }
    const data = await res.json();
    if (data["Error Message"]) throw new Error(`AV Error: ${data["Error Message"]}`);
    if (data["Note"]) console.warn(`[API AlphaVantage] Note for ${apiIdentifier}: ${data["Note"]}.`);
    const block = data[dataKey];
    if (!block || (typeof block === 'object' && !Object.keys(block).length)) { console.warn(`[API AlphaVantage] No data for ${apiIdentifier} in '${dataKey}'.`); return []; }
    let series: TimeSeriesDataPoint[] = [];
    if (isCurrency) {
      const rate = block[valKey] ? parseFloat(block[valKey]) : NaN;
      if (!isNaN(rate)) series = [{ date: format(new Date(), 'yyyy-MM-dd'), value: parseFloat(rate.toFixed(4)) }];
    } else {
        series = Object.keys(block).map(dateStr => {
          if (!isValid(parseISO(dateStr))) return null;
          const dayData = block[dateStr]; const valStr = dayData[valKey] || dayData['4. close'];
          if (valStr === undefined) return null; const value = parseFloat(valStr);
          return isNaN(value) ? null : { date: dateStr, value };
        }).filter(dp => dp !== null) as TimeSeriesDataPoint[];
    }
    if (!isCurrency) {
      series.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
      if (isValid(parseISO(effStart))) series = series.filter(dp => parseISO(dp.date) >= parseISO(effStart));
      if (isValid(parseISO(effEnd))) series = series.filter(dp => parseISO(dp.date) <= parseISO(effEnd));
    } return series;
  } catch (e) { console.error(`[API AlphaVantage] Network/parse error for ${apiIdentifier}:`, e); return []; }
}

// --- Alpha Vantage News & Sentiment ---
export interface NewsSentimentArticle { title: string; url: string; time_published: string; authors: string[]; summary: string; banner_image: string | null; source: string; category_within_source: string | null; source_domain: string; topics: Array<{ topic: string; relevance_score: string }>; overall_sentiment_score: number; overall_sentiment_label: string; ticker_sentiment: Array<{ ticker: string; relevance_score: string; ticker_sentiment_score: string; ticker_sentiment_label: string; }>; }
export interface AlphaVantageNewsSentimentResponse { items: string; sentiment_score_definition: string; relevance_score_definition: string; feed: NewsSentimentArticle[]; "Information"?: string; "Error Message"?: string; }
export async function fetchAlphaVantageNewsSentiment( tickers?: string, topics?: string, limit: number = 5 ): Promise<NewsSentimentArticle[]> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) { console.error("[API AlphaVantage News] Key missing."); return []; }
  const params = new URLSearchParams({ function: 'NEWS_SENTIMENT', apikey: apiKey, limit: String(Math.min(limit, 50)), });
  if (tickers) params.set('tickers', tickers); if (topics) params.set('topics', topics);
  const url = `${ALPHA_VANTAGE_API_URL}?${params.toString()}`;
  try {
    const response = await fetch(url, { next: { revalidate: 3600 } });
    if (!response.ok) {
      const errorText = await response.text(); console.error(`[API AlphaVantage News] Error: ${response.status} - ${errorText.substring(0,300)}`);
      throw new Error(`AV News API Error (${response.status}).`);
    }
    const data: AlphaVantageNewsSentimentResponse = await response.json();
    if (data["Information"] || data["Error Message"]) {
      const message = data["Information"] || data["Error Message"]; console.warn(`[API AlphaVantage News] Message: ${message}`);
      if (message?.includes("higher API call frequency")) console.error("[API AlphaVantage News] Rate limit."); return [];
    }
    if (!data.feed || !Array.isArray(data.feed)) { console.warn("[API AlphaVantage News] No feed array."); return []; }
    return data.feed;
  } catch (error) { console.error("[API AlphaVantage News] Error:", error); return []; }
}

// --- Alpha Vantage Insider Transactions ---
export interface InsiderTransaction { symbol: string; filingDate: string; transactionDate: string; reportingCik: string; reportingName: string; reportingTitle: string; transactionType: string; transactionCode: string; shares: string; value: string; pricePerShare: string; }
function parseCSV(csvText: string): Record<string, string>[] {
    const lines = csvText.trim().split('\n'); if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/^"/, '').replace(/"$/, '')); 
    return lines.slice(1).map(rowText => { 
        const values = rowText.split(',').map(v => v.trim().replace(/^"/, '').replace(/"$/, '')); 
        const rowObject: Record<string, string> = {}; 
        headers.forEach((header, index) => { rowObject[header] = values[index] || ''; }); 
        return rowObject; 
    });
}
export async function fetchAlphaVantageInsiderTransactions( 
  ticker: string, 
  limit: number = 10 
): Promise<InsiderTransaction[]> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) { console.error("[API AlphaVantage Insider] Key missing."); return []; }
  if (!ticker) { console.error("[API AlphaVantage Insider] Symbol is required."); return []; }

  const params = new URLSearchParams({ 
    function: 'INSIDER_TRANSACTIONS', 
    apikey: apiKey, 
    symbol: ticker.toUpperCase() 
  });
  const url = `${ALPHA_VANTAGE_API_URL}?${params.toString()}`;
  
  try {
    // MODIFIED FETCH OPTIONS HERE:
    const response = await fetch(url, { 
      cache: 'no-store' // Disable caching for this specific large response
    }); 

    if (!response.ok) {
      const errorText = await response.text(); 
      let errorDetail = errorText.substring(0,500);
      try { const jsonError = JSON.parse(errorText); errorDetail = jsonError["Error Message"] || jsonError["Information"] || errorDetail; } catch(e) {}
      console.error(`[API AlphaVantage Insider] Error for ${ticker}: ${response.status} - ${errorDetail}`);
      throw new Error(`AV Insider API Error (${response.status}) for ${ticker}.`);
    }
    const csvData = await response.text();
    if (!csvData || csvData.trim() === '' || csvData.toLowerCase().includes("error message") || (csvData.toLowerCase().includes("information") && csvData.toLowerCase().includes("api call frequency"))) {
      console.warn(`[API AlphaVantage Insider] Empty/error/info CSV for ${ticker}: ${csvData.substring(0,200)}`);
      if (csvData.toLowerCase().includes("thank you for using alpha vantage") && !csvData.toLowerCase().includes("symbol,companyName")) {
         console.warn("[API AlphaVantage Insider] Rate limit or key issue for " + ticker);
      } return [];
    }
    
    const parsedObjects = parseCSV(csvData); 
    const transactions: InsiderTransaction[] = parsedObjects.map(obj => ({
      symbol: obj.symbol?.toUpperCase() || 'N/A',
      filingDate: obj.filingDate || '', 
      transactionDate: obj.transactionDate || '',
      reportingCik: obj.reporterCik || '',
      reportingName: obj.reporterName || 'Unknown Insider',
      reportingTitle: obj.reporterRelationship || 'N/A', 
      transactionType: obj.transactionType || 'N/A',
      transactionCode: obj.transactionCode || 'N/A',
      shares: obj.shares || '0',
      value: obj.value || '0', 
      pricePerShare: obj.pricePerShare || '0',
    }))
    .filter(t => t.symbol !== 'N/A' && t.filingDate && isValid(parseISO(t.filingDate)))
    .sort((a,b) => new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime())
    .slice(0, limit); 
    return transactions;
  } catch (error) { 
    console.error(`[API AlphaVantage Insider] Network/parsing error for ${ticker}:`, error); 
    return []; 
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
      console.error(`[API DB.nomics] Error for ${fullSeriesCode}: ${response.status} - Body: ${errorBody.substring(0,500)}`); throw new Error(errMsg);
    }
    const data: DbNomicsResponse = await response.json();
    if (data.message && data.message.toLowerCase().includes("error")) { console.warn(`[API DB.nomics] Message: ${data.message} for ${fullSeriesCode}`); if (data.message.includes("Invalid value")) throw new Error(`DB.nomics API Error: ${data.message}`); return []; }
    if (!data.series?.docs?.length) { console.warn(`[API DB.nomics] No series.docs for ${fullSeriesCode}.`); return []; }
    const seriesObject = data.series.docs[0];
    if (!seriesObject || !seriesObject.period || !seriesObject.value || !Array.isArray(seriesObject.period) || !Array.isArray(seriesObject.value)) { console.warn(`[API DB.nomics] Malformed for ${fullSeriesCode}.`); return []; }
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
  } catch (error) { console.error(`[API DB.nomics] Error for ${fullSeriesCode}:`, error); return []; }
}

// --- Polygon.io API Fetcher ---
interface PolygonAggregatesResult { c: number; h: number; l: number; n: number; o: number; t: number; v: number; vw: number; }
interface PolygonAggregatesResponse { ticker?: string; queryCount?: number; resultsCount?: number; adjusted?: boolean; results?: PolygonAggregatesResult[]; status?: string; request_id?: string; count?: number; message?: string; }
export async function fetchPolygonIOData( ticker: string, dateRange?: { startDate?: string; endDate?: string } ): Promise<TimeSeriesDataPoint[]> {
  const apiKey = process.env.POLYGON_API_KEY; if (!apiKey) { console.error(`[API Polygon.io] Key missing for ${ticker}.`); return []; }
  const apiDefaults = getApiDefaultDateRange(2); const startDate = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate; const endDate = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;
  if (new Date(startDate) > new Date(endDate)) { console.warn(`[API Polygon.io] Invalid range for ${ticker}.`); return []; }
  const params = new URLSearchParams({ adjusted: 'true', sort: 'asc', limit: '5000', apiKey: apiKey, });
  const url = `${POLYGON_API_URL}/aggs/ticker/${ticker}/range/1/day/${startDate}/${endDate}?${params.toString()}`;
  try {
    const response = await fetch(url, { next: { revalidate: 14400 } });
    if (!response.ok) {
      const errorBody = await response.text(); let errMsg = `Polygon.io Error (${response.status}) for ${ticker}.`;
      try { const errorJson: PolygonAggregatesResponse = JSON.parse(errorBody); if (errorJson.message) errMsg = `Polygon.io: ${errorJson.message}`; } catch (e) { /* ignore */ }
      console.error(`[API Polygon.io] Error for ${ticker}: ${response.status} - Body: ${errorBody.substring(0,500)}`); throw new Error(errMsg);
    }
    const data: PolygonAggregatesResponse = await response.json();
    if (data.status === 'ERROR' || (data.message && data.status !== 'OK' && data.status !== 'DELAYED')) throw new Error(`Polygon.io API Error: ${data.message || data.status}`);
    if (!data.results?.length) { console.warn(`[API Polygon.io] No results for ${ticker}.`); return []; }
    return data.results.map((agg: PolygonAggregatesResult) => ({ date: format(new Date(agg.t), 'yyyy-MM-dd'), value: parseFloat(agg.c.toFixed(4)), }));
  } catch (error) { console.error(`[API Polygon.io] Error for ${ticker}:`, error); return []; }
}

// --- API-Ninjas.com Commodity Latest Price Fetcher ---
interface ApiNinjasCommodityLatestPriceResponse { name: string; price: number; updated: number; unit?:string; exchange?:string;}
export async function fetchApiNinjasMetalPrice( commodityName: string ): Promise<TimeSeriesDataPoint[]> {
  const apiKey = process.env.API_NINJAS_KEY; if (!apiKey) { console.error(`[API API-Ninjas Commodity] Key missing for ${commodityName}.`); return []; }
  const url = `${API_NINJAS_BASE_URL}/commodityprice?name=${encodeURIComponent(commodityName)}`;
  try {
    const response = await fetch(url, { headers: { 'X-Api-Key': apiKey }, next: { revalidate: 300 } });
    if (!response.ok) {
      const errorText = await response.text(); let errMsg = `API-Ninjas Price Error (${response.status}) for ${commodityName}.`;
      try { const errorJson = JSON.parse(errorText); if (errorJson.message || errorJson.error) errMsg = `API-Ninjas: ${errorJson.message || errorJson.error}`; } catch (e) { /* ignore */ }
      console.error(`[API API-Ninjas Commodity] Error for ${commodityName}: ${response.status} - Body: ${errorText.substring(0,500)}`); throw new Error(errMsg);
    }
    const data: ApiNinjasCommodityLatestPriceResponse = await response.json();
    if (typeof data?.price !== 'number' || typeof data?.updated !== 'number') { console.warn(`[API API-Ninjas Commodity] Invalid data for ${commodityName}.`); return []; }
    return [{ date: format(new Date(data.updated * 1000), 'yyyy-MM-dd'), value: parseFloat(data.price.toFixed(4)), }];
  } catch (error) { console.error(`[API API-Ninjas Commodity] Error for ${commodityName}:`, error); return []; }
}

// --- API-Ninjas.com Commodity Historical Price Fetcher ---
interface ApiNinjasHistoricalDataPoint { open: number; low: number; high: number; close: number; time: number; volume?:number; }
type ApiNinjasHistoricalResponse = ApiNinjasHistoricalDataPoint[];
export async function fetchApiNinjasCommodityHistoricalPrice( commodityName: string, dateRange?: { startDate?: string; endDate?: string }, period: '1h' | '1d' = '1d' ): Promise<TimeSeriesDataPoint[]> {
  const apiKey = process.env.API_NINJAS_KEY; if (!apiKey) { console.error(`[API API-Ninjas Hist] Key missing for ${commodityName}.`); return []; }
  const apiDefaults = getApiDefaultDateRange(1); const startDateStr = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate; const endDateStr = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;
  const startTimestamp = Math.floor(parseISO(startDateStr).getTime() / 1000); const endTimestamp = Math.floor(parseISO(endDateStr).getTime() / 1000);
  if (startTimestamp >= endTimestamp) { console.warn(`[API API-Ninjas Hist] Invalid range for ${commodityName}.`); return []; }
  const params = new URLSearchParams({ name: commodityName, period, start: startTimestamp.toString(), end: endTimestamp.toString(), });
  const url = `${API_NINJAS_BASE_URL}/commoditypricehistorical?${params.toString()}`;
  try {
    const response = await fetch(url, { headers: { 'X-Api-Key': apiKey }, next: { revalidate: 14400 } });
    if (!response.ok) {
      const errorText = await response.text(); let errMsg = `API-Ninjas Hist. Error (${response.status}) for ${commodityName}.`;
      try { const errorJson = JSON.parse(errorText); if (errorJson.error || errorJson.message) errMsg = `API-Ninjas Hist: ${errorJson.error || errorJson.message}`; } catch (e) { /* ignore */ }
      console.error(`[API API-Ninjas Hist] Error for ${commodityName}: ${response.status} - Body: ${errorText.substring(0,500)}`); throw new Error(errMsg);
    }
    const data: ApiNinjasHistoricalResponse = await response.json();
    if (!Array.isArray(data) || data.length === 0) { console.warn(`[API API-Ninjas Hist] No data for ${commodityName}.`); return []; }
    let seriesData: TimeSeriesDataPoint[] = data.map(item => (typeof item.close !== 'number' || typeof item.time !== 'number') ? null : { date: format(new Date(item.time * 1000), 'yyyy-MM-dd'), value: parseFloat(item.close.toFixed(4)), }).filter((p): p is TimeSeriesDataPoint => p !== null).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (period === '1h' && seriesData.length > 0) {
        const dailyAggregated: TimeSeriesDataPoint[] = []; const tempMap = new Map<string, TimeSeriesDataPoint>();
        seriesData.forEach(point => { tempMap.set(point.date, point); }); dailyAggregated.push(...Array.from(tempMap.values())); dailyAggregated.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        return dailyAggregated;
    }
    return seriesData;
  } catch (error) { console.error(`[API API-Ninjas Hist] Error for ${commodityName}:`, error); return []; }
}

// --- CoinGecko API Fetcher ---
export async function fetchCoinGeckoPriceHistory( coinId: string, dateRange?: { startDate?: string; endDate?: string } ): Promise<TimeSeriesDataPoint[]> {
  const apiDefaults = getApiDefaultDateRange(); const startDateStr = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate; const endDateStr = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;
  let fromTimestamp = Math.floor(parseISO(startDateStr).getTime() / 1000);  let toTimestamp = Math.floor(parseISO(endDateStr).getTime() / 1000) + (60 * 60 * 23);
  if (fromTimestamp > toTimestamp) [fromTimestamp, toTimestamp] = [toTimestamp, fromTimestamp];
  const url = `${COINGECKO_API_URL}/coins/${coinId}/market_chart/range?vs_currency=usd&from=${fromTimestamp}&to=${toTimestamp}`;
  try {
    const response = await fetch(url, { next: { revalidate: 3600 } }); 
    if (!response.ok) { 
      const errBody = await response.text(); let errMsg = `CoinGecko Error (${response.status}) for ${coinId}.`; 
      try { errMsg = JSON.parse(errBody).error?.message || JSON.parse(errBody).error || errMsg; } catch(e){} 
      console.error(`[API CoinGecko] Error for ${coinId}: ${response.status} - ${errBody.substring(0,500)}`); throw new Error(errMsg); 
    }
    const data = await response.json(); if (!data.prices?.length) { console.warn(`[API CoinGecko] No prices for ${coinId}.`); return []; }
    const dailyData: Record<string, TimeSeriesDataPoint> = {}; data.prices.forEach((p: [number, number]) => { const date = format(new Date(p[0]), 'yyyy-MM-dd'); dailyData[date] = { date, value: parseFloat(p[1].toFixed(2)) }; });
    return Object.values(dailyData).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (error) { console.error(`[API CoinGecko] Error for ${coinId}:`, error); return []; }
}

// --- Alternative.me Fear & Greed Index Fetcher ---
interface AlternativeMeFngValue { value: string; timestamp: string; value_classification: string; }
interface AlternativeMeFngResponse { name: string; data: AlternativeMeFngValue[]; metadata: { error: string | null; }; }
export async function fetchAlternativeMeFearGreedIndex( dateRange?: { startDate?: string; endDate?: string } ): Promise<TimeSeriesDataPoint[]> {
    const apiDefaults = getApiDefaultDateRange(5); const startConsider = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate; const endConsider = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;
    const daysFromTodayToStartConsider = differenceInDays(new Date(), parseISO(startConsider)); const limit = Math.max(1, Math.min(daysFromTodayToStartConsider + 2, 1825)); 
    const url = `${ALTERNATIVE_ME_API_URL}?limit=${limit}&format=json`;
    try {
        const res = await fetch(url, { next: { revalidate: 10800 } }); 
        if (!res.ok) { const errTxt = await res.text(); console.error(`[API AlternativeMe] F&G Error: ${res.status} - ${errTxt.substring(0,500)}`); throw new Error(`Alternative.me Error ${res.status}.`); }
        const data: AlternativeMeFngResponse = await res.json(); if (data.metadata.error) throw new Error(`Alternative.me API Error: ${data.metadata.error}`);
        if (!data.data?.length) { console.warn(`[API AlternativeMe] No F&G data.`); return []; }
        let series: TimeSeriesDataPoint[] = data.data.map(item => ({ date: format(new Date(parseInt(item.timestamp) * 1000), 'yyyy-MM-dd'), value: parseInt(item.value, 10), })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        if (isValid(parseISO(startConsider))) series = series.filter(dp => parseISO(dp.date) >= parseISO(startConsider));
        if (isValid(parseISO(endConsider))) series = series.filter(dp => parseISO(dp.date) <= parseISO(endConsider));
        return series;
    } catch (e) { console.error('[API AlternativeMe] F&G Error:', e); return []; }
}

// --- NewsAPI.org Fetcher ---
export interface NewsArticle { source: { id: string | null; name: string }; author: string | null; title: string; description: string | null; url: string; urlToImage: string | null; publishedAt: string; content: string | null; }
export interface NewsApiResponse { status: string; totalResults: number; articles: NewsArticle[]; message?: string; code?: string; }
export async function fetchNewsHeadlines(category: string = 'business', country: string = 'us', pageSize: number = 10): Promise<NewsArticle[]> {
  const apiKey = process.env.NEWSAPI_ORG_KEY; if (!apiKey) { console.error("[API NewsAPI] Key missing."); return []; }
  const params = new URLSearchParams({ country, category, pageSize: pageSize.toString(), apiKey });
  const url = `${NEWSAPI_ORG_BASE_URL}/top-headlines?${params.toString()}`;
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } }); 
    if (!res.ok) { const errData: NewsApiResponse = await res.json().catch(() => ({ status: 'error', articles:[], message: `HTTP ${res.status}`}) as any); const errMsg = errData.message || errData.code || `NewsAPI Error (${res.status})`; console.error(`[API NewsAPI] Error for ${category}/${country}: ${errMsg}`); throw new Error(errMsg); }
    const data: NewsApiResponse = await res.json(); if (data.status !== 'ok') { console.warn(`[API NewsAPI] Status not 'ok' for ${category}/${country}: ${data.message || data.code}`); if (['apiKeyDisabled', 'apiKeyInvalid', 'keyInvalid'].includes(data.code||'')) console.error("[API NewsAPI] Key issue."); return []; }
    return data.articles?.filter(a => a.title && a.url) || [];
  } catch (e) { console.error("[API NewsAPI] Error:", e); return []; }
}

// --- Finnhub Economic Calendar Fetcher ---
export interface EconomicEvent { actual: number | null; country: string; estimate: number | null; event: string; impact: string; prev: number | null; time: string; unit: string; calendarId?: string; }
export interface EconomicCalendarResponse { economicCalendar: EconomicEvent[]; }
export async function fetchEconomicCalendar(daysAhead: number = 30): Promise<EconomicEvent[]> {
  const apiKey = process.env.FINNHUB_API_KEY; if (!apiKey) { console.error("[API Finnhub] Key missing."); return []; }
  const from = format(new Date(), 'yyyy-MM-dd'); const to = format(addDays(new Date(), daysAhead), 'yyyy-MM-dd');
  const url = `${FINNHUB_API_URL}/calendar/economic?token=${apiKey}&from=${from}&to=${to}`;
  try {
    const res = await fetch(url, { next: { revalidate: 7200 } }); 
    if (!res.ok) { const errTxt = await res.text(); console.error(`[API Finnhub] Eco Calendar Error ${res.status}: ${errTxt.substring(0,300)}`); throw new Error(`Finnhub Eco Calendar Error (${res.status}).`); }
    const data: EconomicCalendarResponse | { error?: string } = await res.json(); if ('error' in data && data.error) throw new Error(`Finnhub Eco Calendar API: ${data.error}`);
    if (!('economicCalendar' in data) || !Array.isArray(data.economicCalendar)) { console.warn("[API Finnhub] No 'economicCalendar' array."); return []; }
    return data.economicCalendar.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
  } catch (e) { console.error("[API Finnhub] Eco Calendar Error:", e); return []; }
}

// --- Alpha Vantage Earnings Calendar ---
export interface EarningsEventAV { symbol: string; name: string; reportDate: string; fiscalDateEnding: string; estimate: number | null; currency: string; }
// parseCSV function is defined above
export async function fetchAlphaVantageEarningsCalendar( horizon: '3month' | '6month' | '12month' = '3month', symbol?: string ): Promise<EarningsEventAV[]> {
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY; if (!apiKey) { console.error("[API AlphaVantage Earnings] Key missing."); return []; }
  const params = new URLSearchParams({ function: 'EARNINGS_CALENDAR', horizon: horizon, apikey: apiKey, }); if (symbol) params.set('symbol', symbol);
  const url = `${ALPHA_VANTAGE_API_URL}?${params.toString()}`;
  try {
    const response = await fetch(url, { next: { revalidate: 14400 } }); 
    if (!response.ok) { const errorText = await response.text(); console.error(`[API AlphaVantage Earnings] Error: ${response.status} - ${errorText.substring(0, 300)}`); throw new Error(`AV Earnings API Error (${response.status}).`); }
    const csvData = await response.text();
    if (!csvData || csvData.trim() === '' || csvData.toLowerCase().includes("error message") || csvData.toLowerCase().includes("thank you for using alpha vantage")) { console.warn(`[API AlphaVantage Earnings] Empty/error CSV: ${csvData.substring(0, 200)}`); if (csvData.toLowerCase().includes("thank you for using alpha vantage") && !csvData.toLowerCase().includes("symbol,name")) { console.warn("[API AlphaVantage Earnings] Rate limit/key issue."); } return []; }
    const parsedObjects = parseCSV(csvData);
    return parsedObjects.map(obj => { const estimateVal = obj.estimate ? parseFloat(obj.estimate) : null; return { symbol: obj.symbol || 'N/A', name: obj.name || 'Unknown Company', reportDate: obj.reportDate || '', fiscalDateEnding: obj.fiscalDateEnding || '', estimate: isNaN(estimateVal as any) ? null : estimateVal, currency: obj.currency || 'USD', }; }).filter(event => event.symbol !== 'N/A' && isValid(parseISO(event.reportDate))).sort((a,b) => new Date(a.reportDate).getTime() - new Date(b.date).getTime());
  } catch (error) { console.error("[API AlphaVantage Earnings] Error:", error); return []; }
}

// --- Tiingo EOD Price Fetcher ---
interface TiingoEodPrice { date: string; close: number; adjClose: number; open?: number; high?: number; low?: number; volume?: number; }
export async function fetchTiingoEodData( ticker: string, dateRange?: { startDate?: string; endDate?: string } ): Promise<TimeSeriesDataPoint[]> {
  const apiKey = process.env.TIINGO_API_KEY; if (!apiKey) { console.error(`[API Tiingo] Key missing for ${ticker}.`); return []; }
  const apiDefaults = getApiDefaultDateRange(); const startDate = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate; const endDate = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;
  if (new Date(startDate) > new Date(endDate)) { console.warn(`[API Tiingo] Invalid range for ${ticker}.`); return []; }
  const url = `${TIINGO_API_URL}/daily/${ticker.toLowerCase()}/prices?startDate=${startDate}&endDate=${endDate}&token=${apiKey}&format=json&resampleFreq=daily`;
  try {
    const response = await fetch(url, { next: { revalidate: 14400 } }); 
    if (!response.ok) {
      const errorBody = await response.text(); let errMsg = `Tiingo API Error (${response.status}) for ${ticker}.`;
      try { const errorJson = JSON.parse(errorBody); if (errorJson.detail) errMsg = `Tiingo: ${errorJson.detail}`; } catch (e) { /* ignore */ }
      console.error(`[API Tiingo] Error for ${ticker}: ${response.status} - Body: ${errorBody.substring(0,500)}`); throw new Error(errMsg);
    }
    const data: TiingoEodPrice[] = await response.json();
    if (!Array.isArray(data) || data.length === 0) { console.warn(`[API Tiingo] No data for ${ticker}.`); return []; }
    return data.map((item: TiingoEodPrice) => { if (!item.date || item.adjClose === null || item.adjClose === undefined) return null; const parsedDate = parseISO(item.date); if (!isValid(parsedDate)) return null; return { date: format(parsedDate, 'yyyy-MM-dd'), value: parseFloat(item.adjClose.toFixed(2)), }; }).filter((point): point is TimeSeriesDataPoint => point !== null).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  } catch (error) { console.error(`[API Tiingo] Error for ${ticker}:`, error); return []; }
}