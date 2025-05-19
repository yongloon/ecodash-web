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
  // console.log(`[fetchFredSeries API - ENTRY] Called with: seriesId=${seriesId}, dateRange=${JSON.stringify(dateRange)}`);
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
  // console.log(`[API FRED] Attempting to fetch: ${seriesId} (${formattedStartDate} to ${formattedEndDate}) from URL: ${url.replace(apiKey, "REDACTED_KEY")}`);

  try {
    const response = await fetch(url, { next: { revalidate: 21600 } }); 
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API FRED] Error response for ${seriesId}: ${response.status} - ${errorText.substring(0,500)}`);
      throw new Error(`FRED API Error (${response.status}) for ${seriesId}.`);
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
    // console.log(`[API FRED] Parsed ${seriesData.length} valid points for ${seriesId}`);
    return seriesData;
  } catch (error) {
    console.error(`[API FRED] Network or parsing error for ${seriesId}:`, error);
    return [];
  }
}

// --- FRED API Fetcher (Releases Calendar) ---
export interface FredReleaseDate {
  release_id: number;
  release_name: string;
  date: string; 
}
export interface FredReleasesDatesResponse {
  release_dates: FredReleaseDate[];
  count?: number;
  offset?: number;
  limit?: number;
}

export async function fetchFredReleaseCalendar(
  _daysAheadForDisplay: number = 30, 
  includeReleaseDatesWithNoData: boolean = false
): Promise<FredReleaseDate[]> {
  // console.log(`[fetchFredReleaseCalendar API - ENTRY] Called`);
  const apiKey = process.env.FRED_API_KEY;
  if (!apiKey) {
    console.error("[API FRED Releases] FRED_API_KEY is missing.");
    return [];
  }

  const today = new Date();
  const queryStartDate = format(subDays(today, 7), 'yyyy-MM-dd'); 
  const queryEndDate = format(addDays(today, 60), 'yyyy-MM-dd');   

  const params = new URLSearchParams({
    api_key: apiKey,
    file_type: 'json',
    realtime_start: queryStartDate, 
    realtime_end: queryEndDate,     
    include_release_dates_with_no_data: String(includeReleaseDatesWithNoData),
    limit: '200', 
    sort_order: 'asc', 
  });

  const url = `${FRED_API_RELEASES_URL}/releases/dates?${params.toString()}`;
  // console.log(`[API FRED Releases] Attempting to fetch: ${url.replace(apiKey, "REDACTED_KEY")}`);

  try {
    const response = await fetch(url, { next: { revalidate: 43200 } }); 
    // console.log(`[API FRED Releases] Response status: ${response.status}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API FRED Releases] Error response: ${response.status} - Body: ${errorText.substring(0, 500)}`);
      throw new Error(`FRED Releases API Error (${response.status}).`);
    }
    const data: FredReleasesDatesResponse = await response.json();

    if (!data || !data.release_dates || !Array.isArray(data.release_dates)) {
      console.warn(`[API FRED Releases] No valid release_dates array in response. Data:`, data);
      return [];
    }
    // console.log(`[API FRED Releases] Raw release_dates count: ${data.release_dates.length}`);
        
    const uniqueReleasesMap = new Map<string, FredReleaseDate>();
    let validEntriesFromApi = 0;
    let invalidDateEntries = 0;

    data.release_dates.forEach(current => {
      if (current.date && current.release_name && current.release_id != null) {
        if (isValid(parseISO(current.date))) {
          validEntriesFromApi++;
          const key = `${current.date}-${current.release_name}`; 
          if (!uniqueReleasesMap.has(key)) {
            uniqueReleasesMap.set(key, current);
          }
        } else {
          invalidDateEntries++;
          // console.warn(`[API FRED Releases] Invalid date format in entry:`, current);
        }
      } else {
        // console.warn(`[API FRED Releases] Entry missing essential fields:`, current);
      }
    });
    // console.log(`[API FRED Releases] Valid entries from API (with date, name, id): ${validEntriesFromApi}`);
    if (invalidDateEntries > 0) {
      // console.log(`[API FRED Releases] Entries with invalid date formats skipped: ${invalidDateEntries}`);
    }

    const allUniqueSortedReleases = Array.from(uniqueReleasesMap.values())
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()); 

    console.log(`[API FRED Releases] Returning ${allUniqueSortedReleases.length} unique release schedule entries (not filtered for future within API call).`);
    if (allUniqueSortedReleases.length > 0) {
        // console.log(`[API FRED Releases] Sample all unique:`, JSON.stringify(allUniqueSortedReleases.slice(0,3), null, 2));
    }
    return allUniqueSortedReleases;
  } catch (error) {
    console.error(`[API FRED Releases] Network or parsing error:`, error);
    return [];
  }
}


// --- Alpha Vantage API Fetcher ---
export async function fetchAlphaVantageData(
  apiIdentifier: string,
  dateRange?: { startDate?: string; endDate?: string }
): Promise<TimeSeriesDataPoint[]> {
  // console.log(`[fetchAlphaVantageData API - ENTRY] Called with: apiIdentifier=${apiIdentifier}, dateRange=${JSON.stringify(dateRange)}`);
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
  let isCurrencyPair = false;

  if (apiIdentifier.includes('/')) {
    const parts = apiIdentifier.split('/');
    if (parts.length === 2) {
      params = new URLSearchParams({
        function: 'CURRENCY_EXCHANGE_RATE',
        from_currency: parts[0],
        to_currency: parts[1],
        apikey: apiKey,
      });
      dataKeyInResponse = 'Realtime Currency Exchange Rate';
      valueKeyInDataPoint = '5. Exchange Rate';
      isCurrencyPair = true;
    } else {
      console.error(`[API AlphaVantage] Invalid currency pair format for ${apiIdentifier}. Expected FROM/TO.`);
      return [];
    }
  } else {
    let outputSize = 'compact';
    if (isValid(parseISO(effectiveStartDateStr)) && isValid(parseISO(effectiveEndDateStr))) {
      if (differenceInDays(parseISO(effectiveEndDateStr), parseISO(effectiveStartDateStr)) > 90) outputSize = 'full';
    }
    params = new URLSearchParams({ function: 'TIME_SERIES_DAILY_ADJUSTED', symbol: apiIdentifier, apikey: apiKey, outputsize: outputSize });
    dataKeyInResponse = 'Time Series (Daily)'; valueKeyInDataPoint = '5. adjusted close';
  }

  const url = `${ALPHA_VANTAGE_API_URL}?${params.toString()}`;
  // console.log(`[API AlphaVantage] Attempting to fetch: ${url.replace(apiKey, "REDACTED_KEY")}`);

  try {
    const response = await fetch(url, { next: { revalidate: isCurrencyPair ? 300 : 14400 } });
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[API AlphaVantage] Error response for ${apiIdentifier}: ${response.status} - ${errorText.substring(0,500)}`);
      throw new Error(`Alpha Vantage API Error (${response.status}) for ${apiIdentifier}.`);
    }
    const data = await response.json();

    if (data["Error Message"]) {
      console.error(`[API AlphaVantage] API returned error for ${apiIdentifier}: ${data["Error Message"]}`);
      throw new Error(`Alpha Vantage API Error: ${data["Error Message"]}`);
    }
    if (data["Note"]) console.warn(`[API AlphaVantage] API Note for ${apiIdentifier}: ${data["Note"]}.`);

    const responseDataBlock = data[dataKeyInResponse];
    if (!responseDataBlock || (typeof responseDataBlock === 'object' && Object.keys(responseDataBlock).length === 0)) {
      console.warn(`[API AlphaVantage] No '${dataKeyInResponse}' data or empty data object in response for ${apiIdentifier}.`);
      return [];
    }

    let seriesData: TimeSeriesDataPoint[] = [];

    if (isCurrencyPair) {
      const rateStr = responseDataBlock[valueKeyInDataPoint];
      if (rateStr !== undefined) {
        const value = parseFloat(rateStr);
        if (!isNaN(value)) {
          seriesData = [{
            date: format(new Date(), 'yyyy-MM-dd'),
            value: parseFloat(value.toFixed(4))
          }];
        } else {
            console.warn(`[API AlphaVantage] Could not parse exchange rate value for ${apiIdentifier}: ${rateStr}`);
        }
      } else {
          console.warn(`[API AlphaVantage] Exchange rate key '${valueKeyInDataPoint}' not found for ${apiIdentifier}.`);
      }
    } else if (Array.isArray(responseDataBlock)) {
        seriesData = (responseDataBlock as Array<{ date: string; value: string }>)
          .map(item => {
            if (!item.date || !isValid(parseISO(item.date)) || item.value === undefined) return null;
            const val = parseFloat(item.value);
            return isNaN(val) ? null : { date: item.date, value: val };
          }).filter(dp => dp !== null) as TimeSeriesDataPoint[];
    } else {
        seriesData = Object.keys(responseDataBlock)
          .map(dateStr => {
            if (!isValid(parseISO(dateStr))) return null;
            const dayData = responseDataBlock[dateStr];
            const valueStr = dayData[valueKeyInDataPoint] || dayData['4. close'];
            if (valueStr === undefined) return null;
            const value = parseFloat(valueStr);
            return isNaN(value) ? null : { date: dateStr, value: value };
          }).filter(dp => dp !== null) as TimeSeriesDataPoint[];
    }

    if (!isCurrencyPair) {
        seriesData.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let filteredSeriesData = seriesData;
        if (isValid(parseISO(effectiveStartDateStr))) filteredSeriesData = filteredSeriesData.filter(dp => parseISO(dp.date) >= parseISO(effectiveStartDateStr));
        if (isValid(parseISO(effectiveEndDateStr))) filteredSeriesData = filteredSeriesData.filter(dp => parseISO(dp.date) <= parseISO(effectiveEndDateStr));
        // console.log(`[API AlphaVantage] Parsed ${seriesData.length} raw points, ${filteredSeriesData.length} after date filtering for ${apiIdentifier}`);
        return filteredSeriesData;
    } else {
        // console.log(`[API AlphaVantage] Parsed ${seriesData.length} points (single quote) for ${apiIdentifier}`);
        return seriesData;
    }

  } catch (error) {
    console.error(`[API AlphaVantage] Network or parsing error for ${apiIdentifier}:`, error);
    return [];
  }
}

