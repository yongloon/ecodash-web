// src/lib/mockData.ts
import { TimeSeriesDataPoint, IndicatorMetadata } from './indicators';
import { 
    subYears, 
    format, 
    eachDayOfInterval, 
    eachMonthOfInterval, 
    eachQuarterOfInterval, 
    parseISO, 
    isValid, 
    startOfMonth, 
    endOfMonth 
} from 'date-fns';
import { 
    fetchFredSeries, 
    fetchAlphaVantageData, 
    fetchCoinGeckoPriceHistory,
    fetchAlternativeMeFearGreedIndex
} from './api'; // Ensure all your API fetchers are imported
import {
    calculateYoYPercent,
    calculateMoMPercent,
    calculateQoQPercent,
    calculateMoMChange
} from './calculations'; // Ensure all calc functions are imported

// --- Helper for Default API Fetch Date Range (Consistent) ---
const getDefaultApiFetchRange = (): { startDate: string; endDate: string } => {
    const today = new Date();
    const oneYearAgo = subYears(today, 1); // Default to last 1 year
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
      actualStartDate = parseISO(apiDefaults.startDate); // Fallback to defaults
      actualEndDate = parseISO(apiDefaults.endDate);
      console.warn(`generateMockData for ${indicator.id}: Invalid date range or order [${dateRange?.startDate} - ${dateRange?.endDate}], using API defaults: ${apiDefaults.startDate} - ${apiDefaults.endDate}`);
  }

  const data: TimeSeriesDataPoint[] = [];
  let intervalGenerator: (interval: Interval) => Date[];
  const dateFormat = "yyyy-MM-dd";

  switch (indicator.frequency) {
    case 'Quarterly': intervalGenerator = eachQuarterOfInterval; break;
    case 'Monthly': intervalGenerator = eachMonthOfInterval; break;
    case 'Weekly': intervalGenerator = eachDayOfInterval; break; // Will be filtered
    case 'Daily': default: intervalGenerator = eachDayOfInterval; break;
  }

  let adjustedStartDateForInterval = new Date(actualStartDate);
  if (indicator.frequency === 'Monthly') {
      adjustedStartDateForInterval = startOfMonth(actualStartDate);
  }
  // For Quarterly, eachQuarterOfInterval handles alignment based on its input.

  let dates: Date[] = [];
   try {
       const intervalEnd = actualEndDate >= adjustedStartDateForInterval ? actualEndDate : adjustedStartDateForInterval;
       if (adjustedStartDateForInterval > intervalEnd) {
            console.warn(`generateMockData for ${indicator.id}: Adjusted start date (${format(adjustedStartDateForInterval, 'yyyy-MM-dd')}) is after end date (${format(intervalEnd, 'yyyy-MM-dd')}). No dates generated.`);
       } else {
            dates = intervalGenerator({ start: adjustedStartDateForInterval, end: intervalEnd });
            if (indicator.frequency === 'Weekly') {
                dates = dates.filter((_d, i) => i % 7 === 0);
            }
       }
   } catch (e) {
       console.error(`Error generating dates for mock ${indicator.id} (Freq: ${indicator.frequency}, Range: ${format(actualStartDate, 'yyyy-MM-dd')}-${format(actualEndDate, 'yyyy-MM-dd')}):`, e);
       try { 
           if (actualStartDate <= actualEndDate) { // Ensure valid range for fallback
               dates = eachDayOfInterval({ start: actualStartDate, end: actualEndDate }); 
           }
       } catch (fallbackError) {
           console.error("Fallback date generation also failed:", fallbackError);
           return []; // Cannot generate dates
       }
   }

  if (dates.length === 0) {
      console.warn(`generateMockData for ${indicator.id}: No dates were generated for the range.`);
      return [];
  }

  let baseValue = 100; let volatility = 5;
  if (indicator.id === 'SP500' || indicator.id === 'BTC_PRICE_USD') { 
      baseValue = (indicator.id === 'SP500' ? 4500 : 40000) + randomFn() * (indicator.id === 'SP500' ? 1000 : 10000); 
      volatility = (indicator.id === 'SP500' ? 50 : 2000); 
  } else if (indicator.id === 'CRYPTO_FEAR_GREED') { 
      baseValue = 50; volatility = 25;
  } else if (indicator.unit.includes('%')) { 
      baseValue = (randomFn() - 0.5) * 10; volatility = 0.5 + randomFn() * 1; 
  } else if (indicator.unit.includes('Index') && !indicator.id.includes('FEAR_GREED')) {
      baseValue = 100 + randomFn() * 20; volatility = 1 + randomFn() * 2; 
  } else if (indicator.unit.includes('Thousands')) { 
      baseValue = 1000 + randomFn() * 5000; volatility = 50 + randomFn() * 100; 
  } else if (indicator.unit.includes('Millions')) { 
      baseValue = (1000 + randomFn() * 5000) * 1000 ; volatility = (50 + randomFn() * 100) * 1000; 
  } else if (indicator.unit.includes('Billions')) { 
      baseValue = (1000 + randomFn() * 5000) * 1000000; volatility = (50 + randomFn() * 100) * 1000000; 
  } else if (indicator.unit.includes('Number')) { 
      baseValue = 300000 + randomFn() * 100000; volatility = 10000 + randomFn() * 5000; 
  } else if (indicator.unit.includes('USD per')) { 
      baseValue = 50 + randomFn() * 50; volatility = 2 + randomFn() * 3;
  } else if (indicator.unit.includes('per USD')) { 
      baseValue = 0.8 + randomFn() * 0.4; volatility = 0.02 + randomFn() * 0.03;
  }

  let currentValue = baseValue;
  for (const date of dates) {
    const trend = 0.01 * volatility * (randomFn() - 0.4);
    const noise = (randomFn() - 0.5) * volatility;
    currentValue += trend + noise;
    
    if (!indicator.unit.includes('%') && !indicator.id.includes('BALANCE') && !indicator.id.includes('SPREAD') && indicator.id !== 'CRYPTO_FEAR_GREED') { 
        currentValue = Math.max(currentValue, 0.01); 
    }
    if (indicator.id === 'PMI' || indicator.id === 'PMI_SERVICES') { currentValue = Math.max(30, Math.min(70, currentValue)); }
    if (indicator.id === 'UNRATE' || indicator.id === 'U6RATE') { currentValue = Math.max(1, Math.min(15, currentValue)); }
    if (indicator.id === 'CRYPTO_FEAR_GREED') { currentValue = Math.max(0, Math.min(100, Math.round(currentValue))); }
    if (indicator.id === 'CAPUTIL') { currentValue = Math.max(50, Math.min(90, currentValue));}

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

    if (
        dateRangeFromPage &&
        dateRangeFromPage.startDate && isValid(parseISO(dateRangeFromPage.startDate)) &&
        dateRangeFromPage.endDate && isValid(parseISO(dateRangeFromPage.endDate))
    ) {
        actualDateRangeToUse = { 
            startDate: dateRangeFromPage.startDate, 
            endDate: dateRangeFromPage.endDate 
        };
    } else if (
        dateRangeFromPage &&
        dateRangeFromPage.startDate && isValid(parseISO(dateRangeFromPage.startDate))
    ) {
        actualDateRangeToUse = { 
            startDate: dateRangeFromPage.startDate, 
            endDate: defaultApiRange.endDate 
        };
        console.log(`[fetchIndicatorData] ID: ${indicator.id}: Using page start date, default end date.`);
    } else if (
        dateRangeFromPage &&
        dateRangeFromPage.endDate && isValid(parseISO(dateRangeFromPage.endDate))
    ) {
        actualDateRangeToUse = { 
            startDate: defaultApiRange.startDate, 
            endDate: dateRangeFromPage.endDate 
        };
        console.log(`[fetchIndicatorData] ID: ${indicator.id}: Using page end date, default start date.`);
    }
    else {
        if (dateRangeFromPage) { 
            console.log(`[fetchIndicatorData] ID: ${indicator.id}: Invalid/incomplete page date range, using API default.`);
        }
        actualDateRangeToUse = { ...defaultApiRange };
    }

    if (new Date(actualDateRangeToUse.startDate) > new Date(actualDateRangeToUse.endDate)) {
        console.warn(`[fetchIndicatorData] ID: ${indicator.id}: Start date ${actualDateRangeToUse.startDate} is after end date ${actualDateRangeToUse.endDate}. Corrected to default API range.`);
        actualDateRangeToUse = { ...defaultApiRange };
    }
    
    console.log(`[fetchIndicatorData] ID: ${indicator.id}, Source: ${indicator.apiSource}, Effective Range for User: ${actualDateRangeToUse.startDate} to ${actualDateRangeToUse.endDate}`);

    let rawFetchedData: TimeSeriesDataPoint[] = [];
    let effectiveDateRangeForApiCall = { ...actualDateRangeToUse }; 

    if (indicator.calculation === 'YOY_PERCENT' && actualDateRangeToUse.startDate) {
        try {
          const originalStartDate = parseISO(actualDateRangeToUse.startDate);
          effectiveDateRangeForApiCall.startDate = format(subYears(originalStartDate, 1), 'yyyy-MM-dd');
          console.log(`[fetchIndicatorData] ID: ${indicator.id}: Adjusted API call start date for YoY to ${effectiveDateRangeForApiCall.startDate}`);
        } catch (e) { 
          console.error(`[fetchIndicatorData] ID: ${indicator.id}: Error adjusting start date for YoY:`, e);
        }
    }

    let apiFetchAttempted = false;
    try {
      switch (indicator.apiSource) {
        case 'FRED':
          if (indicator.apiIdentifier) {
            rawFetchedData = await fetchFredSeries(indicator.apiIdentifier, effectiveDateRangeForApiCall);
            apiFetchAttempted = true;
          } else { console.warn(`[fetchIndicatorData] FRED source for ${indicator.id} but no apiIdentifier.`); }
          break;
        case 'AlphaVantage':
          if (indicator.apiIdentifier) {
            rawFetchedData = await fetchAlphaVantageData(indicator.apiIdentifier, effectiveDateRangeForApiCall);
            apiFetchAttempted = true;
          } else { console.warn(`[fetchIndicatorData] AlphaVantage source for ${indicator.id} but no apiIdentifier.`); }
          break;
        case 'CoinGeckoAPI':
          if (indicator.apiIdentifier) {
            rawFetchedData = await fetchCoinGeckoPriceHistory(indicator.apiIdentifier, effectiveDateRangeForApiCall);
            apiFetchAttempted = true;
          } else { console.warn(`[fetchIndicatorData] CoinGeckoAPI source for ${indicator.id} but no apiIdentifier (coinId).`); }
          break;
        case 'AlternativeMeAPI':
          rawFetchedData = await fetchAlternativeMeFearGreedIndex(effectiveDateRangeForApiCall); // apiIdentifier might not be needed here
          apiFetchAttempted = true;
          break;
        case 'Mock':
          console.log(`[fetchIndicatorData] Indicator ${indicator.id} explicitly set to Mock source.`);
          // Mock data will be generated in the fallback section
          break; 
        default:
          if (indicator.apiIdentifier) {
               console.warn(`[fetchIndicatorData] Treating unspecified source '${indicator.apiSource}' for ${indicator.id} as FRED due to apiIdentifier.`);
               rawFetchedData = await fetchFredSeries(indicator.apiIdentifier, effectiveDateRangeForApiCall);
               apiFetchAttempted = true;
          } else {
              console.warn(`[fetchIndicatorData] API source '${indicator.apiSource}' for ${indicator.id} not implemented and no apiIdentifier for fallback.`);
          }
          break;
      }
    } catch (error) {
        console.error(`[fetchIndicatorData] Error during API call for ${indicator.id} (Source: ${indicator.apiSource}):`, error);
    }

    // Fallback to mock data generation
    const realSources = ['FRED', 'AlphaVantage', 'CoinGeckoAPI', 'AlternativeMeAPI']; // List of real sources tried
    if ( indicator.apiSource === 'Mock' || 
        (apiFetchAttempted && rawFetchedData.length === 0) || 
        (!apiFetchAttempted && !realSources.includes(indicator.apiSource)) 
       ) {
      if (indicator.apiSource !== 'Mock') {
          console.warn(`[fetchIndicatorData] API fetch for ${indicator.id} (Source: ${indicator.apiSource}) returned no data or failed (or source not implemented). Generating mock data.`);
      }
      rawFetchedData = generateMockData(indicator, actualDateRangeToUse);
    }

    let processedData: TimeSeriesDataPoint[] = [...rawFetchedData];

    if (indicator.calculation && indicator.calculation !== 'NONE' && processedData.length > 0) {
        console.log(`[fetchIndicatorData] Applying calculation: ${indicator.calculation} for ${indicator.id} to ${processedData.length} raw points`);
        let calculatedSuccessfully = true;
        switch (indicator.calculation) {
          case 'YOY_PERCENT': 
            let lookback = 12;
            if (indicator.frequency === 'Quarterly') lookback = 4;
            else if (indicator.frequency === 'Weekly') lookback = 52;
            processedData = calculateYoYPercent(processedData, lookback); 
            break;
          case 'MOM_PERCENT': processedData = calculateMoMPercent(processedData); break;
          case 'QOQ_PERCENT': processedData = calculateQoQPercent(processedData); break;
          case 'MOM_CHANGE':  processedData = calculateMoMChange(processedData); break;
          default:
            console.warn(`[fetchIndicatorData] Unknown calculation type: ${indicator.calculation} for ${indicator.id}.`);
            calculatedSuccessfully = false;
            break;
        }
        if (calculatedSuccessfully) {
            console.log(`[fetchIndicatorData] Data points after ${indicator.calculation} for ${indicator.id}: ${processedData.length}`);
        }
    }
    
    // Filter data back to the originally requested/defaulted actualDateRangeToUse
    if (indicator.calculation === 'YOY_PERCENT' && 
        actualDateRangeToUse.startDate && 
        isValid(parseISO(actualDateRangeToUse.startDate)) && 
        processedData.length > 0
    ) {
        const originalRequestedStartDateObj = parseISO(actualDateRangeToUse.startDate);
        const originalDataLength = processedData.length;
        processedData = processedData.filter(dp => {
            try {
                return dp.date && isValid(parseISO(dp.date)) && parseISO(dp.date) >= originalRequestedStartDateObj;
            } catch { return false; }
        });
        if (originalDataLength !== processedData.length) {
          console.log(`[fetchIndicatorData] Filtered YoY data for ${indicator.id} back to original/default start date ${actualDateRangeToUse.startDate}. Points before: ${originalDataLength}, after: ${processedData.length}`);
        }
    }
    return processedData; // processedData is guaranteed to be an array
}