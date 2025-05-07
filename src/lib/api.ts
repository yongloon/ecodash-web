// src/lib/api.ts
import { TimeSeriesDataPoint } from './indicators';
import { subYears, format } from 'date-fns';

// --- FRED API Fetching Logic ---

const FRED_API_URL = 'https://api.stlouisfed.org/fred/series/observations';

// Interface for the raw observation data from FRED API
interface FredObservation {
  date: string;       // "YYYY-MM-DD"
  value: string;      // Value is returned as a string, "." means missing data
}

// Interface for the overall FRED API response structure
interface FredResponse {
  observations: FredObservation[];
  // Add other potential fields if needed (e.g., units, frequency, title)
}

/**
 * Fetches time series data from the FRED API for a given series ID.
 * @param seriesId - The FRED series ID (e.g., "GDPC1", "UNRATE").
 * @param years - Optional number of years of historical data to fetch (default: 5).
 * @returns A promise that resolves to an array of TimeSeriesDataPoint objects.
 */
export async function fetchFredSeries(
  seriesId: string,
  years: number = 5
): Promise<TimeSeriesDataPoint[]> {
  const apiKey = process.env.FRED_API_KEY;

  // Check if the API key is available
  if (!apiKey) {
    console.error(`FRED API Key not found in environment variables for series ${seriesId}.`);
    // Return empty array or throw error, depending on desired handling
    // In a real app, might want to show a specific error state to the user.
    return []; // Return empty for now to avoid crashing server components
  }

  // Calculate start and end dates
  const endDate = new Date();
  const startDate = subYears(endDate, years);
  const formattedStartDate = format(startDate, 'yyyy-MM-dd');
  const formattedEndDate = format(endDate, 'yyyy-MM-dd');

  // Construct the API request URL
  const params = new URLSearchParams({
    series_id: seriesId,
    api_key: apiKey,
    file_type: 'json',
    observation_start: formattedStartDate,
    observation_end: formattedEndDate,
    // Optional: Add frequency or aggregation_method if needed, check FRED API docs
    // frequency: 'm', // e.g., 'd', 'w', 'm', 'q', 'a'
    // aggregation_method: 'avg', // e.g., 'avg', 'sum', 'eop'
  });

  const url = `${FRED_API_URL}?${params.toString()}`;
  console.log(`Fetching FRED: ${seriesId} from ${formattedStartDate} to ${formattedEndDate}`); // Log API call

  try {
    // Make the API request using fetch
    // Using Next.js fetch enhancements for caching/revalidation (adjust as needed)
    const response = await fetch(url, {
      next: { revalidate: 3600 * 6 }, // Revalidate data every 6 hours (example)
      // cache: 'no-store', // Use this to disable caching during development/debugging
    });

    // Check if the request was successful
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`FRED API Error (${response.status}) for ${seriesId}: ${errorText}`);
    }

    // Parse the JSON response
    const data: FredResponse = await response.json();

    // Check if observations exist
    if (!data || !data.observations) {
        console.warn(`No observations found in FRED response for ${seriesId}`);
        return [];
    }

    // Map the observations to the TimeSeriesDataPoint format
    const formattedData = data.observations
      .map((obs: FredObservation): TimeSeriesDataPoint | null => {
        // FRED uses "." for missing data points
        const value = obs.value === '.' ? null : parseFloat(obs.value);

        // Skip points where value is explicitly null or cannot be parsed to a number
        if (value === null || isNaN(value)) {
          return null;
        }

        return {
          date: obs.date, // Already in "YYYY-MM-DD" format
          value: value,
        };
      })
      .filter((point): point is TimeSeriesDataPoint => point !== null); // Filter out the null entries

    console.log(`Fetched ${formattedData.length} valid points from FRED for ${seriesId}`);
    return formattedData;

  } catch (error) {
    console.error(`Error fetching or processing FRED series ${seriesId}:`, error);
    // Return empty array on error to prevent crashes, but log the error
    return [];
  }
}

// --- TODO: Add Fetching Logic for Other APIs ---
// export async function fetchAlphaVantageData(...) { ... }
// export async function fetchWorldBankData(...) { ... }
