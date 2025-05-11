// src/lib/mockData.ts
import { TimeSeriesDataPoint, IndicatorMetadata, CalculationType } from './indicators';
import { subYears, format, eachDayOfInterval, eachMonthOfInterval, eachQuarterOfInterval, parseISO, isValid, startOfMonth, endOfMonth } from 'date-fns'; // Added isValid, startOfMonth, endOfMonth
import { fetchFredSeries } from './api';
import {
    calculateYoYPercent,
    calculateMoMPercent,
    calculateQoQPercent,
    calculateMoMChange
} from './calculations';

// --- Mock Data Generation (Keep for fallback/other sources) ---
export function generateMockData(
    indicator: IndicatorMetadata,
    dateRange?: { startDate?: string; endDate?: string }
): TimeSeriesDataPoint[] {
  const random = seededPseudoRandom(indicator.id);

  let actualEndDate = endOfMonth(new Date()); // Default to end of current month
  let actualStartDate = startOfMonth(subYears(new Date(), 5)); // Default to start of month 5 years ago

  if (dateRange?.startDate && dateRange?.endDate && isValid(parseISO(dateRange.startDate)) && isValid(parseISO(dateRange.endDate))) {
    actualStartDate = parseISO(dateRange.startDate);
    actualEndDate = parseISO(dateRange.endDate);
  } else if (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) {
    actualStartDate = parseISO(dateRange.startDate);
    // actualEndDate remains default (current date)
  } else if (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) {
    actualEndDate = parseISO(dateRange.endDate);
    // actualStartDate remains default (5 years ago)
  }
  
  if (!isValid(actualStartDate) || !isValid(actualEndDate) || actualStartDate > actualEndDate) {
      console.warn(`Invalid date range for mock data for ${indicator.id}, defaulting to last 5 years.`);
      actualEndDate = endOfMonth(new Date());
      actualStartDate = startOfMonth(subYears(new Date(), 5));
  }

  const data: TimeSeriesDataPoint[] = [];
  let intervalGenerator: (interval: Interval) => Date[];
  let dateFormat = "yyyy-MM-dd";

  switch (indicator.frequency) {
    case 'Quarterly': intervalGenerator = eachQuarterOfInterval; break;
    case 'Monthly': intervalGenerator = eachMonthOfInterval; break;
    case 'Weekly': intervalGenerator = eachDayOfInterval; break;
    case 'Daily': default: intervalGenerator = eachDayOfInterval; break;
  }

  const adjustedStartDateForInterval = new Date(actualStartDate);
   if (indicator.frequency === 'Monthly' || indicator.frequency === 'Quarterly') {
       // Ensure the start date aligns with the frequency for interval generation
       if (indicator.frequency === 'Monthly') adjustedStartDateForInterval.setDate(1);
       // For quarterly, date-fns eachQuarterOfInterval handles alignment
   }


  let dates: Date[];
   try {
       // Ensure interval is valid
       const intervalEnd = actualEndDate > adjustedStartDateForInterval ? actualEndDate : adjustedStartDateForInterval;
       dates = intervalGenerator({ start: adjustedStartDateForInterval, end: intervalEnd });
       if(indicator.frequency === 'Weekly') { dates = dates.filter((_d, i) => i % 7 === 0); }
   } catch (e) {
       console.error(`Error generating dates for mock ${indicator.id} (${indicator.frequency}) with range ${format(actualStartDate, 'yyyy-MM-dd')} to ${format(actualEndDate, 'yyyy-MM-dd')}:`, e);
       dates = eachDayOfInterval({ start: actualStartDate, end: actualEndDate }); // Fallback
   }

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
    const trend = 0.01 * volatility * (random() - 0.4);
    const noise = (random() - 0.5) * volatility;
    currentValue += trend + noise;
    if (!indicator.unit.includes('%') && !indicator.id.includes('BALANCE') && !indicator.id.includes('SPREAD')) { currentValue = Math.max(currentValue, 0.01); } // Avoid 0 for calcs
    if (indicator.id === 'PMI') { currentValue = Math.max(30, Math.min(70, currentValue)); }
    if (indicator.id === 'UNRATE') { currentValue = Math.max(1, Math.min(15, currentValue)); }
    const value = random() > 0.02 ? parseFloat(currentValue.toFixed(2)) : null;
    data.push({ date: format(date, dateFormat), value: value });
  }
   if (data.length > 0 && data[data.length - 1].value === null) {
       const lastValidValue = data.slice().reverse().find(d => d.value !== null)?.value;
       data[data.length - 1].value = lastValidValue ?? parseFloat((baseValue + (random() - 0.5) * volatility).toFixed(2));
   }
  return data;
}

function seededPseudoRandom(seedStr: string): () => number {
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) { seed = (seed * 31 + seedStr.charCodeAt(i)) | 0; }
    return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}