// --- DB.nomics API Fetcher ---
interface DbNomicsSeriesDoc { // Represents the structure inside series.docs
  '@frequency'?: string;
  dataset_code?: string;
  dataset_name?: string;
  dimensions?: any;
  indexed_at?: string;
  period: string[]; // Array of date strings like "2020-05"
  period_start_day?: string[]; // Array of date strings like "2020-05-01"
  provider_code?: string;
  series_code?: string;
  series_name?: string;
  value: (number | null)[]; // Array of values corresponding to period
}

interface DbNomicsSeriesWrapper { // Represents the structure of series array items
  docs: DbNomicsSeriesDoc[]; // Array containing one DbNomicsSeriesDoc
  // ... other potential fields if series has more than just docs
  limit?: number;
  num_found?: number;
  offset?: number;
}

interface DbNomicsResponse {
  // 'series' is now an object where keys are series_ids,
  // or it could be an array if the API behaves differently for other queries.
  // For a single series_id request, it seems to be an object.
  // Let's adjust to handle the structure you received.
  // The top-level structure you provided has "series" as an object with a "docs" array.
  series: {
    docs: DbNomicsSeriesDoc[]; // This is what your sample shows for a single series_id
    limit?: number;
    num_found?: number;
    offset?: number;
  };
  datasets?: any; // Keeping other potential top-level keys
  errors?: any;
  providers?: any;
  _meta?: any;
  message?: string; // For API messages
}


