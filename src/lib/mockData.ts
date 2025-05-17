// src/lib/mockData.ts
import { TimeSeriesDataPoint, IndicatorMetadata } from './indicators';
import {
    subYears, format, parseISO, isValid,
    eachDayOfInterval, eachMonthOfInterval, eachQuarterOfInterval, startOfMonth
} from 'date-fns';
import {
    fetchFredSeries,
    fetchAlphaVantageData,
    fetchCoinGeckoPriceHistory,
    fetchAlternativeMeFearGreedIndex,
    fetchDbNomicsSeries,
    fetchPolygonIOData,
    fetchApiNinjasMetalPrice, // For latest metal price using /v1/commodityprice
    fetchApiNinjasCommodityHistoricalPrice, // For historical data using /v1/commoditypricehistorical
} from './api';
import {
    calculateYoYPercent,
    calculateMoMPercent,
    calculateQoQPercent,
    calculateMoMChange
} from './calculations';

// --- Helper for Default API Fetch Date Range (Consistent) ---
const getDefaultApiFetchRange = (): { startDate: string; endDate: string } => {
    const today = new Date();
    const oneYearAgo = subYears(today, 1);
    return {
      startDate: format(oneYearAgo, 'yyyy-MM-dd'),
      endDate: format(today, 'yyyy-MM-dd')
    };
};

// --- Seeded Pseudo Random Function ---
function seededPseudoRandom(seedStr: string): () => number {
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) { seed = (seed * 31 + seedStr.charCodeAt(i)) | 0; }
    return () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
    };
}

