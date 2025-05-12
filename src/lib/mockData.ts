// src/lib/mockData.ts
import { TimeSeriesDataPoint, IndicatorMetadata, CalculationType } from './indicators';
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
import { fetchFredSeries, fetchAlphaVantageData } from './api';
import {
    calculateYoYPercent,
    calculateMoMPercent,
    calculateQoQPercent,
    calculateMoMChange
    // Note: calculateMovingAverage and calculateSeriesStatistics are used in IndicatorCard, not directly here.
} from './calculations';

// --- Mock Data Generation ---
export function generateMockData(
    indicator: IndicatorMetadata,
    dateRange?: { startDate?: string; endDate?: string }
): TimeSeriesDataPoint[] {
  const random = seededPseudoRandom(indicator.id);

  // Define default range for mock data generation if not provided or invalid
  const todayForMock = new Date();
  const oneYearAgoForMock = subYears(todayForMock, 1);
  let actualStartDate = dateRange?.startDate && isValid(parseISO(dateRange.startDate)) 
                        ? parseISO(dateRange.startDate) 
                        : oneYearAgoForMock;
  let actualEndDate = dateRange?.endDate && isValid(parseISO(dateRange.endDate))
                      ? parseISO(dateRange.endDate)
                      : todayForMock;
  
  if (!isValid(actualStartDate) || !isValid(actualEndDate) || actualStartDate > actualEndDate) {
      console.warn(`Invalid date range for mock data generation for ${indicator.id}, defaulting to last 1 year.`);
      actualEndDate = todayForMock;
      actualStartDate = oneYearAgoForMock;
  }

  const data: TimeSeriesDataPoint[] = [];
  let intervalGenerator: (interval: Interval) => Date[];
  const dateFormat = "yyyy-MM-dd";

  switch (indicator.frequency) {
    case 'Quarterly': intervalGenerator = eachQuarterOfInterval; break;
    case 'Monthly': intervalGenerator = eachMonthOfInterval; break;
    case 'Weekly': intervalGenerator = eachDayOfInterval; break; // Will be filtered later
    case 'Daily': default: intervalGenerator = eachDayOfInterval; break;
  }

  // Adjust start date for interval generation to align with frequency
  let adjustedStartDateForInterval = new Date(actualStartDate);
  if (indicator.frequency === 'Monthly') {
    adjustedStartDateForInterval = startOfMonth(actualStartDate);
  } else if (indicator.frequency === 'Quarterly') {
    // eachQuarterOfInterval handles quarter alignment naturally
    // No specific adjustment needed here if start date is within a quarter
  }


  let dates: Date[];
   try {
       // Ensure interval is valid (end date is not before start date)
       const intervalEnd = actualEndDate > adjustedStartDateForInterval ? actualEndDate : adjustedStartDateForInterval;
       dates = intervalGenerator({ start: adjustedStartDateForInterval, end: intervalEnd });
       if (indicator.frequency === 'Weekly') { 
           dates = dates.filter((_d, i) => i % 7 === 0); // Approx. weekly from daily
       }
   } catch (e) {
       console.error(`Error generating dates for mock ${indicator.id} (${indicator.frequency}) with range ${format(actualStartDate, 'yyyy-MM-dd')} to ${format(actualEndDate, 'yyyy-MM-dd')}:`, e);
       // Fallback to daily if interval generation fails
       try {
            dates = eachDayOfInterval({ start: actualStartDate, end: actualEndDate });
       } catch (fallbackError) {
           console.error("Fallback date generation also failed:", fallbackError);
           return []; // Cannot generate dates
       }
   }

  // Base value and volatility logic (same as before)
  let baseValue = 100; let volatility = 5;
  if (indicator.id === 'SP500') { baseValue = 4500 + random() * 1000; volatility = 50; }
  else if (indicator.unit.includes('%')) { baseValue = (random() - 0.5) * 10; volatility = 0.5; }
  else if (indicator.unit.includes('Index')) { baseValue = 100 + random() * 20; volatility = 1; }
  else if (indicator.unit.includes('Thousands')) { baseValue = 1000 + random() * 5000; volatility = 50; }
  else if (indicator.unit.includes('Millions')) { baseValue = (1000 + random() * 5000) * 1000 ; volatility = 50 * 1000; }
  else if (indicator.unit.includes('Billions')) { baseValue = (1000 + random() * 5000) * 1000000; volatility = 50 * 1000000; }
  else if (indicator.unit.includes('Number')) { baseValue = 300000 + random() * 100000; volatility = 10000; }
  else if (indicator.unit.includes('USD per')) { baseValue = 50 + random() * 50; volatility = 2;}
  else if (indicator.unit.includes('per USD')) { baseValue = 0.8 + random() * 0.4; volatility = 0.02;}

  let currentValue = baseValue;
  for (const date of dates) {
    const trend = 0.01 * volatility * (random() - 0.4); // Slight upward bias
    const noise = (random() - 0.5) * volatility;
    currentValue += trend + noise;
    
    // Constraints
    if (!indicator.unit.includes('%') && !indicator.id.includes('BALANCE') && !indicator.id.includes('SPREAD')) { 
        currentValue = Math.max(currentValue, 0.01); // Avoid 0 or negative for most values
    }
    if (indicator.id === 'PMI' || indicator.id === 'PMI_SERVICES') { currentValue = Math.max(30, Math.min(70, currentValue)); }
    if (indicator.id === 'UNRATE' || indicator.id === 'U6RATE') { currentValue = Math.max(1, Math.min(15, currentValue)); }
    if (indicator.id === 'CAPUTIL') { currentValue = Math.max(50, Math.min(90, currentValue));}

    const value = random() > 0.02 ? parseFloat(currentValue.toFixed(2)) : null; // ~2% chance of missing data
    data.push({ date: format(date, dateFormat), value: value });
  }

   // Ensure last point has a value if possible for "latestValue" display
   if (data.length > 0 && data[data.length - 1].value === null) {
       const lastValidValue = data.slice(0, -1).reverse().find(d => d.value !== null)?.value;
       data[data.length - 1].value = lastValidValue ?? parseFloat((baseValue + (random() - 0.5) * volatility).toFixed(2));
   }
  return data;
}

