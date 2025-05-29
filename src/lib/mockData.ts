// src/lib/mockData.ts
import { TimeSeriesDataPoint, IndicatorMetadata } from './indicators';
import {
    subYears, format, parseISO, isValid,
    eachDayOfInterval, eachMonthOfInterval, eachQuarterOfInterval, startOfMonth,
    differenceInDays,
} from 'date-fns';
import {
    calculateYoYPercent,
    calculateMoMPercent,
    calculateQoQPercent,
    calculateMoMChange
} from './calculations'; 
import {
    fetchFredSeries,
    fetchAlphaVantageData,
    fetchCoinGeckoPriceHistory,
    fetchAlternativeMeFearGreedIndex,
    fetchDbNomicsSeries,
    fetchPolygonIOData,
    fetchApiNinjasMetalPrice,
    fetchApiNinjasCommodityHistoricalPrice,
    fetchTiingoEodData,
    calculateDxyIndex, // ADDED
} from './api'; 

const getDefaultApiFetchRange = (years: number = 2): { startDate: string; endDate: string } => {
    const today = new Date();
    const pastDate = subYears(today, years);
    return {
      startDate: format(pastDate, 'yyyy-MM-dd'),
      endDate: format(today, 'yyyy-MM-dd')
    };
};

function seededPseudoRandom(seedStr: string): () => number {
    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) { seed = (seed * 31 + seedStr.charCodeAt(i)) | 0; }
    return () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
    };
}

