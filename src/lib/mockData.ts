// src/lib/mockData.ts
import { TimeSeriesDataPoint, IndicatorMetadata } from './indicators';
import { subYears, format, eachDayOfInterval, eachMonthOfInterval, eachQuarterOfInterval, parseISO } from 'date-fns';

// Simple pseudo-random number generator for deterministic mocks based on indicator ID
function seededPseudoRandom(seedStr: string): () => number {
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) {
        seed = (seed * 31 + seedStr.charCodeAt(i)) | 0; // Simple hash
    }
    return () => {
        seed = (seed * 16807) % 2147483647; // LCG parameters
        return (seed - 1) / 2147483646; // Normalize to [0, 1)
    };
}


// Generate mock time series data
export function generateMockData(indicator: IndicatorMetadata, years = 5): TimeSeriesDataPoint[] {
  const random = seededPseudoRandom(indicator.id); // Seed PRNG with indicator ID
  const endDate = new Date(); // Today
  const startDate = subYears(endDate, years);
  const data: TimeSeriesDataPoint[] = [];

  let intervalGenerator: (interval: Interval) => Date[];
  let dateFormat = "yyyy-MM-dd"; // Default daily/monthly

  switch (indicator.frequency) {
    case 'Quarterly':
      intervalGenerator = eachQuarterOfInterval;
      dateFormat = "yyyy-MM-dd"; // FRED uses first day of quarter
      break;
    case 'Monthly':
      intervalGenerator = eachMonthOfInterval;
      dateFormat = "yyyy-MM-dd"; // FRED uses first day of month
      break;
    case 'Weekly': // Add weekly case if needed
       // Custom logic or find a library function for weekly intervals
       // For simplicity, we might approximate with monthly here for mock
       intervalGenerator = eachMonthOfInterval; // Approximation
       dateFormat = "yyyy-MM-dd";
       break;
    case 'Daily':
    default: // Assume daily if not specified
      intervalGenerator = eachDayOfInterval;
      dateFormat = "yyyy-MM-dd";
      break;
  }

  // Adjust start date slightly for interval functions if needed
  const adjustedStartDate = new Date(startDate);
  if (indicator.frequency === 'Monthly' || indicator.frequency === 'Quarterly') {
      adjustedStartDate.setDate(1); // Start from the first day of the month/quarter start month
  }

  let dates: Date[];
   try {
       dates = intervalGenerator({ start: adjustedStartDate, end: endDate });
   } catch (e) {
       console.error(`Error generating dates for ${indicator.id} (${indicator.frequency}):`, e);
       // Fallback to daily if interval generation fails
       dates = eachDayOfInterval({ start: adjustedStartDate, end: endDate });
       dateFormat = "yyyy-MM-dd";
   }


  // Base value and volatility based on unit/type
  let baseValue = 100;
  let volatility = 5;
  if (indicator.unit.includes('%')) {
      baseValue = (random() - 0.5) * 10; // Start around -5% to 5%
      volatility = 0.5;
  } else if (indicator.unit.includes('Index')) {
      baseValue = 100 + random() * 20;
      volatility = 1;
  } else if (indicator.unit.includes('Thousands') || indicator.unit.includes('Millions') || indicator.unit.includes('Billions')) {
      baseValue = 1000 + random() * 5000;
      volatility = 50;
       if (indicator.unit.includes('Millions')) baseValue *= 1000;
       if (indicator.unit.includes('Billions')) baseValue *= 1000000;
  } else if (indicator.unit.includes('Number')) {
       baseValue = 300000 + random() * 100000; // e.g., Jobless Claims
       volatility = 10000;
  }


  let currentValue = baseValue;

  for (const date of dates) {
    // Simulate some trend and noise
    const trend = 0.01 * volatility * (random() - 0.4); // Slight positive bias
    const noise = (random() - 0.5) * volatility;
    currentValue += trend + noise;

    // Ensure value stays somewhat reasonable
     if (!indicator.unit.includes('%') && !indicator.id.includes('BALANCE')) { // Allow negative for balance
        currentValue = Math.max(currentValue, 0); // Prevent negative values unless it's a % change or balance
     }
     if (indicator.id === 'PMI') {
         currentValue = Math.max(30, Math.min(70, currentValue)); // Keep PMI in reasonable range
     }
     if (indicator.id === 'UNRATE') {
         currentValue = Math.max(1, Math.min(15, currentValue)); // Keep Unemployment Rate in reasonable range
     }


    // Simulate occasional missing data points (e.g., 2% chance)
    const value = random() > 0.02 ? parseFloat(currentValue.toFixed(2)) : null;

    data.push({
      date: format(date, dateFormat),
      value: value,
    });
  }

   // Ensure the last point has a value for display purposes
   if (data.length > 0 && data[data.length - 1].value === null) {
       const lastValidValue = data.slice().reverse().find(d => d.value !== null)?.value;
       data[data.length - 1].value = lastValidValue ?? parseFloat((baseValue + (random() - 0.5) * volatility).toFixed(2));
   }


  // console.log(`Generated ${data.length} mock data points for ${indicator.id}`);
  return data;
}