export async function fetchDbNomicsSeries(
  fullSeriesCode: string, // e.g., "ISM/pmi/pm"
  dateRange?: { startDate?: string; endDate?: string }
): Promise<TimeSeriesDataPoint[]> {
  console.log(`[fetchDbNomicsSeries API - ENTRY] Called with: seriesCode=${fullSeriesCode}, clientDateRange=${JSON.stringify(dateRange)}`);
  
  const params = new URLSearchParams({
    series_ids: fullSeriesCode,
    observations: '1', 
    format: 'json',
    // metadata: 'true', // This might be implied by observations=1 or could be added
  });

  const url = `${DBNOMICS_API_URL_V22}/series?${params.toString()}`;
  console.log(`[API DB.nomics] Attempting to fetch: ${fullSeriesCode} from URL: ${url}`);

  try {
    const response = await fetch(url, { next: { revalidate: 21600 } });
    if (!response.ok) {
      const errorBody = await response.text();
      let errMsg = `DB.nomics API Error (${response.status}) for ${fullSeriesCode}.`;
      try {
        const errorJson = JSON.parse(errorBody);
        if (errorJson.message) errMsg = `DB.nomics: ${errorJson.message}`;
        else if (errorJson.errors?.[0]?.message) errMsg = `DB.nomics: ${errorJson.errors[0].message}`;
        else if (errorJson.detail) errMsg = `DB.nomics: ${errorJson.detail}`;
      } catch (e) { /* ignore */ }
      console.error(`[API DB.nomics] Error response for ${fullSeriesCode}: ${response.status} - Body: ${errorBody.substring(0, 500)}`);
      throw new Error(errMsg);
    }
    const data: DbNomicsResponse = await response.json();
    // console.log(`[API DB.nomics] Raw data for ${fullSeriesCode}:`, JSON.stringify(data, null, 2).substring(0,3000));


    if (data.message && data.message.toLowerCase().includes("error")) {
      console.warn(`[API DB.nomics] API returned message: ${data.message} for ${fullSeriesCode}`);
      if (data.message.includes("Invalid value")) {
        throw new Error(`DB.nomics API Error (likely invalid params/ID): ${data.message}`);
      }
      return [];
    }

    // Access the series data from series.docs[0]
    if (!data.series || !data.series.docs || !Array.isArray(data.series.docs) || data.series.docs.length === 0) {
      console.warn(`[API DB.nomics] No 'series.docs' array or empty 'series.docs' array in response for ${fullSeriesCode}.`);
      return [];
    }

    const seriesObject = data.series.docs[0];

    if (!seriesObject) {
        console.warn(`[API DB.nomics] Series object not found in series.docs for ${fullSeriesCode}.`);
        return [];
    }
    // Optional: Verify series_code if available in seriesObject, though structure implies it's the one requested
    // if (seriesObject.series_code && seriesObject.provider_code && seriesObject.dataset_code &&
    //     `${seriesObject.provider_code}/${seriesObject.dataset_code}/${seriesObject.series_code}` !== fullSeriesCode) {
    //     console.warn(`[API DB.nomics] Mismatched series code. Expected ${fullSeriesCode}, got ${seriesObject.provider_code}/${seriesObject.dataset_code}/${seriesObject.series_code}`);
    //     // return []; // Could be strict here
    // }
    
    if (!seriesObject.period || !seriesObject.value || !Array.isArray(seriesObject.period) || !Array.isArray(seriesObject.value)) {
        console.warn(`[API DB.nomics] Series data for ${fullSeriesCode} is malformed (missing period or value arrays in series.docs[0]).`);
        return [];
    }

    let timeSeries: TimeSeriesDataPoint[] = [];
    // DB.nomics provides "period" (e.g., "2020-05") and "period_start_day" (e.g., "2020-05-01")
    // It's safer to use "period_start_day" if available and fallback to "period" if not.
    const dateArrayToUse = seriesObject.period_start_day || seriesObject.period;

    for (let i = 0; i < dateArrayToUse.length; i++) {
      const val = seriesObject.value[i];
      const periodDateStr = dateArrayToUse[i];
      
      // Ensure the date string becomes a full YYYY-MM-DD if it's just YYYY-MM
      let fullDateStr = periodDateStr;
      if (periodDateStr && periodDateStr.length === 7 && periodDateStr.includes('-')) { // Looks like "YYYY-MM"
        fullDateStr = `${periodDateStr}-01`; // Assume first day of the month
      }

      if (fullDateStr && isValid(parseISO(fullDateStr)) && val !== null && !isNaN(val)) {
        timeSeries.push({ date: format(parseISO(fullDateStr), 'yyyy-MM-dd'), value: parseFloat(val.toFixed(2)) });
      }
    }

    timeSeries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    let filteredTimeSeries = timeSeries;
    if (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) {
        const filterStartDate = parseISO(dateRange.startDate);
        filteredTimeSeries = filteredTimeSeries.filter(dp => parseISO(dp.date) >= filterStartDate);
    }
    if (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) {
        const filterEndDate = parseISO(dateRange.endDate);
        filteredTimeSeries = filteredTimeSeries.filter(dp => parseISO(dp.date) <= filterEndDate);
    }

    console.log(`[API DB.nomics] Parsed ${timeSeries.length} total points, ${filteredTimeSeries.length} after date filtering for ${fullSeriesCode}`);
    return filteredTimeSeries;
  } catch (error) {
    console.error(`[API DB.nomics] Error for ${fullSeriesCode}:`, error);
    return [];
  }
}


