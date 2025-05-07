// src/lib/mockData.ts (Now acts as main data fetcher)
import { TimeSeriesDataPoint, IndicatorMetadata, CalculationType } from './indicators';
import { subYears, format, eachDayOfInterval, eachMonthOfInterval, eachQuarterOfInterval, parseISO } from 'date-fns';
import { fetchFredSeries } from './api'; // Import the real FRED fetcher
import {
    calculateYoYPercent,
    calculateMoMPercent,
    calculateQoQPercent,
    calculateMoMChange
} from './calculations'; // Import calculation functions

// --- Mock Data Generation (Keep for fallback/other sources) ---
export function generateMockData(indicator: IndicatorMetadata, years = 5): TimeSeriesDataPoint[] {
  const random = seededPseudoRandom(indicator.id);
  const endDate = new Date();
  const startDate = subYears(endDate, years);
  const data: TimeSeriesDataPoint[] = [];

  let intervalGenerator: (interval: Interval) => Date[];
  let dateFormat = "yyyy-MM-dd";

  switch (indicator.frequency) {
    case 'Quarterly': intervalGenerator = eachQuarterOfInterval; break;
    case 'Monthly': intervalGenerator = eachMonthOfInterval; break;
    case 'Weekly': intervalGenerator = eachDayOfInterval; break; // Approx
    case 'Daily': default: intervalGenerator = eachDayOfInterval; break;
  }

  const adjustedStartDate = new Date(startDate);
  if (indicator.frequency === 'Monthly' || indicator.frequency === 'Quarterly') {
      adjustedStartDate.setDate(1);
  }

  let dates: Date[];
   try {
       dates = intervalGenerator({ start: adjustedStartDate, end: endDate });
       if(indicator.frequency === 'Weekly') { dates = dates.filter((_d, i) => i % 7 === 0); }
   } catch (e) {
       console.error(`Error generating dates for mock ${indicator.id} (${indicator.frequency}):`, e);
       dates = eachDayOfInterval({ start: adjustedStartDate, end: endDate });
   }

  let baseValue = 100; let volatility = 5;
  // S&P 500 Mock data adjustment
  if (indicator.id === 'SP500') {
      baseValue = 4500 + random() * 1000; // More realistic S&P range
      volatility = 50;
  } else if (indicator.unit.includes('%')) { baseValue = (random() - 0.5) * 10; volatility = 0.5; }
  else if (indicator.unit.includes('Index')) { baseValue = 100 + random() * 20; volatility = 1; }
  else if (indicator.unit.includes('Thousands') || indicator.unit.includes('Millions') || indicator.unit.includes('Billions')) {
      baseValue = 1000 + random() * 5000; volatility = 50;
       if (indicator.unit.includes('Millions')) baseValue *= 1000;
       if (indicator.unit.includes('Billions')) baseValue *= 1000000;
  } else if (indicator.unit.includes('Number')) { baseValue = 300000 + random() * 100000; volatility = 10000; }
  else if (indicator.unit.includes('USD per')) { baseValue = 50 + random() * 50; volatility = 2;}
  else if (indicator.unit.includes('per USD')) { baseValue = 0.8 + random() * 0.4; volatility = 0.02;}

  let currentValue = baseValue;
  for (const date of dates) {
    const trend = 0.01 * volatility * (random() - 0.4);
    const noise = (random() - 0.5) * volatility;
    currentValue += trend + noise;
    if (!indicator.unit.includes('%') && !indicator.id.includes('BALANCE') && !indicator.id.includes('SPREAD')) { currentValue = Math.max(currentValue, 0); }
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
// Helper for mock data
function seededPseudoRandom(seedStr: string): () => number {
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) { seed = (seed * 31 + seedStr.charCodeAt(i)) | 0; }
    return () => { seed = (seed * 16807) % 2147483647; return (seed - 1) / 2147483646; };
}


// --- Main Data Fetching Function ---
export async function fetchIndicatorData(
    indicator: IndicatorMetadata,
    years: number = 5
): Promise<TimeSeriesDataPoint[]> {
  console.log(`Fetching data for ${indicator.id} (Source specified: ${indicator.apiSource}, Calc: ${indicator.calculation || 'NONE'})`);

  let rawFetchedData: TimeSeriesDataPoint[] = [];

  try {
    switch (indicator.apiSource) {
      case 'FRED':
        if (indicator.apiIdentifier) {
          // For YoY calculations, we might need more than `years` of data to calculate the first few points.
          // Fetch an extra year of data if YoY is needed.
          const fetchYears = indicator.calculation === 'YOY_PERCENT' ? years + 1 : years;
          rawFetchedData = await fetchFredSeries(indicator.apiIdentifier, fetchYears);
        } else {
          console.warn(`FRED source for ${indicator.id} but no apiIdentifier.`);
        }
        break;
      // ... (other API source cases)
      case 'Mock':
      case 'Other':
      default:
        break; // Will use mock data below
    }
  } catch (error) {
      console.error(`Error during API fetch for ${indicator.id}:`, error);
      rawFetchedData = [];
  }

  if (rawFetchedData.length === 0 && indicator.apiSource !== 'Mock') {
    console.log(`API fetch for ${indicator.id} returned no data or failed. Falling back to mock data.`);
    rawFetchedData = generateMockData(indicator, years);
     // If mock data is generated for something that needs calculation, it won't be accurate.
     // The calculation below will still run but on potentially meaningless mock "levels".
  } else if (rawFetchedData.length === 0 && indicator.apiSource === 'Mock') {
     rawFetchedData = generateMockData(indicator, years);
  }


  // --- Apply Calculations ---
  let processedData = rawFetchedData;
  if (indicator.calculation && indicator.calculation !== 'NONE' && rawFetchedData.length > 0) {
    console.log(`Applying calculation: ${indicator.calculation} for ${indicator.id}`);
    switch (indicator.calculation) {
      case 'YOY_PERCENT':
        // Determine lookback periods based on frequency for YoY
        let lookback = 12; // Default for monthly
        if (indicator.frequency === 'Quarterly') lookback = 4;
        else if (indicator.frequency === 'Weekly') lookback = 52;
        // Add other frequencies if necessary
        processedData = calculateYoYPercent(rawFetchedData, lookback);
        break;
      case 'MOM_PERCENT':
        processedData = calculateMoMPercent(rawFetchedData);
        break;
      case 'QOQ_PERCENT': // Assumes data is already quarterly
        processedData = calculateQoQPercent(rawFetchedData);
        break;
      case 'MOM_CHANGE':
        processedData = calculateMoMChange(rawFetchedData);
        break;
      // Add 'QOQ_CHANGE' if needed
      default:
        console.warn(`Unknown calculation type: ${indicator.calculation} for ${indicator.id}`);
    }
    console.log(`Data points after ${indicator.calculation} for ${indicator.id}: ${processedData.length}`);
  }

  return processedData;
}