export function generateMockData(
    indicator: IndicatorMetadata,
    dateRange?: { startDate?: string; endDate?: string }
): TimeSeriesDataPoint[] {
  const randomFn = seededPseudoRandom(indicator.id + (indicator.apiIdentifier ? (Array.isArray(indicator.apiIdentifier) ? indicator.apiIdentifier.join('') : indicator.apiIdentifier) : '') + (indicator.frequency || ''));
  const apiDefaults = getDefaultApiFetchRange();
  const startDateStr = (dateRange?.startDate && isValid(parseISO(dateRange.startDate))) ? dateRange.startDate : apiDefaults.startDate;
  const endDateStr = (dateRange?.endDate && isValid(parseISO(dateRange.endDate))) ? dateRange.endDate : apiDefaults.endDate;

  let actualStartDate = parseISO(startDateStr);
  let actualEndDate = parseISO(endDateStr);

  if (!isValid(actualStartDate) || !isValid(actualEndDate) || actualStartDate > actualEndDate) {
      // console.warn(`Mock Gen: Invalid or inverted date range for ${indicator.id}: ${startDateStr} to ${endDateStr}. Using defaults.`);
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
            // console.warn(`Mock Gen: Start date ${format(adjustedStartDateForInterval, dateFormat)} is after end date ${format(intervalEnd, dateFormat)} for ${indicator.id}. No dates generated.`);
       } else {
            dates = intervalGenerator({ start: adjustedStartDateForInterval, end: intervalEnd });
            if (indicator.frequency === 'Weekly') dates = dates.filter((_d, i) => i % 7 === 0);
       }
   } catch (e) {
       console.error(`Mock Gen: Error generating dates for ${indicator.id}`, e);
       try { if (actualStartDate <= actualEndDate) dates = eachDayOfInterval({ start: actualStartDate, end: actualEndDate }); } catch (fbE) { return []; }
   }

  if (dates.length === 0) {
    // console.warn(`Mock Gen: No dates generated for ${indicator.id} with range ${startDateStr} to ${endDateStr}. Returning empty array.`);
    return [];
  }

  let baseValue = 100; let volatility = 5;

  if (indicator.id === 'SP500' || indicator.id === 'SPX500_TIINGO') { baseValue = 4500 + randomFn() * 1000; volatility = 40 + randomFn() * 60; }
  else if (indicator.id === 'BTC_PRICE_USD') { baseValue = 35000 + randomFn() * 30000; volatility = 1500 + randomFn() * 1500; }
  else if (indicator.id === 'ETH_PRICE_USD') { baseValue = 2000 + randomFn() * 1500; volatility = 150 + randomFn() * 150; }
  else if (indicator.id === 'GOLD_PRICE') { baseValue = 1900 + randomFn() * 400; volatility = 20 + randomFn() * 20; } 
  else if (indicator.id === 'SILVER_PRICE') { baseValue = 22 + randomFn() * 8; volatility = 0.5 + randomFn() * 1; }
  else if (indicator.id === 'CRYPTO_FEAR_GREED') { baseValue = 50; volatility = 30; }
  else if (indicator.id === 'PMI' || (indicator.apiIdentifier && (Array.isArray(indicator.apiIdentifier) ? indicator.apiIdentifier.some(id => id.includes('PMI')) : indicator.apiIdentifier.includes('PMI'))) || (indicator.apiIdentifier && (Array.isArray(indicator.apiIdentifier) ? indicator.apiIdentifier.some(id => id === 'NAPM') : indicator.apiIdentifier === 'NAPM'))) { 
      baseValue = 45 + randomFn() * 15; 
      volatility = 0.8 + randomFn() * 1.2; 
  }
  else if (indicator.id === 'GDP_PER_CAPITA') { baseValue = 60000 + randomFn() * 10000; volatility = 300 + randomFn() * 200; }
  else if (indicator.id === 'GDP_NOMINAL_PER_CAPITA') { baseValue = 65000 + randomFn() * 15000; volatility = 500 + randomFn() * 300; }
  else if (indicator.id === 'TLT_ETF') { baseValue = 100 + randomFn() * 20; volatility = 0.5 + randomFn() * 1; }
  else if (indicator.id === 'LQD_ETF') { baseValue = 110 + randomFn() * 15; volatility = 0.4 + randomFn() * 0.6; }
  else if (indicator.id === 'VNQ_ETF') { baseValue = 90 + randomFn() * 25; volatility = 1 + randomFn() * 1.5; }
  else if (indicator.id === 'ARKK_ETF') { baseValue = 40 + randomFn() * 30; volatility = 1.5 + randomFn() * 2.5; }
  else if (indicator.id === 'TQQQ_ETF') { baseValue = 45 + randomFn() * 40; volatility = 3 + randomFn() * 4.5; }
  else if (indicator.id === 'NATURAL_GAS') { baseValue = 2.5 + randomFn() * 2; volatility = 0.1 + randomFn() * 0.2; }
  else if (indicator.id === 'DXY_INDEX') { baseValue = 100 + (randomFn() -0.5) * 10; volatility = 0.2 + randomFn() * 0.3; }
  else if (indicator.id === 'NASDAQ_TIINGO') { baseValue = 15000 + randomFn() * 3000; volatility = 150 + randomFn() * 200; }
  else if (indicator.unit?.includes('%')) { baseValue = 2 + (randomFn() - 0.5) * 5; volatility = 0.1 + randomFn() * 0.4; }
  else if (indicator.unit?.includes('Index') && !indicator.id.includes('FEAR_GREED')) { baseValue = 100 + randomFn() * 20; volatility = 0.5 + randomFn() * 1.5; }
  else if (indicator.unit?.includes('Thousands of Persons')) { baseValue = 150000 + randomFn() * 10000; volatility = 100 + randomFn() * 200; }
  else if (indicator.id === 'PAYEMS_MOM_CHG') { baseValue = 150 + (randomFn() -0.5) * 300; volatility = 50 + randomFn() * 100; }
  else if (indicator.unit?.includes('Number') && indicator.id === 'JOBLESSCLAIMS') { baseValue = 200000 + randomFn() * 150000; volatility = 5000 + randomFn() * 10000; }
  else if (indicator.unit?.includes('USD per')) { baseValue = 50 + randomFn() * 50; volatility = 2 + randomFn() * 3; }
  else if (indicator.unit?.includes('per USD')) { baseValue = 0.8 + randomFn() * 0.4; volatility = 0.02 + randomFn() * 0.03; }

  let currentValue = baseValue;
  for (const date of dates) {
    const trendFactor = (indicator.id === 'SP500' || indicator.id === 'SPX500_TIINGO' || indicator.id === 'NASDAQ_TIINGO' || indicator.id.includes('PRICE') || indicator.id.includes('_ETF')) ? 0.0005 : 0.0001;
    const trend = trendFactor * volatility * (randomFn() - 0.3);
    const noise = (randomFn() - 0.5) * volatility;
    currentValue += trend + noise;

    if (indicator.id === 'PMI' || indicator.id === 'PMI_SERVICES' || (indicator.apiIdentifier && (Array.isArray(indicator.apiIdentifier) ? indicator.apiIdentifier.some(id => id.includes('PMI')) : indicator.apiIdentifier.includes('PMI'))) || (indicator.apiIdentifier && (Array.isArray(indicator.apiIdentifier) ? indicator.apiIdentifier.some(id => id === 'NAPM') : indicator.apiIdentifier === 'NAPM'))) { currentValue = Math.max(30, Math.min(70, currentValue)); }
    else if (indicator.id === 'UNRATE' || indicator.id === 'U6RATE') { currentValue = Math.max(2, Math.min(12, currentValue)); }
    else if (indicator.id === 'CRYPTO_FEAR_GREED') { currentValue = Math.max(0, Math.min(100, Math.round(currentValue))); }
    else if (indicator.id === 'CAPUTIL') { currentValue = Math.max(65, Math.min(85, currentValue)); }
    else if (indicator.id === 'UMCSENT' || indicator.id === 'CCI') { currentValue = Math.max(50, Math.min(130, currentValue)); }
    else if (indicator.id === 'NATURAL_GAS') { currentValue = Math.max(1, Math.min(10, currentValue)); }
    else if (indicator.id === 'DXY_INDEX') { currentValue = Math.max(80, Math.min(120, currentValue)); }
    else if (!indicator.unit?.includes('%') && !indicator.id.includes('BALANCE') && !indicator.id.includes('SPREAD') && currentValue < 0 && !indicator.id.includes('_CHG') && !indicator.id.includes('_PCT')) {
        currentValue = Math.max(currentValue, 0.01);
    }

    const value = randomFn() > 0.015 ? parseFloat(currentValue.toFixed(indicator.unit === '%' || indicator.unit?.includes('Index') || indicator.id === 'DXY_INDEX' ? 2 : 4)) : null;
    data.push({ date: format(date, dateFormat), value: value });
  }

   if (data.length > 0 && data[data.length - 1].value === null) {
       const lastValidValue = data.slice(0, -1).reverse().find(d => d.value !== null)?.value;
       data[data.length - 1].value = lastValidValue ?? parseFloat((baseValue + (randomFn() - 0.5) * volatility).toFixed(indicator.id === 'DXY_INDEX' ? 4 : 2));
   }
  return data;
}


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
    
    let rawFetchedData: TimeSeriesDataPoint[] = [];
    let effectiveDateRangeForApiCall = { ...actualDateRangeToUse };

    if (indicator.calculation === 'YOY_PERCENT' && effectiveDateRangeForApiCall.startDate && indicator.apiSource !== 'ApiNinjas' && indicator.apiSource !== 'ApiNinjasHistorical') {
        try {
          const originalStartDate = parseISO(effectiveDateRangeForApiCall.startDate);
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
        // console.log(`[Orchestrator] Explicitly using mock data for ${indicator.id}.`);
    } else if (indicator.id === 'GDP_NOMINAL_PER_CAPITA' && indicator.apiSource === 'FRED') {
        apiFetchAttempted = true;
        // console.log(`[Orchestrator] Fetching components for GDP_NOMINAL_PER_CAPITA`);
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
                // console.log(`[Orchestrator] Calculated ${rawFetchedData.length} points for GDP_NOMINAL_PER_CAPITA`);
            } else {
                console.warn(`[Orchestrator] Insufficient data for GDP_NOMINAL_PER_CAPITA components. GDP points: ${nominalGdpData.length}, Pop points: ${populationDataFred.length}`);
                rawFetchedData = [];
            }
        } catch (error: any) {
            apiErrorOccurred = true;
            console.error(`[Orchestrator] Error fetching components for GDP_NOMINAL_PER_CAPITA:`, error);
            rawFetchedData = [];
            throw new Error(`Failed to calculate ${indicator.name}. Reason: ${error.message}`);
        }
    } else if (indicator.calculation === 'DXY_CALCULATION' && indicator.apiSource === 'AlphaVantage' && Array.isArray(indicator.apiIdentifier)) {
        apiFetchAttempted = true;
        try {
            rawFetchedData = await calculateDxyIndex(indicator.apiIdentifier, effectiveDateRangeForApiCall); 
            // console.log(`[Orchestrator] Calculated ${rawFetchedData.length} points for DXY_INDEX`);
        } catch (error: any) {
            apiErrorOccurred = true;
            console.error(`[Orchestrator] Error calculating DXY_INDEX:`, error);
            rawFetchedData = [];
            throw new Error(`Failed to calculate ${indicator.name}. Reason: ${error.message}`);
        }
    } else {
        try {
          switch (indicator.apiSource) {
            case 'FRED':
              if (indicator.apiIdentifier && typeof indicator.apiIdentifier === 'string') { rawFetchedData = await fetchFredSeries(indicator.apiIdentifier, effectiveDateRangeForApiCall); apiFetchAttempted = true; }
              break;
            case 'AlphaVantage':
              if (indicator.apiIdentifier && typeof indicator.apiIdentifier === 'string') {
                  rawFetchedData = await fetchAlphaVantageData(indicator.apiIdentifier, effectiveDateRangeForApiCall); 
                  apiFetchAttempted = true; 
              }
              break;
            case 'DBNOMICS':
              if (indicator.apiIdentifier && typeof indicator.apiIdentifier === 'string') { rawFetchedData = await fetchDbNomicsSeries(indicator.apiIdentifier, effectiveDateRangeForApiCall); apiFetchAttempted = true; }
              break;
            case 'PolygonIO':
              if (indicator.apiIdentifier && typeof indicator.apiIdentifier === 'string') { rawFetchedData = await fetchPolygonIOData(indicator.apiIdentifier, effectiveDateRangeForApiCall); apiFetchAttempted = true; }
              break;
            case 'ApiNinjas':
              if (indicator.apiIdentifier && typeof indicator.apiIdentifier === 'string') {
                rawFetchedData = await fetchApiNinjasMetalPrice(indicator.apiIdentifier);
                apiFetchAttempted = true;
              }
              break;
            case 'ApiNinjasHistorical':
                if (indicator.apiIdentifier && typeof indicator.apiIdentifier === 'string') {
                  rawFetchedData = await fetchApiNinjasCommodityHistoricalPrice(indicator.apiIdentifier, effectiveDateRangeForApiCall, '1d');
                  if(rawFetchedData.length === 0 && indicator.apiSource === 'ApiNinjasHistorical'){
                    // console.warn(`[Orchestrator] ApiNinjasHistorical returned 0 points for ${indicator.id}`);
                  }
                  apiFetchAttempted = true;
                }
                break;
            case 'CoinGeckoAPI':
              if (indicator.apiIdentifier && typeof indicator.apiIdentifier === 'string') { rawFetchedData = await fetchCoinGeckoPriceHistory(indicator.apiIdentifier, effectiveDateRangeForApiCall); apiFetchAttempted = true; }
              break;
            case 'AlternativeMeAPI':
              rawFetchedData = await fetchAlternativeMeFearGreedIndex(effectiveDateRangeForApiCall); apiFetchAttempted = true;
              break;
            case 'Tiingo':
              if (indicator.apiIdentifier && typeof indicator.apiIdentifier === 'string') {
                rawFetchedData = await fetchTiingoEodData(indicator.apiIdentifier, effectiveDateRangeForApiCall);
                apiFetchAttempted = true;
              }
              break;
            default:
              if (indicator.apiIdentifier && typeof indicator.apiIdentifier === 'string' && ((indicator.apiSource as string).toUpperCase().includes('FRED') || !indicator.apiSource)) {
                   rawFetchedData = await fetchFredSeries(indicator.apiIdentifier, effectiveDateRangeForApiCall); apiFetchAttempted = true;
              } else {
                  console.warn(`[Orchestrator] No specific fetch logic for ${indicator.id} (Source: ${indicator.apiSource}). Will attempt mock.`);
              }
              break;
          }
        } catch (error: any) { 
            apiErrorOccurred = true; 
            console.error(`[Orchestrator] API call error during switch for ${indicator.id} (Source: ${indicator.apiSource}):`, error); 
            throw new Error(`Failed to fetch data for ${indicator.name} from ${indicator.sourceName}. Reason: ${error.message}`);
        }
    }

    let shouldUseFullMock = false;
    if (indicator.apiSource === 'Mock') {
        shouldUseFullMock = false; 
    } else if (apiFetchAttempted && (rawFetchedData.length === 0 || apiErrorOccurred)) {
        shouldUseFullMock = true; 
    } else if (!apiFetchAttempted && indicator.apiSource !== 'Mock') {
        console.warn(`[Orchestrator] API fetch not attempted for ${indicator.id} and not Mock. Falling back to mock.`);
        shouldUseFullMock = true;
    }

    if (shouldUseFullMock) {
      if (indicator.apiSource !== 'Mock') console.warn(`[Orchestrator] Full fallback to mock data for ${indicator.id} (Source: ${indicator.apiSource}).`);
      rawFetchedData = generateMockData(indicator, actualDateRangeToUse);
    }

    let processedData: TimeSeriesDataPoint[] = [...rawFetchedData];

    if (indicator.calculation && indicator.calculation !== 'NONE' && indicator.calculation !== 'DXY_CALCULATION' && processedData.length > 0) {
        if (processedData.length <= 1 && 
            (indicator.calculation === 'YOY_PERCENT' || 
             indicator.calculation === 'MOM_PERCENT' || 
             indicator.calculation === 'QOQ_PERCENT' || 
             indicator.calculation === 'MOM_CHANGE')) {
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
                else if (indicator.frequency === 'Daily') lookback = 252; 
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
            if (calcSuccess && processedData.length === 0 && rawFetchedData.length > 1) {
                // console.warn(`[Orchestrator] Calculation for ${indicator.id} (${indicator.calculation}) resulted in 0 points from ${rawFetchedData.length} raw points.`);
            }
        }
    }

    // Final filter based on the originally requested page date range
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
    return processedData;
}