// --- Polygon.io API Fetcher ---
interface PolygonAggregatesResult { c: number; h: number; l: number; n: number; o: number; t: number; v: number; vw: number; }
interface PolygonAggregatesResponse { ticker?: string; queryCount?: number; resultsCount?: number; adjusted?: boolean; results?: PolygonAggregatesResult[]; status?: string; request_id?: string; count?: number; message?: string; }

export async function fetchPolygonIOData(
  ticker: string,
  dateRange?: { startDate?: string; endDate?: string }
): Promise<TimeSeriesDataPoint[]> {
  // console.log(`[fetchPolygonIOData API - ENTRY] Called with: ticker=${ticker}, dateRange=${JSON.stringify(dateRange)}`);
  const apiKey = process.env.POLYGON_API_KEY;
  if (!apiKey) {
    console.error(`[API Polygon.io] POLYGON_API_KEY is missing. Cannot fetch for ${ticker}.`);
    return [];
  }

  const apiDefaults = getApiDefaultDateRange(2); 
  const startDate = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate;
  const endDate = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;
  const effectiveStartDate = startDate;

  if (new Date(effectiveStartDate) > new Date(endDate)) {
    console.warn(`[API Polygon.io] Start date ${effectiveStartDate} is after end date ${endDate} for ${ticker}. Returning empty.`);
    return [];
  }

  const params = new URLSearchParams({ adjusted: 'true', sort: 'asc', limit: '5000', apiKey: apiKey, });
  const url = `${POLYGON_API_URL}/aggs/ticker/${ticker}/range/1/day/${effectiveStartDate}/${endDate}?${params.toString()}`;
  // console.log(`[API Polygon.io] Attempting to fetch: ${ticker} (${effectiveStartDate} to ${endDate}) from URL: ${url.replace(apiKey, "REDACTED_KEY")}`);

  try {
    const response = await fetch(url, { next: { revalidate: 14400 } });
    if (!response.ok) {
      const errorBody = await response.text(); let errMsg = `Polygon.io API Error (${response.status}) for ${ticker}.`;
      try { const errorJson: PolygonAggregatesResponse = JSON.parse(errorBody); if (errorJson.message) errMsg = `Polygon.io: ${errorJson.message}`; } catch (e) { /* ignore if not JSON */ }
      console.error(`[API Polygon.io] Error response for ${ticker}: ${response.status} - Body: ${errorBody.substring(0, 500)}`);
      throw new Error(errMsg);
    }
    const data: PolygonAggregatesResponse = await response.json();

    if (data.status === 'ERROR' || (data.message && data.status !== 'OK' && data.status !== 'DELAYED')) {
      console.error(`[API Polygon.io] API returned error for ${ticker}: ${data.message || data.status}`);
      throw new Error(`Polygon.io API Error: ${data.message || data.status}`);
    }
    if (!data.results || data.results.length === 0) {
      console.warn(`[API Polygon.io] No results in response for ${ticker}. Status: ${data.status}, Results count: ${data.resultsCount}`);
      return [];
    }
    const seriesData: TimeSeriesDataPoint[] = data.results.map((agg: PolygonAggregatesResult) => ({
      date: format(new Date(agg.t), 'yyyy-MM-dd'), 
      value: parseFloat(agg.c.toFixed(4)), 
    }));
    // console.log(`[API Polygon.io] Parsed ${seriesData.length} points for ${ticker}`);
    return seriesData;
  } catch (error) { console.error(`[API Polygon.io] Network or parsing error for ${ticker}:`, error); return []; }
}