export async function fetchIndicatorData(
    indicator: IndicatorMetadata,
    dateRange?: { startDate?: string; endDate?: string }
): Promise<TimeSeriesDataPoint[]> {
  console.log(`Fetching data for ${indicator.id} (Source: ${indicator.apiSource}, Calc: ${indicator.calculation || 'NONE'}) Range: ${dateRange?.startDate || 'default start'} to ${dateRange?.endDate || 'default end'}`);

  let rawFetchedData: TimeSeriesDataPoint[] = [];
  let effectiveDateRange = { ...dateRange };

  if (indicator.calculation === 'YOY_PERCENT' && dateRange?.startDate && isValid(parseISO(dateRange.startDate))) {
      try {
        const originalStartDate = parseISO(dateRange.startDate);
        effectiveDateRange.startDate = format(subYears(originalStartDate, 1), 'yyyy-MM-dd');
        console.log(`Adjusted start date for YoY for ${indicator.id} to ${effectiveDateRange.startDate}`);
      } catch (e) {
        console.error("Error adjusting start date for YoY calculation:", e);
      }
  }

  try {
    switch (indicator.apiSource) {
      case 'FRED':
        if (indicator.apiIdentifier) {
          rawFetchedData = await fetchFredSeries(indicator.apiIdentifier, effectiveDateRange);
        } else {
          console.warn(`FRED source for ${indicator.id} but no apiIdentifier. No real data fetched.`);
          rawFetchedData = generateMockData(indicator, effectiveDateRange); // Fallback to mock if no ID
        }
        break;
      case 'Mock':
        console.warn(`Indicator ${indicator.id} is configured as 'Mock' source. Generating mock data.`);
        rawFetchedData = generateMockData(indicator, effectiveDateRange);
        break;
      // Add cases for 'AlphaVantage', etc.
      default:
        // Attempt FRED if an apiIdentifier exists, otherwise mock
        if (indicator.apiIdentifier && indicator.apiSource !== 'AlphaVantage' /* add other non-FRED sources */) {
             console.warn(`Treating ${indicator.apiSource} for ${indicator.id} as FRED due to apiIdentifier. Consider changing apiSource to 'FRED'.`);
             rawFetchedData = await fetchFredSeries(indicator.apiIdentifier, effectiveDateRange);
        } else if (indicator.apiSource !== 'AlphaVantage') { // Don't mock if it's a planned but not-yet-implemented real source
            console.warn(`API source '${indicator.apiSource}' for ${indicator.id} not implemented. Generating mock data as fallback.`);
            rawFetchedData = generateMockData(indicator, effectiveDateRange);
        } else {
            console.warn(`API source '${indicator.apiSource}' for ${indicator.id} not implemented. No data fetched or mocked.`);
            rawFetchedData = []; // No data if it's a specific API not yet done
        }
        break;
    }
  } catch (error) {
      console.error(`Error during API fetch for ${indicator.id}:`, error);
      console.log(`Falling back to mock data for ${indicator.id} due to API error.`);
      rawFetchedData = generateMockData(indicator, effectiveDateRange);
  }

  // If real API was attempted and failed/returned no data, fall back to mock.
  // If apiSource was 'Mock' initially, rawFetchedData already contains mock data.
  if (rawFetchedData.length === 0 && indicator.apiSource !== 'Mock') {
    console.log(`API fetch for ${indicator.id} (Source: ${indicator.apiSource}) returned no data. Generating mock data for range.`);
    rawFetchedData = generateMockData(indicator, effectiveDateRange);
  }

  let processedData = [...rawFetchedData]; // Create a copy for processing

  if (indicator.calculation && indicator.calculation !== 'NONE' && processedData.length > 0) {
    console.log(`Applying calculation: ${indicator.calculation} for ${indicator.id}`);
    switch (indicator.calculation) {
      case 'YOY_PERCENT':
        let lookback = 12;
        if (indicator.frequency === 'Quarterly') lookback = 4;
        else if (indicator.frequency === 'Weekly') lookback = 52;
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
        console.warn(`Unknown calculation type: ${indicator.calculation} for ${indicator.id}`);
    }
    console.log(`Data points after ${indicator.calculation} for ${indicator.id}: ${processedData.length}`);
  }
  
  // Filter data back to the originally requested date range if YoY pre-fetching extended it
  if (indicator.calculation === 'YOY_PERCENT' && dateRange?.startDate && isValid(parseISO(dateRange.startDate)) && processedData.length > 0) {
      const originalRequestedStartDate = parseISO(dateRange.startDate);
      processedData = processedData.filter(dp => {
          try {
              return parseISO(dp.date) >= originalRequestedStartDate;
          } catch { return true; }
      });
       console.log(`Filtered YoY data for ${indicator.id} back to original start date. Points: ${processedData.length}`);
  }

  return processedData;
}