// --- Mock Data Generation ---
export function generateMockData(
    indicator: IndicatorMetadata,
    dateRange?: { startDate?: string; endDate?: string }
): TimeSeriesDataPoint[] {
  const randomFn = seededPseudoRandom(indicator.id);
  const apiDefaults = getDefaultApiFetchRange();
  const startDateStr = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate;
  const endDateStr = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;

  let actualStartDate = parseISO(startDateStr);
  let actualEndDate = parseISO(endDateStr);

  if (!isValid(actualStartDate) || !isValid(actualEndDate) || actualStartDate > actualEndDate) {
      actualStartDate = parseISO(apiDefaults.startDate);
      actualEndDate = parseISO(apiDefaults.endDate);
  }

  const data: TimeSeriesDataPoint[] = [];
  let intervalGenerator: (interval: Interval) => Date[];
  const dateFormat = "yyyy-MM-dd";

  switch (indicator.frequency) {
    case 'Quarterly': intervalGenerator = eachQuarterOfInterval; break;
    case 'Monthly': intervalGenerator = eachMonthOfInterval; break;
    case 'Weekly': intervalGenerator = eachDayOfInterval; break;
    case 'Daily': default: intervalGenerator = eachDayOfInterval; break;
  }

  let adjustedStartDateForInterval = new Date(actualStartDate);
  if (indicator.frequency === 'Monthly' || indicator.frequency === 'Quarterly') {
    adjustedStartDateForInterval = startOfMonth(actualStartDate);
  }

  let dates: Date[] = [];
   try {
       const intervalEnd = actualEndDate >= adjustedStartDateForInterval ? actualEndDate : adjustedStartDateForInterval;
       if (adjustedStartDateForInterval > intervalEnd) {
           console.warn(`Mock Gen: Start date ${format(adjustedStartDateForInterval, dateFormat)} is after end date ${format(intervalEnd, dateFormat)} for ${indicator.id}. No dates generated.`);
       } else {
            dates = intervalGenerator({ start: adjustedStartDateForInterval, end: intervalEnd });
            if (indicator.frequency === 'Weekly') dates = dates.filter((_d, i) => i % 7 === 0);
       }
   } catch (e) {
       console.error(`Mock Gen: Error generating dates for ${indicator.id}`, e);
       try { if (actualStartDate <= actualEndDate) dates = eachDayOfInterval({ start: actualStartDate, end: actualEndDate }); } catch (fbE) { return []; }
   }

  if (dates.length === 0) return [];

  let baseValue = 100; let volatility = 5;

  if (indicator.id === 'SP500') { baseValue = 4500 + randomFn() * 1000; volatility = 50 + randomFn() * 50; }
  else if (indicator.id === 'BTC_PRICE_USD') { baseValue = 40000 + randomFn() * 20000; volatility = 2000 + randomFn() * 1000; }
  else if (indicator.id === 'ETH_PRICE_USD') { baseValue = 2500 + randomFn() * 1000; volatility = 200 + randomFn() * 100; }
  else if (indicator.id === 'GOLD_PRICE') { baseValue = 1900 + randomFn() * 200; volatility = 20 + randomFn() * 10; }
  else if (indicator.id === 'SILVER_PRICE') { baseValue = 22 + randomFn() * 5; volatility = 0.5 + randomFn() * 0.5; }
  else if (indicator.id === 'PLATINUM_PRICE') { baseValue = 900 + randomFn() * 150; volatility = 15 + randomFn() * 10; }
  else if (indicator.id === 'LEI') { baseValue = 110 + randomFn() * 10; volatility = 0.5 + randomFn() * 0.5; }
  else if (indicator.id === 'CCI') { baseValue = 100 + randomFn() * 20; volatility = 5 + randomFn() * 3; }
  else if (indicator.id === 'CRYPTO_FEAR_GREED') { baseValue = 50; volatility = 25; }
  else if (indicator.unit.includes('%')) { baseValue = (randomFn() - 0.5) * 10; volatility = 0.5 + randomFn() * 1; }
  else if (indicator.unit.includes('Index') && !indicator.id.includes('FEAR_GREED')) { baseValue = 100 + randomFn() * 20; volatility = 1 + randomFn() * 2; }
  else if (indicator.unit.includes('Thousands')) { baseValue = 1000 + randomFn() * 5000; volatility = 50 + randomFn() * 100; }
  else if (indicator.unit.includes('Millions')) { baseValue = (1000 + randomFn() * 5000) * 1000 ; volatility = (50 + randomFn() * 100) * 1000; }
  else if (indicator.unit.includes('Billions')) { baseValue = (1000 + randomFn() * 5000) * 1000000; volatility = (50 + randomFn() * 100) * 1000000; }
  else if (indicator.unit.includes('Number')) { baseValue = 300000 + randomFn() * 100000; volatility = 10000 + randomFn() * 5000; }
  else if (indicator.unit.includes('USD per')) { baseValue = 50 + randomFn() * 50; volatility = 2 + randomFn() * 3; }
  else if (indicator.unit.includes('per USD')) { baseValue = 0.8 + randomFn() * 0.4; volatility = 0.02 + randomFn() * 0.03; }

  let currentValue = baseValue;
  for (const date of dates) {
    const trend = 0.01 * volatility * (randomFn() - 0.4);
    const noise = (randomFn() - 0.5) * volatility;
    currentValue += trend + noise;

    if (!indicator.unit.includes('%') && !indicator.id.includes('BALANCE') && !indicator.id.includes('SPREAD') && indicator.id !== 'CRYPTO_FEAR_GREED') {
        currentValue = Math.max(currentValue, 0.01);
    }
    if (indicator.id === 'PMI' || indicator.id === 'PMI_SERVICES') currentValue = Math.max(30, Math.min(70, currentValue));
    if (indicator.id === 'UNRATE' || indicator.id === 'U6RATE') currentValue = Math.max(1, Math.min(15, currentValue));
    if (indicator.id === 'CRYPTO_FEAR_GREED') currentValue = Math.max(0, Math.min(100, Math.round(currentValue)));
    if (indicator.id === 'CAPUTIL') currentValue = Math.max(50, Math.min(90, currentValue));
    if (indicator.id === 'CCI' || indicator.id === 'UMCSENT') currentValue = Math.max(40, Math.min(150, currentValue));
    if (indicator.id === 'LEI') currentValue = Math.max(80, Math.min(130, currentValue));

    const value = randomFn() > 0.02 ? parseFloat(currentValue.toFixed(2)) : null;
    data.push({ date: format(date, dateFormat), value: value });
  }

   if (data.length > 0 && data[data.length - 1].value === null) {
       const lastValidValue = data.slice(0, -1).reverse().find(d => d.value !== null)?.value;
       data[data.length - 1].value = lastValidValue ?? parseFloat((baseValue + (randomFn() - 0.5) * volatility).toFixed(2));
   }
  return data;
}