// --- API-Ninjas.com Commodity Latest Price Fetcher ---
interface ApiNinjasCommodityLatestPriceResponse { exchange?: string; name: string; price: number; unit?: string; updated: number; }
export async function fetchApiNinjasMetalPrice( commodityName: string ): Promise<TimeSeriesDataPoint[]> {
  // console.log(`[fetchApiNinjasMetalPrice API - ENTRY] Called with: commodityName=${commodityName}`);
  const apiKey = process.env.API_NINJAS_KEY;
  if (!apiKey) { console.error(`[API API-Ninjas Commodity] API_NINJAS_KEY is missing. Cannot fetch for ${commodityName}.`); return []; }
  const url = `${API_NINJAS_BASE_URL}/commodityprice?name=${encodeURIComponent(commodityName)}`;
  // console.log(`[API API-Ninjas Commodity] Attempting to fetch: ${commodityName} from URL: ${url}`);
  try {
    const response = await fetch(url, { headers: { 'X-Api-Key': apiKey }, next: { revalidate: 300 } });
    if (!response.ok) {
      const errorText = await response.text(); let errMsg = `API-Ninjas Commodity Price Error (${response.status}) for ${commodityName}.`;
      try { const errorJson = JSON.parse(errorText); if (errorJson.message) errMsg = `API-Ninjas: ${errorJson.message}`; else if (errorJson.error) errMsg = `API-Ninjas: ${errorJson.error}`; } catch (e) { /* ignore */ }
      console.error(`[API API-Ninjas Commodity] Error response for ${commodityName}: ${response.status} - Body: ${errorText.substring(0, 500)}`); throw new Error(errMsg);
    }
    const data: ApiNinjasCommodityLatestPriceResponse = await response.json();
    if (typeof data !== 'object' || data === null || typeof data.price !== 'number' || typeof data.updated !== 'number') {
      console.warn(`[API API-Ninjas Commodity] Invalid or incomplete data received for ${commodityName}. Data:`, data); return [];
    }
    const seriesData: TimeSeriesDataPoint[] = [{ date: format(new Date(data.updated * 1000), 'yyyy-MM-dd'), value: parseFloat(data.price.toFixed(4)), }];
    // console.log(`[API API-Ninjas Commodity] Parsed 1 point for ${commodityName}: ${JSON.stringify(seriesData)}`);
    return seriesData;
  } catch (error) { console.error(`[API API-Ninjas Commodity] Network or parsing error for ${commodityName}:`, error); return []; }
}

// --- API-Ninjas.com Commodity Historical Price Fetcher ---
interface ApiNinjasHistoricalDataPoint { open: number; low: number; high: number; close: number; volume?: number; time: number; }
type ApiNinjasHistoricalResponse = ApiNinjasHistoricalDataPoint[];
export async function fetchApiNinjasCommodityHistoricalPrice( commodityName: string, dateRange?: { startDate?: string; endDate?: string }, period: '1h' | '1d' = '1d' ): Promise<TimeSeriesDataPoint[]> {
  // console.log(`[fetchApiNinjasCommodityHistoricalPrice API - ENTRY] Called for: ${commodityName}, Range: ${JSON.stringify(dateRange)}, Period: ${period}`);
  const apiKey = process.env.API_NINJAS_KEY;
  if (!apiKey) { console.error(`[API API-Ninjas Hist] API_NINJAS_KEY is missing. Cannot fetch for ${commodityName}.`); return []; }
  const apiDefaults = getApiDefaultDateRange(1);
  const startDateStr = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate;
  const endDateStr = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;
  const startTimestamp = Math.floor(parseISO(startDateStr).getTime() / 1000);
  const endTimestamp = Math.floor(parseISO(endDateStr).getTime() / 1000);
  if (startTimestamp >= endTimestamp) { console.warn(`[API API-Ninjas Hist] Start timestamp not before end for ${commodityName}.`); return []; }
  const params = new URLSearchParams({ name: commodityName, period: period, start: startTimestamp.toString(), end: endTimestamp.toString(), });
  const url = `${API_NINJAS_BASE_URL}/commoditypricehistorical?${params.toString()}`;
  // console.log(`[API API-Ninjas Hist] Attempting to fetch: ${commodityName} from URL: ${url}`);
  try {
    const response = await fetch(url, { headers: { 'X-Api-Key': apiKey }, next: { revalidate: 14400 } });
    if (!response.ok) {
      const errorText = await response.text(); let errMsg = `API-Ninjas Hist. Error (${response.status}) for ${commodityName}.`;
      try { const errorJson = JSON.parse(errorText); if (errorJson.error) errMsg = `API-Ninjas Hist: ${errorJson.error}`; else if (errorJson.message) errMsg = `API-Ninjas Hist: ${errorJson.message}`; } catch (e) { /* ignore */ }
      console.error(`[API API-Ninjas Hist] Error for ${commodityName}: ${response.status} - Body: ${errorText.substring(0, 500)}`); throw new Error(errMsg);
    }
    const data: ApiNinjasHistoricalResponse = await response.json();
    if (!Array.isArray(data)) { console.warn(`[API API-Ninjas Hist] Not array for ${commodityName}. Data:`, data); return []; }
    if (data.length === 0) { console.warn(`[API API-Ninjas Hist] No data for ${commodityName}.`); return []; }
    let seriesData: TimeSeriesDataPoint[] = data.map(item => (typeof item.close !== 'number' || typeof item.time !== 'number') ? null : { date: format(new Date(item.time * 1000), 'yyyy-MM-dd'), value: parseFloat(item.close.toFixed(4)), }).filter((p): p is TimeSeriesDataPoint => p !== null).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (period === '1h' && seriesData.length > 0) {
        const dailyAggregated: TimeSeriesDataPoint[] = []; const tempMap = new Map<string, TimeSeriesDataPoint>();
        seriesData.forEach(point => { tempMap.set(point.date, point); });
        dailyAggregated.push(...Array.from(tempMap.values())); dailyAggregated.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        // console.log(`[API API-Ninjas Hist] Aggregated ${seriesData.length} hourly to ${dailyAggregated.length} daily for ${commodityName}.`);
        return dailyAggregated;
    }
    // console.log(`[API API-Ninjas Hist] Parsed ${seriesData.length} points for ${commodityName}`); 
    return seriesData;
  } catch (error) { console.error(`[API API-Ninjas Hist] Error for ${commodityName}:`, error); return []; }
}