function seededPseudoRandom(seedStr: string): () => number {
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) { seed = (seed * 31 + seedStr.charCodeAt(i)) | 0; }
    return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}

// --- Main Data Fetching Orchestrator ---

// Helper for consistent default API date range
const getDefaultApiFetchRange = () => {
    const today = new Date();
    const oneYearAgo = subYears(today, 1);
    return {
      startDate: format(oneYearAgo, 'yyyy-MM-dd'),
      endDate: format(today, 'yyyy-MM-dd')
    };
};

export async function fetchIndicatorData(
    indicator: IndicatorMetadata,
    dateRangeFromPage?: { startDate?: string; endDate?: string } // Dates from DateRangePicker
): Promise<TimeSeriesDataPoint[]> {
    
    let actualDateRangeToUse = { ...dateRangeFromPage };
    const defaultApiRange = getDefaultApiFetchRange();

    // Validate and apply defaults for the date range that will be used for fetching and final filtering
    if (!actualDateRangeToUse.startDate || !isValid(parseISO(actualDateRangeToUse.startDate))) {
        actualDateRangeToUse.startDate = defaultApiRange.startDate;
        if (dateRangeFromPage?.startDate) console.log(`fetchIndicatorData for ${indicator.id}: Invalid/missing start date from page, using API default: ${actualDateRangeToUse.startDate}`);
    }
    if (!actualDateRangeToUse.endDate || !isValid(parseISO(actualDateRangeToUse.endDate))) {
        actualDateRangeToUse.endDate = defaultApiRange.endDate;
        if (dateRangeFromPage?.endDate) console.log(`fetchIndicatorData for ${indicator.id}: Invalid/missing end date from page, using API default: ${actualDateRangeToUse.endDate}`);
    }
    // Ensure start is not after end for the actualDateRangeToUse
    if (new Date(actualDateRangeToUse.startDate) > new Date(actualDateRangeToUse.endDate)) {
        console.warn(`fetchIndicatorData for ${indicator.id}: Start date ${actualDateRangeToUse.startDate} is after end date ${actualDateRangeToUse.endDate}. Using default API range.`);
        actualDateRangeToUse = { ...defaultApiRange };
    }
    
    console.log(`Fetching data for ${indicator.id} (Source: ${indicator.apiSource}, Calc: ${indicator.calculation || 'NONE'}) Effective Range: ${actualDateRangeToUse.startDate} to ${actualDateRangeToUse.endDate}`);

    let rawFetchedData: TimeSeriesDataPoint[] = [];
    // This is the range passed to API fetchers; it might be wider for YoY pre-fetch
    let effectiveDateRangeForApiCall = { ...actualDateRangeToUse }; 

    if (indicator.calculation === 'YOY_PERCENT' && actualDateRangeToUse.startDate) {
        try {
          const originalStartDate = parseISO(actualDateRangeToUse.startDate);
          effectiveDateRangeForApiCall.startDate = format(subYears(originalStartDate, 1), 'yyyy-MM-dd');
          console.log(`Adjusted API call start date for YoY for ${indicator.id} to ${effectiveDateRangeForApiCall.startDate}`);
        } catch (e) { 
          console.error(`Error adjusting start date for YoY calculation for ${indicator.id}:`, e);
          // If error, effectiveDateRangeForApiCall.startDate remains actualDateRangeToUse.startDate
        }
    }

    let apiFetchAttempted = false;
    try {
      switch (indicator.apiSource) {
        case 'FRED':
          if (indicator.apiIdentifier) {
            rawFetchedData = await fetchFredSeries(indicator.apiIdentifier, effectiveDateRangeForApiCall);
            apiFetchAttempted = true;
          } else { console.warn(`FRED source for ${indicator.id} but no apiIdentifier.`); }
          break;
        case 'AlphaVantage':
          if (indicator.apiIdentifier) {
            rawFetchedData = await fetchAlphaVantageData(indicator.apiIdentifier, effectiveDateRangeForApiCall);
            apiFetchAttempted = true;
          } else { console.warn(`AlphaVantage source for ${indicator.id} but no apiIdentifier.`); }
          break;
        case 'Mock':
          // Will generate mock data in the fallback section if this case is hit
          break; 
        default:
          // Attempt FRED if an apiIdentifier exists for other specified sources, otherwise will fallback to mock
          if (indicator.apiIdentifier) {
               console.warn(`Treating unspecified source '${indicator.apiSource}' for ${indicator.id} as FRED due to apiIdentifier. Consider changing apiSource to 'FRED'.`);
               rawFetchedData = await fetchFredSeries(indicator.apiIdentifier, effectiveDateRangeForApiCall);
               apiFetchAttempted = true;
          } else {
              console.warn(`API source '${indicator.apiSource}' for ${indicator.id} not implemented and no apiIdentifier for fallback. Mock data will be used.`);
          }
          break;
      }
    } catch (error) {
        console.error(`Error during API fetch for ${indicator.id}:`, error);
        // rawFetchedData will be empty, leading to mock data generation below if appropriate
    }

    // Fallback to mock data if:
    // 1. apiSource was 'Mock'.
    // 2. A real API was attempted (apiFetchAttempted) but returned no data or failed.
    // 3. No API was attempted for a non-Mock source (e.g., missing identifier).
    if (indicator.apiSource === 'Mock' || (apiFetchAttempted && rawFetchedData.length === 0) || (!apiFetchAttempted && indicator.apiSource !== 'AlphaVantage' /* && other explicitly handled real sources */) ) {
      if (indicator.apiSource !== 'Mock') { // Log only if it wasn't supposed to be mock
          console.log(`API fetch for ${indicator.id} (Source: ${indicator.apiSource}) returned no data or failed. Generating mock data for range: ${actualDateRangeToUse.startDate} to ${actualDateRangeToUse.endDate}`);
      } else {
          console.log(`Generating mock data for ${indicator.id} (Source: Mock) for range: ${actualDateRangeToUse.startDate} to ${actualDateRangeToUse.endDate}`);
      }
      rawFetchedData = generateMockData(indicator, actualDateRangeToUse); // Generate mock with the determined actualDateRangeToUse
    }


    let processedData = [...rawFetchedData]; // Create a copy for processing

    if (indicator.calculation && indicator.calculation !== 'NONE' && processedData.length > 0) {
        console.log(`Applying calculation: ${indicator.calculation} for ${indicator.id} to ${processedData.length} raw points`);
        switch (indicator.calculation) {
          case 'YOY_PERCENT':
            let lookback = 12; // Default for monthly
            if (indicator.frequency === 'Quarterly') lookback = 4;
            else if (indicator.frequency === 'Weekly') lookback = 52;
            // Add other frequencies if necessary for YoY
            processedData = calculateYoYPercent(processedData, lookback);
            break;
          case 'MOM_PERCENT':
            processedData = calculateMoMPercent(processedData);
            break;
          case 'QOQ_PERCENT':
            processedData = calculateQoQPercent(processedData);
            break;
          case 'MOM_CHANGE':
            processedData = calculateMoMChange(processedData);
            break;
          default:
            console.warn(`Unknown calculation type: ${indicator.calculation} for ${indicator.id}. Data not processed.`);
        }
        console.log(`Data points after ${indicator.calculation} for ${indicator.id}: ${processedData.length}`);
    }
    
    // Filter data back to the *originally requested/defaulted actualDateRangeToUse* if YoY pre-fetching extended the data fetched from API.
    if (indicator.calculation === 'YOY_PERCENT' && actualDateRangeToUse.startDate && isValid(parseISO(actualDateRangeToUse.startDate)) && processedData.length > 0) {
        const originalRequestedStartDateObj = parseISO(actualDateRangeToUse.startDate);
        const originalDataLength = processedData.length;

        processedData = processedData.filter(dp => {
            try {
                // Ensure dp.date is valid and not null before parsing for comparison
                return dp.date && isValid(parseISO(dp.date)) && parseISO(dp.date) >= originalRequestedStartDateObj;
            } catch { return false; } // Exclude if date is unparseable
        });

        if (originalDataLength !== processedData.length) {
          console.log(`Filtered YoY data for ${indicator.id} back to original/default start date ${actualDateRangeToUse.startDate}. Points before: ${originalDataLength}, after: ${processedData.length}`);
        }
    }
    return processedData;
}