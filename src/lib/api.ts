// src/lib/api.ts
import { TimeSeriesDataPoint, FredResponse, FredObservation } from './indicators'; // Adjusted imports if FredResponse/Observation moved
import { subYears, format, isValid, parseISO } from 'date-fns'; // Added isValid, parseISO

const FRED_API_URL = 'https://api.stlouisfed.org/fred/series/observations';

export async function fetchFredSeries(
  seriesId: string,
  dateRange?: { startDate?: string; endDate?: string }
): Promise<TimeSeriesDataPoint[]> {
  const apiKey = process.env.FRED_API_KEY;

  if (!apiKey) {
    console.error(`FRED API Key not found in environment variables for series ${seriesId}.`);
    return [];
  }

  let formattedStartDate: string;
  let formattedEndDate: string;

  if (dateRange?.startDate && dateRange?.endDate && isValid(parseISO(dateRange.startDate)) && isValid(parseISO(dateRange.endDate))) {
    formattedStartDate = dateRange.startDate;
    formattedEndDate = dateRange.endDate;
  } else {
    const_endDate = new Date(); // Renamed to avoid conflict if used in broader scope
    const_startDate = subYears(endDate, 5);
    formattedStartDate = format(startDate, 'yyyy-MM-dd');
    formattedEndDate = format(endDate, 'yyyy-MM-dd');
    console.warn(`Invalid or missing date range for ${seriesId}, defaulting to last 5 years.`);
  }
  
  if (new Date(formattedStartDate) > new Date(formattedEndDate)) {
      console.warn(`Start date ${formattedStartDate} is after end date ${formattedEndDate} for ${seriesId}. Returning empty or consider swapping.`);
      // Option 1: Return empty
      // return [];
      // Option 2: Swap them (FRED API might handle this, but good to be explicit or warn)
      [formattedStartDate, formattedEndDate] = [formattedEndDate, formattedStartDate];
      console.warn(`Swapped dates: new start ${formattedStartDate}, new end ${formattedEndDate}`);
  }

  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: 'json',
    observation_start: formattedStartDate,
    observation_end: formattedEndDate,
  });

  const url = `${FRED_API_URL}?${params.toString()}`;
  console.log(`Fetching FRED: ${seriesId} from ${formattedStartDate} to ${formattedEndDate}`);

  try {
    const response = await fetch(url, {
      next: { revalidate: 3600 * 6 }, // Revalidate data every 6 hours
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FRED API Error (${response.status}) for ${seriesId}: ${errorText}`);
    }

    const data: FredResponse = await response.json();

    if (!data || !data.observations) {
        console.warn(`No observations found in FRED response for ${seriesId}`);
        return [];
    }

    const formattedData = data.observations
      .map((obs: FredObservation): TimeSeriesDataPoint | null => {
        if (!obs.date || !isValid(parseISO(obs.date))) return null; // Validate date string
        const value = obs.value === '.' ? null : parseFloat(obs.value);
        if (value === null || isNaN(value)) {
          return null;
        }
        return {
          date: obs.date,
          value: value,
        };
      })
      .filter((point): point is TimeSeriesDataPoint => point !== null);

    console.log(`Fetched ${formattedData.length} valid points from FRED for ${seriesId}`);
    return formattedData;

  } catch (error) {
    console.error(`Error fetching or processing FRED series ${seriesId}:`, error);
    return [];
  }
}