// --- CoinGecko API Fetcher ---
export async function fetchCoinGeckoPriceHistory( coinId: string, dateRange?: { startDate?: string; endDate?: string } ): Promise<TimeSeriesDataPoint[]> {
  // console.log(`[fetchCoinGeckoPriceHistory API - ENTRY] Called with: coinId=${coinId}, dateRange=${JSON.stringify(dateRange)}`);
  const apiDefaults = getApiDefaultDateRange();
  const startDateStr = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate;
  const endDateStr = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;
  let fromTimestamp = Math.floor(parseISO(startDateStr).getTime() / 1000); 
  let toTimestamp = Math.floor(parseISO(endDateStr).getTime() / 1000) + (60 * 60 * 23);
  if (fromTimestamp > toTimestamp) [fromTimestamp, toTimestamp] = [toTimestamp, fromTimestamp];
  
  const url = `${COINGECKO_API_URL}/coins/${coinId}/market_chart/range?vs_currency=usd&from=${fromTimestamp}&to=${toTimestamp}`;
  // console.log(`[API CoinGecko] Attempting to fetch: ${coinId} (${startDateStr} to ${endDateStr}) from URL: ${url}`);
  try {
    const response = await fetch(url, { next: { revalidate: 3600 } }); 
    if (!response.ok) { 
      const errBody = await response.text(); 
      let errMsg = `CoinGecko Error (${response.status}) for ${coinId}.`; 
      try { errMsg = JSON.parse(errBody).error?.message || JSON.parse(errBody).error || errMsg; } catch(e){} 
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
    // console.log(`[API CoinGecko] Parsed ${uniqueDaily.length} daily points for ${coinId}`); 
    return uniqueDaily;
  } catch (error) { console.error(`[API CoinGecko] Error for ${coinId}:`, error); return []; }
}

// --- Alternative.me Fear & Greed Index Fetcher ---
interface AlternativeMeFngValue { value: string; timestamp: string; value_classification: string; }
interface AlternativeMeFngResponse { name: string; data: AlternativeMeFngValue[]; metadata: { error: string | null; }; }
export async function fetchAlternativeMeFearGreedIndex( dateRange?: { startDate?: string; endDate?: string } ): Promise<TimeSeriesDataPoint[]> {
    // console.log(`[fetchAlternativeMeFearGreedIndex API - ENTRY] Called with: dateRange=${JSON.stringify(dateRange)}`);
    const apiDefaults = getApiDefaultDateRange(5);
    const startConsider = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate;
    const endConsider = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;
    
    const daysFromTodayToStartConsider = differenceInDays(new Date(), parseISO(startConsider));
    const limit = Math.max(1, Math.min(daysFromTodayToStartConsider + 2, 1825)); 

    const url = `${ALTERNATIVE_ME_API_URL}?limit=${limit}&format=json`;
    // console.log(`[API AlternativeMe] Attempting F&G (limit: ${limit}, UI start: ${startConsider}, UI end: ${endConsider}) from URL: ${url}`);
    try {
        const res = await fetch(url, { next: { revalidate: 10800 } }); 
        if (!res.ok) { const errTxt = await res.text(); console.error(`[API AlternativeMe] F&G Error: ${res.status} - ${errTxt.substring(0,500)}`); throw new Error(`Alternative.me Error ${res.status}.`); }
        const data: AlternativeMeFngResponse = await res.json();
        if (data.metadata.error) throw new Error(`Alternative.me API Error: ${data.metadata.error}`);
        if (!data.data?.length) { console.warn(`[API AlternativeMe] No F&G data.`); return []; }
        let series: TimeSeriesDataPoint[] = data.data.map(item => ({ 
            date: format(new Date(parseInt(item.timestamp) * 1000), 'yyyy-MM-dd'), 
            value: parseInt(item.value, 10), 
        })).sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        
        if (isValid(parseISO(startConsider))) series = series.filter(dp => parseISO(dp.date) >= parseISO(startConsider));
        if (isValid(parseISO(endConsider))) series = series.filter(dp => parseISO(dp.date) <= parseISO(endConsider));
        
        // console.log(`[API AlternativeMe] Parsed and filtered ${series.length} F&G points`); 
        return series;
    } catch (e) { console.error('[API AlternativeMe] F&G Error:', e); return []; }
}

// --- NewsAPI.org Fetcher ---
export interface NewsArticle { source: { id: string | null; name: string }; author: string | null; title: string; description: string | null; url: string; urlToImage: string | null; publishedAt: string; content: string | null; }
export interface NewsApiResponse { status: string; totalResults: number; articles: NewsArticle[]; message?: string; code?: string; }
export async function fetchNewsHeadlines(category: string = 'business', country: string = 'us', pageSize: number = 10): Promise<NewsArticle[]> {
  // console.log(`[fetchNewsHeadlines API - ENTRY] Called: category=${category}, country=${country}, pageSize=${pageSize}`);
  const apiKey = process.env.NEWSAPI_ORG_KEY;
  if (!apiKey) { console.error("[API NewsAPI] NEWSAPI_ORG_KEY missing."); return []; }
  const params = new URLSearchParams({ country, category, pageSize: pageSize.toString(), apiKey });
  const url = `${NEWSAPI_ORG_BASE_URL}/top-headlines?${params.toString()}`;
  // console.log(`[API NewsAPI] Fetching: ${url.replace(apiKey, "REDACTED_KEY")}`);
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } }); 
    if (!res.ok) { const errData: NewsApiResponse = await res.json().catch(() => ({ status: 'error', articles:[], message: `HTTP ${res.status}`}) as any); const errMsg = errData.message || errData.code || `NewsAPI Error (${res.status})`; console.error(`[API NewsAPI] Error for ${category}/${country}: ${errMsg}`); throw new Error(errMsg); }
    const data: NewsApiResponse = await res.json();
    if (data.status !== 'ok') { console.warn(`[API NewsAPI] Status not 'ok' for ${category}/${country}: ${data.message || data.code}`); if (['apiKeyDisabled', 'apiKeyInvalid', 'keyInvalid'].includes(data.code||'')) console.error("[API NewsAPI] Key issue."); return []; }
    const articles = data.articles?.filter(a => a.title && a.url) || [];
    // console.log(`[API NewsAPI] Parsed ${articles.length} articles for ${category}/${country}`); 
    return articles;
  } catch (e) { console.error("[API NewsAPI] Error:", e); return []; }
}