// --- TODO: Implement Real API Fetching Logic ---
// Example placeholder for FRED API call
// import { getDateRange } from './utils';
// async function fetchFredSeries(seriesId: string, years: number = 5): Promise<TimeSeriesDataPoint[]> {
//     const apiKey = process.env.FRED_API_KEY;
//     if (!apiKey) {
//         console.warn(`FRED API Key not found for ${seriesId}. Returning empty array.`);
//         return [];
//     }
//     const { startDate, endDate } = getDateRange(years);
//     const url = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&observation_start=${startDate}&observation_end=${endDate}`;

//     try {
//         const response = await fetch(url);
//         if (!response.ok) throw new Error(`FRED API Error (${response.status})`);
//         const data = await response.json();
//         return data.observations.map((obs: { date: string; value: string }) => ({
//             date: obs.date,
//             value: obs.value === '.' ? null : parseFloat(obs.value),
//         })).filter((d: TimeSeriesDataPoint) => d.value !== null && !isNaN(d.value));
//     } catch (error) {
//         console.error(`Error fetching FRED series ${seriesId}:`, error);
//         return []; // Return empty on error
//     }
// }


// Function to fetch data - currently only uses mock data
// In a real app, this would check indicator.apiSource and call the appropriate API function
export async function fetchIndicatorData(indicator: IndicatorMetadata, years = 5): Promise<TimeSeriesDataPoint[]> {
  console.log(`Fetching data for ${indicator.id} (Source: ${indicator.apiSource})`);

  // --- API Integration Point ---
  // if (indicator.apiSource === 'FRED' && indicator.apiIdentifier) {
  //   try {
  //     // const fredData = await fetchFredSeries(indicator.apiIdentifier, years);
  //     // console.log(`Fetched ${fredData.length} points from FRED for ${indicator.id}`);
  //     // return fredData;
  //      console.warn(`FRED API call for ${indicator.apiIdentifier} not implemented yet. Using mock data.`);
  //      return generateMockData(indicator, years); // Use mock as fallback during dev
  //   } catch (error) {
  //     console.error(`Error fetching FRED data for ${indicator.id}:`, error);
  //      return generateMockData(indicator, years); // Fallback to mock on error
  //   }
  // } else if (indicator.apiSource === 'AlphaVantage' && indicator.apiIdentifier) {
  //    // TODO: Implement Alpha Vantage fetching logic
  //    console.warn(`AlphaVantage API call for ${indicator.apiIdentifier} not implemented. Using mock data.`);
  //    return generateMockData(indicator, years);
  // }

  // Default to mock data
  // console.log(`Using mock data for ${indicator.id}`);
  return generateMockData(indicator, years);
}