// --- Main Data Fetching Orchestrator ---
export async function fetchIndicatorData(
    indicator: IndicatorMetadata,
    dateRangeFromPage?: { startDate?: string; endDate?: string }
): Promise<TimeSeriesDataPoint[]> {
    const defaultApiRange = getDefaultApiFetchRange();
    let actualDateRangeToUse: { startDate: string; endDate: string };

    if (dateRangeFromPage?.startDate && isValid(parseISO(dateRangeFromPage.startDate))) {
        actualDateRangeToUse = {
            startDate: dateRangeFromPage.startDate,
            endDate: (dateRangeFromPage.endDate && isValid(parseISO(dateRangeFromPage.endDate))) ? dateRangeFromPage.endDate : defaultApiRange.endDate,
        };
    } else if (dateRangeFromPage?.endDate && isValid(parseISO(dateRangeFromPage.endDate))) {
         actualDateRangeToUse = { startDate: defaultApiRange.startDate, endDate: dateRangeFromPage.endDate, };
    } else { actualDateRangeToUse = { ...defaultApiRange }; }

    if (new Date(actualDateRangeToUse.startDate) > new Date(actualDateRangeToUse.endDate)) {
        console.warn(`[Orchestrator] Correcting invalid date range for ${indicator.id}: start ${actualDateRangeToUse.startDate} > end ${actualDateRangeToUse.endDate}. Using default.`);
        actualDateRangeToUse = { ...defaultApiRange };
    }
    console.log(`[fetchIndicatorData Orchestrator] ID: ${indicator.id}, Source: ${indicator.apiSource}, UI Range: ${actualDateRangeToUse.startDate} to ${actualDateRangeToUse.endDate}`);
    
    let rawFetchedData: TimeSeriesDataPoint[] = [];
    let effectiveDateRangeForApiCall = { ...actualDateRangeToUse };

    if (indicator.calculation === 'YOY_PERCENT' && effectiveDateRangeForApiCall.startDate) {
        try {
          const originalStartDate = parseISO(effectiveDateRangeForApiCall.startDate);
          effectiveDateRangeForApiCall.startDate = format(subYears(originalStartDate, 1), 'yyyy-MM-dd');
           if (parseISO(effectiveDateRangeForApiCall.startDate) >= parseISO(effectiveDateRangeForApiCall.endDate)) {
                const originalEndDate = parseISO(actualDateRangeToUse.endDate);
                 if (parseISO(effectiveDateRangeForApiCall.startDate) > originalEndDate) {
                    console.warn(`[Orchestrator] YoY adjusted start ${effectiveDateRangeForApiCall.startDate} is after UI end ${actualDateRangeToUse.endDate} for ${indicator.id}. This might lead to empty data before calculation.`);
                }
           }
        } catch (e) { 
            console.warn(`[Orchestrator] Could not adjust date range for YoY calc on ${indicator.id}. Using original range. Error:`, e);
            effectiveDateRangeForApiCall = { ...actualDateRangeToUse }; 
        }
    }

    let apiFetchAttempted = false; let apiErrorOccurred = false;
    try {
      switch (indicator.apiSource) {
        case 'FRED':
          if (indicator.apiIdentifier) { rawFetchedData = await fetchFredSeries(indicator.apiIdentifier, effectiveDateRangeForApiCall); apiFetchAttempted = true; }
          break;
        case 'AlphaVantage':
          if (indicator.apiIdentifier) { rawFetchedData = await fetchAlphaVantageData(indicator.apiIdentifier, effectiveDateRangeForApiCall); apiFetchAttempted = true; }
          break;
        case 'DBNOMICS':
          if (indicator.apiIdentifier) { rawFetchedData = await fetchDbNomicsSeries(indicator.apiIdentifier, effectiveDateRangeForApiCall); apiFetchAttempted = true; }
          break;
        case 'PolygonIO':
          if (indicator.apiIdentifier) { rawFetchedData = await fetchPolygonIOData(indicator.apiIdentifier, effectiveDateRangeForApiCall); apiFetchAttempted = true; }
          break;
        case 'ApiNinjas': // Fetches only the single latest price using /v1/commodityprice
          if (indicator.apiIdentifier) {
            rawFetchedData = await fetchApiNinjasMetalPrice(indicator.apiIdentifier);
            apiFetchAttempted = true;
            if (rawFetchedData.length > 0) {
                console.log(`[Orchestrator] ApiNinjas (latest price) for ${indicator.id} successful. Data points: ${rawFetchedData.length}`);
            } else {
                console.warn(`[Orchestrator] ApiNinjas (latest price) for ${indicator.id} returned no data. Mock fallback will apply if needed.`);
            }
          }
          break;
        case 'ApiNinjasHistorical': // Fetches historical prices from /v1/commoditypricehistorical
          if (indicator.apiIdentifier) {
            rawFetchedData = await fetchApiNinjasCommodityHistoricalPrice(indicator.apiIdentifier, effectiveDateRangeForApiCall, '1d');
            apiFetchAttempted = true;
          }
          break;
        case 'CoinGeckoAPI':
          if (indicator.apiIdentifier) { rawFetchedData = await fetchCoinGeckoPriceHistory(indicator.apiIdentifier, effectiveDateRangeForApiCall); apiFetchAttempted = true; }
          break;
        case 'AlternativeMeAPI':
          rawFetchedData = await fetchAlternativeMeFearGreedIndex(effectiveDateRangeForApiCall); apiFetchAttempted = true;
          break;
        case 'Mock':
          console.log(`[Orchestrator] ${indicator.id} is Mock source, generating mock data.`);
          break;
        default:
          if (indicator.apiIdentifier && ((indicator.apiSource as string).toUpperCase().includes('FRED') || !indicator.apiSource)) {
               console.log(`[Orchestrator] ${indicator.id} (Source: ${indicator.apiSource}) falling back to FRED fetch logic.`);
               rawFetchedData = await fetchFredSeries(indicator.apiIdentifier, effectiveDateRangeForApiCall); apiFetchAttempted = true;
          } else {
              console.warn(`[Orchestrator] No specific fetch logic for ${indicator.id} (Source: ${indicator.apiSource}). Mock data will be used if no other source attempted.`);
          }
          break;
      }
    } catch (error) { apiErrorOccurred = true; console.error(`[Orchestrator] API call error during switch for ${indicator.id}:`, error); }

    let shouldUseFullMock = false;
    if (indicator.apiSource === 'Mock') {
        shouldUseFullMock = true;
    } else if (indicator.apiSource === 'ApiNinjas') { // Special handling for ApiNinjas latest price
        if(apiFetchAttempted && (rawFetchedData.length === 0 || apiErrorOccurred)) {
            shouldUseFullMock = true; // Fallback to full mock if API fails to get the single point
        }
        // If successful, rawFetchedData contains just the single point, and no further mock supplementation happens here.
    } else if (apiFetchAttempted && (rawFetchedData.length === 0 || apiErrorOccurred)) {
        // For other historical sources
        shouldUseFullMock = true;
    } else if (!apiFetchAttempted && indicator.apiSource !== 'Mock') { // Should not be common
        shouldUseFullMock = true;
    }


    if (shouldUseFullMock) {
      if (indicator.apiSource !== 'Mock') console.warn(`[Orchestrator] Full fallback to mock for ${indicator.id} (Source: ${indicator.apiSource}).`);
      else console.log(`[Orchestrator] Explicitly using full mock data for ${indicator.id}.`);
      rawFetchedData = generateMockData(indicator, actualDateRangeToUse);
    }

    let processedData: TimeSeriesDataPoint[] = [...rawFetchedData];

    if (indicator.calculation && indicator.calculation !== 'NONE' && processedData.length > 0) {
        // Prevent calculations if only one data point (common for 'ApiNinjas' latest price source)
        if (processedData.length <= 1 && 
            (indicator.calculation === 'YOY_PERCENT' || 
             indicator.calculation === 'MOM_PERCENT' || 
             indicator.calculation === 'QOQ_PERCENT' || 
             indicator.calculation === 'MOM_CHANGE')) {
            console.log(`[Orchestrator] Skipping calculation for ${indicator.id} due to insufficient data points (${processedData.length}).`);
        } else {
            let calcSuccess = true;
            let tempCalc: TimeSeriesDataPoint[] = [];
            switch (indicator.calculation) {
              case 'YOY_PERCENT':
                let lookback = 12;
                if (indicator.frequency === 'Quarterly') lookback = 4;
                else if (indicator.frequency === 'Weekly') lookback = 52;
                else if (indicator.frequency === 'Daily') lookback = 365;
                tempCalc = calculateYoYPercent(processedData, lookback);
                break;
              case 'MOM_PERCENT':
                tempCalc = calculateMoMPercent(processedData);
                break;
              case 'QOQ_PERCENT':
                tempCalc = calculateQoQPercent(processedData);
                break;
              case 'MOM_CHANGE':
                tempCalc = calculateMoMChange(processedData);
                break;
              default:
                calcSuccess = false;
                tempCalc = processedData;
                break;
            }
            processedData = tempCalc;
            if (calcSuccess) console.log(`[Orchestrator] ${indicator.id} after ${indicator.calculation}: ${processedData.length} points`);
        }
    }

    if (actualDateRangeToUse.startDate && isValid(parseISO(actualDateRangeToUse.startDate)) && processedData.length > 0) {
        processedData = processedData.filter(dp => dp.date && isValid(parseISO(dp.date)) && parseISO(dp.date) >= parseISO(actualDateRangeToUse.startDate));
    }
    if (actualDateRangeToUse.endDate && isValid(parseISO(actualDateRangeToUse.endDate)) && processedData.length > 0) {
        processedData = processedData.filter(dp => dp.date && isValid(parseISO(dp.date)) && parseISO(dp.date) <= parseISO(actualDateRangeToUse.endDate));
    }
    console.log(`[Orchestrator] Final data count for ${indicator.id}: ${processedData.length}`);
    return processedData;
}