// --- Finnhub Economic Calendar Fetcher ---
export interface EconomicEvent { actual: number | null; country: string; estimate: number | null; event: string; impact: string; prev: number | null; time: string; unit: string; calendarId?: string; }
export interface EconomicCalendarResponse { economicCalendar: EconomicEvent[]; }
export async function fetchEconomicCalendar(daysAhead: number = 30): Promise<EconomicEvent[]> {
  // console.log(`[fetchEconomicCalendar API - ENTRY] Called: daysAhead=${daysAhead}`);
  const apiKey = process.env.FINNHUB_API_KEY;
  if (!apiKey) { console.error("[API Finnhub] FINNHUB_API_KEY missing."); return []; }
  const from = format(new Date(), 'yyyy-MM-dd'); const to = format(addDays(new Date(), daysAhead), 'yyyy-MM-dd');
  const url = `${FINNHUB_API_URL}/calendar/economic?token=${apiKey}&from=${from}&to=${to}`;
  // console.log(`[API Finnhub] Fetching Eco Calendar: ${url.replace(apiKey, "REDACTED_KEY")}`);
  try {
    const res = await fetch(url, { next: { revalidate: 7200 } }); 
    if (!res.ok) { const errTxt = await res.text(); console.error(`[API Finnhub] Eco Calendar Error ${res.status}: ${errTxt.substring(0,300)}`); throw new Error(`Finnhub Eco Calendar Error (${res.status}).`); }
    const data: EconomicCalendarResponse | { error?: string } = await res.json();
    if ('error' in data && data.error) throw new Error(`Finnhub Eco Calendar API: ${data.error}`);
    if (!('economicCalendar' in data) || !Array.isArray(data.economicCalendar)) { console.warn("[API Finnhub] No 'economicCalendar' array."); return []; }
    const events = data.economicCalendar.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    // console.log(`[API Finnhub] Parsed ${events.length} economic events.`); 
    return events;
  } catch (e) { console.error("[API Finnhub] Eco Calendar Error:", e); return []; }
}

