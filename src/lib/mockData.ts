// src/lib/mockData.ts
import { TimeSeriesDataPoint, IndicatorMetadata } from './indicators';
import {
    subYears, format, parseISO, isValid,
    eachDayOfInterval, eachMonthOfInterval, eachQuarterOfInterval, startOfMonth,
    // Add any other date-fns functions you might need if expanding logic
    differenceInDays, 
} from 'date-fns';
import {
    fetchFredSeries,
    fetchAlphaVantageData,
    fetchCoinGeckoPriceHistory,
    fetchAlternativeMeFearGreedIndex,
    fetchDbNomicsSeries,
    fetchPolygonIOData,
    fetchApiNinjasMetalPrice,
    fetchApiNinjasCommodityHistoricalPrice,
} from './api'; // Ensure this path is correct
import {
    calculateYoYPercent,
    calculateMoMPercent,
    calculateQoQPercent,
    calculateMoMChange
    // Add other calculation imports if needed
} from './calculations'; // Ensure this path is correct

// --- Helper for Default API Fetch Date Range (Consistent) ---
const getDefaultApiFetchRange = (years: number = 2): { startDate: string; endDate: string } => { // Defaulted to 2 years for broader initial mock/fetch
    const today = new Date();
    const pastDate = subYears(today, years);
    return {
      startDate: format(pastDate, 'yyyy-MM-dd'),
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
  const randomFn = seededPseudoRandom(indicator.id + (indicator.apiIdentifier || '') + (indicator.frequency || ''));
  const apiDefaults = getDefaultApiFetchRange(); // Use the same default range
  const startDateStr = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate;
  const endDateStr = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;

  let actualStartDate = parseISO(startDateStr);
  let actualEndDate = parseISO(endDateStr);

  if (!isValid(actualStartDate) || !isValid(actualEndDate) || actualStartDate > actualEndDate) {
      console.warn(`Mock Gen: Invalid or inverted date range for ${indicator.id}: ${startDateStr} to ${endDateStr}. Using defaults.`);
      actualStartDate = parseISO(apiDefaults.startDate);
      actualEndDate = parseISO(apiDefaults.endDate);
  }

  const data: TimeSeriesDataPoint[] = [];
  let intervalGenerator: (interval: Interval) => Date[];
  const dateFormat = "yyyy-MM-dd";

  switch (indicator.frequency) {
    case 'Quarterly': intervalGenerator = eachQuarterOfInterval; break;
    case 'Monthly': intervalGenerator = eachMonthOfInterval; break;
    case 'Weekly': intervalGenerator = eachDayOfInterval; break; // Will filter later
    case 'Daily': default: intervalGenerator = eachDayOfInterval; break;
  }

  let adjustedStartDateForInterval = new Date(actualStartDate);
  if (indicator.frequency === 'Monthly' || indicator.frequency === 'Quarterly') {
    adjustedStartDateForInterval = startOfMonth(actualStartDate); // Ensure consistent start for month/quarter based intervals
  }

  let dates: Date[] = [];
   try {
       const intervalEnd = actualEndDate >= adjustedStartDateForInterval ? actualEndDate : adjustedStartDateForInterval;
       if (adjustedStartDateForInterval > intervalEnd) {
           // console.warn(`Mock Gen: Start date ${format(adjustedStartDateForInterval, dateFormat)} is after end date ${format(intervalEnd, dateFormat)} for ${indicator.id}. No dates generated.`);
       } else {
            dates = intervalGenerator({ start: adjustedStartDateForInterval, end: intervalEnd });
            if (indicator.frequency === 'Weekly') dates = dates.filter((_d, i) => i % 7 === 0);
       }
   } catch (e) {
       console.error(`Mock Gen: Error generating dates for ${indicator.id}`, e);
       // Fallback to daily if interval generator fails for some reason with the provided dates
       try { if (actualStartDate <= actualEndDate) dates = eachDayOfInterval({ start: actualStartDate, end: actualEndDate }); } catch (fbE) { return []; }
   }

  if (dates.length === 0) {
    console.warn(`Mock Gen: No dates generated for ${indicator.id} with range ${startDateStr} to ${endDateStr}. Returning empty array.`);
    return [];
  }

  let baseValue = 100; let volatility = 5;

  // Adjusted base values and volatilities for more realism per indicator
  if (indicator.id === 'SP500') { baseValue = 4000 + randomFn() * 1500; volatility = 50 + randomFn() * 70; }
  else if (indicator.id === 'BTC_PRICE_USD') { baseValue = 35000 + randomFn() * 30000; volatility = 1500 + randomFn() * 1500; }
  else if (indicator.id === 'ETH_PRICE_USD') { baseValue = 2000 + randomFn() * 1500; volatility = 150 + randomFn() * 150; }
  else if (indicator.id === 'GOLD_PRICE' || indicator.id === 'GOLD_PRICE_HISTORICAL') { baseValue = 1800 + randomFn() * 400; volatility = 15 + randomFn() * 15; }
  else if (indicator.id === 'PLATINUM_PRICE' || indicator.id === 'PLATINUM_PRICE_HISTORICAL') { baseValue = 900 + randomFn() * 200; volatility = 10 + randomFn() * 10; }
  else if (indicator.id === 'CRYPTO_FEAR_GREED') { baseValue = 50; volatility = 30; }
  else if (indicator.id === 'PMI' || indicator.apiIdentifier === 'PMI_MANUFACTURING_INVESTING_MOCK') { baseValue = 45 + randomFn() * 15; volatility = 0.8 + randomFn() * 1.2; }
  else if (indicator.id === 'PMI_SERVICES' || indicator.apiIdentifier === 'PMI_SERVICES_INVESTING_MOCK') { baseValue = 48 + randomFn() * 15; volatility = 0.8 + randomFn() * 1.2; }
  else if (indicator.id === 'GDP_REAL') { baseValue = 20000 + randomFn() * 3000; volatility = 50 + randomFn() * 50; } // Billions
  else if (indicator.id === 'GDP_NOMINAL') { baseValue = 23000 + randomFn() * 4000; volatility = 100 + randomFn() * 100; } // Billions
  else if (indicator.id === 'GDP_PER_CAPITA') { baseValue = 60000 + randomFn() * 10000; volatility = 300 + randomFn() * 200; } // Dollars
  else if (indicator.id === 'GDP_NOMINAL_PER_CAPITA') { baseValue = 65000 + randomFn() * 15000; volatility = 500 + randomFn() * 300; } // Dollars
  else if (indicator.id === 'TLT_ETF') { baseValue = 100 + randomFn() * 20; volatility = 0.5 + randomFn() * 1; }
  else if (indicator.id === 'TQQQ_ETF') { baseValue = 50 + randomFn() * 30; volatility = 2 + randomFn() * 3; } // Highly volatile
  else if (indicator.unit?.includes('%')) { baseValue = 2 + (randomFn() - 0.5) * 5; volatility = 0.1 + randomFn() * 0.4; }
  else if (indicator.unit?.includes('Index') && !indicator.id.includes('FEAR_GREED')) { baseValue = 100 + randomFn() * 20; volatility = 0.5 + randomFn() * 1.5; }
  else if (indicator.unit?.includes('Thousands of Persons')) { baseValue = 150000 + randomFn() * 10000; volatility = 100 + randomFn() * 200; } // Example for PAYEMS levels
  else if (indicator.id === 'PAYEMS_MOM_CHG') { baseValue = 150 + (randomFn() -0.5) * 300; volatility = 50 + randomFn() * 100; } // For MoM change
  else if (indicator.unit?.includes('Number') && indicator.id === 'JOBLESSCLAIMS') { baseValue = 200000 + randomFn() * 150000; volatility = 5000 + randomFn() * 10000; }

  let currentValue = baseValue;
  for (const date of dates) {
    const trendFactor = (indicator.id === 'SP500' || indicator.id.includes('PRICE')) ? 0.0005 : 0.0001;
    const trend = trendFactor * volatility * (randomFn() - 0.3); // Slight upward bias for some assets
    const noise = (randomFn() - 0.5) * volatility;
    currentValue += trend + noise;

    // Apply constraints
    if (indicator.id === 'PMI' || indicator.id === 'PMI_SERVICES' || indicator.apiIdentifier?.includes('PMI')) { currentValue = Math.max(30, Math.min(70, currentValue)); }
    else if (indicator.id === 'UNRATE' || indicator.id === 'U6RATE') { currentValue = Math.max(2, Math.min(12, currentValue)); }
    else if (indicator.id === 'CRYPTO_FEAR_GREED') { currentValue = Math.max(0, Math.min(100, Math.round(currentValue))); }
    else if (indicator.id === 'CAPUTIL') { currentValue = Math.max(65, Math.min(85, currentValue)); }
    else if (indicator.id === 'UMCSENT' || indicator.id === 'CCI') { currentValue = Math.max(50, Math.min(130, currentValue)); }
    else if (!indicator.unit?.includes('%') && !indicator.id.includes('BALANCE') && !indicator.id.includes('SPREAD') && currentValue < 0 && !indicator.id.includes('_CHG') && !indicator.id.includes('_PCT')) {
        currentValue = Math.max(currentValue, 0.01); // Prevent most levels from going negative unless they are changes/spreads
    }

    const value = randomFn() > 0.015 ? parseFloat(currentValue.toFixed(indicator.unit === '%' || indicator.unit?.includes('Index') ? 1 : 2)) : null; // More decimals for %/Index
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
    // console.log(`[fetchIndicatorData Orchestrator] ID: ${indicator.id}, Source: ${indicator.apiSource}, UI Range: ${actualDateRangeToUse.startDate} to ${actualDateRangeToUse.endDate}`);
    
    let rawFetchedData: TimeSeriesDataPoint[] = [];
    let effectiveDateRangeForApiCall = { ...actualDateRangeToUse };

    // Adjust start date for YoY calculations to fetch enough historical data
    if (indicator.calculation === 'YOY_PERCENT' && effectiveDateRangeForApiCall.startDate && indicator.apiSource !== 'ApiNinjas' && indicator.apiSource !== 'ApiNinjasHistorical') { // ApiNinjas uses its own range logic
        try {
          const originalStartDate = parseISO(effectiveDateRangeForApiCall.startDate);
          // Fetch an extra year of data for YoY
          effectiveDateRangeForApiCall.startDate = format(subYears(originalStartDate, 1), 'yyyy-MM-dd');
        } catch (e) { 
            console.warn(`[Orchestrator] Could not adjust date range for YoY calc on ${indicator.id}. Using original range. Error:`, e);
            effectiveDateRangeForApiCall = { ...actualDateRangeToUse }; 
        }
    }

    let apiFetchAttempted = false; 
    let apiErrorOccurred = false;

    if (indicator.apiSource === 'Mock') {
        rawFetchedData = generateMockData(indicator, actualDateRangeToUse);
        apiFetchAttempted = true;
        console.log(`[Orchestrator] Explicitly using mock data for ${indicator.id}.`);
    } else if (indicator.id === 'GDP_NOMINAL_PER_CAPITA' && indicator.apiSource === 'FRED') {
        apiFetchAttempted = true;
        console.log(`[Orchestrator] Fetching components for GDP_NOMINAL_PER_CAPITA`);
        try {
            const nominalGdpData = await fetchFredSeries('GDP', effectiveDateRangeForApiCall);
            const populationDataFred = await fetchFredSeries('POP', effectiveDateRangeForApiCall);

            if (nominalGdpData.length > 0 && populationDataFred.length > 0) {
                const popMap = new Map(populationDataFred.map(p => [p.date, p.value]));
                rawFetchedData = nominalGdpData.map(gdpPoint => {
                    let popValue = popMap.get(gdpPoint.date);
                    if ((popValue === undefined || popValue === null) && populationDataFred.length > 0) {
                        let closestPopDateDiff = Infinity;
                        let chosenPopPointValue: number | null = null;
                        for (const popPoint of populationDataFred) {
                            if (popPoint.value === null) continue;
                            const diff = Math.abs(new Date(gdpPoint.date).getTime() - new Date(popPoint.date).getTime());
                            if (diff < closestPopDateDiff) {
                                closestPopDateDiff = diff;
                                chosenPopPointValue = popPoint.value;
                            }
                            // Heuristic: if we are within ~45 days for quarterly GDP vs annual POP, it's close enough
                            if (indicator.frequency === 'Quarterly' && closestPopDateDiff < 45 * 24 * 60 * 60 * 1000) break;
                        }
                        popValue = chosenPopPointValue;
                    }

                    if (gdpPoint.value !== null && popValue !== null && popValue !== 0) {
                        return {
                            date: gdpPoint.date,
                            value: parseFloat(((gdpPoint.value * 1000000) / popValue).toFixed(2))
                        };
                    }
                    return null;
                }).filter(p => p !== null) as TimeSeriesDataPoint[];
                console.log(`[Orchestrator] Calculated ${rawFetchedData.length} points for GDP_NOMINAL_PER_CAPITA`);
            } else {
                console.warn(`[Orchestrator] Insufficient data for GDP_NOMINAL_PER_CAPITA components. GDP points: ${nominalGdpData.length}, Pop points: ${populationDataFred.length}`);
                rawFetchedData = [];
            }
        } catch (error) {
            apiErrorOccurred = true;
            console.error(`[Orchestrator] Error fetching components for GDP_NOMINAL_PER_CAPITA:`, error);
            rawFetchedData = [];
        }
    } else {
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
            case 'ApiNinjas': // Fetches latest price point
              if (indicator.apiIdentifier) {
                rawFetchedData = await fetchApiNinjasMetalPrice(indicator.apiIdentifier);
                apiFetchAttempted = true;
              }
              break;
            case 'ApiNinjasHistorical': // Fetches historical data
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
            default:
              if (indicator.apiIdentifier && ((indicator.apiSource as string).toUpperCase().includes('FRED') || !indicator.apiSource)) {
                   rawFetchedData = await fetchFredSeries(indicator.apiIdentifier, effectiveDateRangeForApiCall); apiFetchAttempted = true;
              } else {
                  // console.warn(`[Orchestrator] No specific fetch logic for ${indicator.id} (Source: ${indicator.apiSource}). Will attempt mock.`);
              }
              break;
          }
        } catch (error) { apiErrorOccurred = true; console.error(`[Orchestrator] API call error during switch for ${indicator.id}:`, error); }
    }

    let shouldUseFullMock = false;
    if (indicator.apiSource === 'Mock') { // Already handled above
        shouldUseFullMock = rawFetchedData.length === 0;
    } else if (apiFetchAttempted && (rawFetchedData.length === 0 || apiErrorOccurred)) {
        shouldUseFullMock = true; // Fallback if API attempt failed or returned nothing
    } else if (!apiFetchAttempted && indicator.apiSource !== 'Mock') { // Should not happen if all sources covered
        console.warn(`[Orchestrator] API fetch not attempted for ${indicator.id} and not Mock. Falling back to mock.`);
        shouldUseFullMock = true;
    }


    if (shouldUseFullMock) {
      if (indicator.apiSource !== 'Mock') console.warn(`[Orchestrator] Full fallback to mock data for ${indicator.id} (Source: ${indicator.apiSource}).`);
      rawFetchedData = generateMockData(indicator, actualDateRangeToUse);
    }

    let processedData: TimeSeriesDataPoint[] = [...rawFetchedData];

    if (indicator.calculation && indicator.calculation !== 'NONE' && processedData.length > 0) {
        if (processedData.length <= 1 && 
            (indicator.calculation === 'YOY_PERCENT' || 
             indicator.calculation === 'MOM_PERCENT' || 
             indicator.calculation === 'QOQ_PERCENT' || 
             indicator.calculation === 'MOM_CHANGE')) {
            // console.log(`[Orchestrator] Skipping calculation for ${indicator.id} due to insufficient data points (${processedData.length}). Outputting raw.`);
            // For % change calculations, if not enough data, it's better to return empty than raw level data.
            if (indicator.unit.includes('%') || indicator.calculation.includes('PERCENT') || indicator.calculation.includes('CHANGE')) {
                processedData = [];
            }
        } else {
            let calcSuccess = true;
            let tempCalc: TimeSeriesDataPoint[] = [];
            switch (indicator.calculation) {
              case 'YOY_PERCENT':
                let lookback = 12;
                if (indicator.frequency === 'Quarterly') lookback = 4;
                else if (indicator.frequency === 'Weekly') lookback = 52;
                else if (indicator.frequency === 'Daily') lookback = 365; // This might be too sparse for FRED daily series if not all days present
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
                calcSuccess = false; // Should not happen if calculation is not 'NONE'
                tempCalc = processedData; // Fallback to raw if calculation type unknown
                break;
            }
            processedData = tempCalc;
            if (calcSuccess && processedData.length === 0 && rawFetchedData.length > 1) {
                // console.warn(`[Orchestrator] Calculation for ${indicator.id} (${indicator.calculation}) resulted in 0 points from ${rawFetchedData.length} raw points. This might be due to lookback period vs data length.`);
            }
            // if (calcSuccess) console.log(`[Orchestrator] ${indicator.id} after ${indicator.calculation}: ${processedData.length} points`);
        }
    }

    // Final date filtering based on the originally requested UI range
    // This is important because YoY calc might have fetched earlier data
    if (actualDateRangeToUse.startDate && isValid(parseISO(actualDateRangeToUse.startDate)) && processedData.length > 0) {
        processedData = processedData.filter(dp => {
            if (!dp.date || !isValid(parseISO(dp.date))) return false;
            return parseISO(dp.date) >= parseISO(actualDateRangeToUse.startDate);
        });
    }
    if (actualDateRangeToUse.endDate && isValid(parseISO(actualDateRangeToUse.endDate)) && processedData.length > 0) {
        processedData = processedData.filter(dp => {
            if (!dp.date || !isValid(parseISO(dp.date))) return false;
            return parseISO(dp.date) <= parseISO(actualDateRangeToUse.endDate);
        });
    }
    // console.log(`[Orchestrator] Final data count for ${indicator.id}: ${processedData.length}`);
    return processedData;
}