// --- Alpha Vantage Earnings Calendar ---
export interface EarningsEventAV { symbol: string; name: string; reportDate: string; fiscalDateEnding: string; estimate: number | null; currency: string; }
function parseCSV(csvText: string): Record<string, string>[] {
  const lines = csvText.trim().split('\n'); if (lines.length < 2) return [];
  const headers = lines[0].split(',').map(h => h.trim()); const dataRows = lines.slice(1);
  return dataRows.map(rowText => { const values = rowText.split(','); const rowObject: Record<string, string> = {}; headers.forEach((header, index) => { rowObject[header] = values[index] ? values[index].trim() : ''; }); return rowObject; });
}
export async function fetchAlphaVantageEarningsCalendar( horizon: '3month' | '6month' | '12month' = '3month', symbol?: string ): Promise<EarningsEventAV[]> {
  // console.log(`[fetchAlphaVantageEarningsCalendar API - ENTRY] Called: horizon=${horizon}, symbol=${symbol || 'ALL'}`);
  const apiKey = process.env.ALPHA_VANTAGE_API_KEY;
  if (!apiKey) { console.error("[API AlphaVantage Earnings] ALPHA_VANTAGE_API_KEY missing."); return []; }
  const params = new URLSearchParams({ function: 'EARNINGS_CALENDAR', horizon: horizon, apikey: apiKey, });
  if (symbol) { params.set('symbol', symbol); }
  const url = `${ALPHA_VANTAGE_API_URL}?${params.toString()}`;
  // console.log(`[API AlphaVantage Earnings] Fetching: ${url.replace(apiKey, "REDACTED_KEY")}`);
  try {
    const response = await fetch(url, { next: { revalidate: 14400 } }); 
    if (!response.ok) { const errorText = await response.text(); console.error(`[API AlphaVantage Earnings] Error: ${response.status} - ${errorText.substring(0, 300)}`); throw new Error(`Alpha Vantage Earnings API Error (${response.status}).`); }
    const csvData = await response.text();
    if (!csvData || csvData.trim() === '' || csvData.toLowerCase().includes("error message") || csvData.toLowerCase().includes("thank you for using alpha vantage")) { console.warn(`[API AlphaVantage Earnings] Empty/error CSV: ${csvData.substring(0, 200)}`); if (csvData.toLowerCase().includes("thank you for using alpha vantage") && !csvData.toLowerCase().includes("symbol,name")) { console.warn("[API AlphaVantage Earnings] Possible rate limit/key issue."); } return []; }
    const parsedObjects = parseCSV(csvData);
    const earningsEvents: EarningsEventAV[] = parsedObjects.map(obj => { const estimateVal = obj.estimate ? parseFloat(obj.estimate) : null; return { symbol: obj.symbol || 'N/A', name: obj.name || 'Unknown Company', reportDate: obj.reportDate || '', fiscalDateEnding: obj.fiscalDateEnding || '', estimate: isNaN(estimateVal as any) ? null : estimateVal, currency: obj.currency || 'USD', }; }).filter(event => event.symbol !== 'N/A' && isValid(parseISO(event.reportDate))).sort((a,b) => new Date(a.reportDate).getTime() - new Date(b.date).getTime());
    // console.log(`[API AlphaVantage Earnings] Parsed ${earningsEvents.length} events.`); 
    return earningsEvents;
  } catch (error) { console.error("[API AlphaVantage Earnings] Error:", error); return []; }
}

// --- Tiingo EOD Price Fetcher ---
interface TiingoEodPrice {
  date: string;      
  close: number;
  adjClose: number;
  open?: number;
  high?: number;
  low?: number;
  volume?: number;
}

export async function fetchTiingoEodData(
  ticker: string,
  dateRange?: { startDate?: string; endDate?: string }
): Promise<TimeSeriesDataPoint[]> {
  // console.log(`[fetchTiingoEodData API - ENTRY] Called with: ticker=${ticker}, dateRange=${JSON.stringify(dateRange)}`);
  const apiKey = process.env.TIINGO_API_KEY;
  if (!apiKey) {
    console.error(`[API Tiingo] TIINGO_API_KEY is missing. Cannot fetch for ${ticker}.`);
    return [];
  }

  const apiDefaults = getApiDefaultDateRange(); 
  const startDate = (dateRange?.startDate && isValid(parseISO(dateRange.startDate)))
    ? dateRange.startDate
    : apiDefaults.startDate;
  const endDate = (dateRange?.endDate && isValid(parseISO(dateRange.endDate)))
    ? dateRange.endDate
    : apiDefaults.endDate;

  if (new Date(startDate) > new Date(endDate)) {
    console.warn(`[API Tiingo] Start date ${startDate} is after end date ${endDate} for ${ticker}. Returning empty.`);
    return [];
  }

  const url = `${TIINGO_API_URL}/daily/${ticker.toLowerCase()}/prices?startDate=${startDate}&endDate=${endDate}&token=${apiKey}&format=json&resampleFreq=daily`;
  
  // console.log(`[API Tiingo] Attempting to fetch: ${ticker} (${startDate} to ${endDate}) from URL: ${url.replace(apiKey, "REDACTED_KEY")}`);

  try {
    const response = await fetch(url, { next: { revalidate: 14400 } }); 

    if (!response.ok) {
      const errorBody = await response.text();
      let errMsg = `Tiingo API Error (${response.status}) for ${ticker}.`;
      try {
        const errorJson = JSON.parse(errorBody);
        if (errorJson.detail) errMsg = `Tiingo: ${errorJson.detail}`;
      } catch (e) { /* ignore if not JSON */ }
      console.error(`[API Tiingo] Error response for ${ticker}: ${response.status} - Body: ${errorBody.substring(0, 500)}`);
      throw new Error(errMsg);
    }

    const data: TiingoEodPrice[] = await response.json();

    if (!Array.isArray(data) || data.length === 0) {
      console.warn(`[API Tiingo] No data or unexpected format in response for ${ticker}.`);
      return [];
    }

    const seriesData: TimeSeriesDataPoint[] = data
      .map((item: TiingoEodPrice) => {
        if (!item.date || item.adjClose === null || item.adjClose === undefined) return null;
        const parsedDate = parseISO(item.date);
        if (!isValid(parsedDate)) return null;
        
        return {
          date: format(parsedDate, 'yyyy-MM-dd'),
          value: parseFloat(item.adjClose.toFixed(2)),
        };
      })
      .filter((point): point is TimeSeriesDataPoint => point !== null)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // console.log(`[API Tiingo] Parsed ${seriesData.length} points for ${ticker}`);
    return seriesData;

  } catch (error) {
    console.error(`[API Tiingo] Network or parsing error for ${ticker}:`, error);
    return [];
  }
}