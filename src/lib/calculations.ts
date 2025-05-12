// src/lib/calculations.ts
import { TimeSeriesDataPoint } from './indicators';
import { parseISO, isValid } from 'date-fns';
import { mean as sMean, median as sMedian, standardDeviation as sStdDev, min as sMin, max as sMax } from 'simple-statistics';

// Helper to ensure data points are valid for calculations
const getValidPoints = (data: TimeSeriesDataPoint[]): TimeSeriesDataPoint[] => {
  return data.filter(p => p.value !== null && p.value !== undefined && !isNaN(p.value) && p.date && isValid(parseISO(p.date)));
};

export function calculateYoYPercent(
    data: TimeSeriesDataPoint[],
    lookbackPeriods: number = 12
): TimeSeriesDataPoint[] { // ALWAYS RETURN TimeSeriesDataPoint[]
    const validData = getValidPoints(data);
    if (validData.length < lookbackPeriods + 1) {
        return []; // Return EMPTY ARRAY
    }

    const calculated: TimeSeriesDataPoint[] = [];
    for (let i = lookbackPeriods; i < validData.length; i++) {
        const point = validData[i];
        const previousYearPoint = validData[i - lookbackPeriods];
        // Point.value and previousYearPoint.value are guaranteed to be numbers here due to getValidPoints
        if (previousYearPoint.value === 0) { // Avoid division by zero
            continue;
        }
        const yoyChange = (((point.value as number) - (previousYearPoint.value as number)) / Math.abs(previousYearPoint.value as number)) * 100;
        calculated.push({
            ...point,
            value: parseFloat(yoyChange.toFixed(2)),
        });
    }
    return calculated;
}

export function calculateMoMPercent(data: TimeSeriesDataPoint[]): TimeSeriesDataPoint[] { // ALWAYS RETURN TimeSeriesDataPoint[]
    const validData = getValidPoints(data);
    if (validData.length < 2) {
        return []; // Return EMPTY ARRAY
    }
    const calculated: TimeSeriesDataPoint[] = [];
    for (let i = 1; i < validData.length; i++) {
        const point = validData[i];
        const previousPoint = validData[i - 1];
        if (previousPoint.value === 0) { // Avoid division by zero
            continue;
        }
        const momChange = (((point.value as number) - (previousPoint.value as number)) / Math.abs(previousPoint.value as number)) * 100;
        calculated.push({
            ...point,
            value: parseFloat(momChange.toFixed(2)),
        });
    }
    return calculated;
}

export function calculateMoMChange(data: TimeSeriesDataPoint[]): TimeSeriesDataPoint[] { // ALWAYS RETURN TimeSeriesDataPoint[]
    const validData = getValidPoints(data);
    if (validData.length < 2) {
        return []; // Return EMPTY ARRAY
    }
    const calculated: TimeSeriesDataPoint[] = [];
    for (let i = 1; i < validData.length; i++) {
        const point = validData[i];
        const previousPoint = validData[i - 1];
        const momChange = (point.value as number) - (previousPoint.value as number);
        calculated.push({
            ...point,
            value: parseFloat(momChange.toFixed(2)),
        });
    }
    return calculated;
}

export function calculateQoQPercent(data: TimeSeriesDataPoint[]): TimeSeriesDataPoint[] { // ALWAYS RETURN TimeSeriesDataPoint[]
    const validData = getValidPoints(data);
    if (validData.length < 2) { // Assuming quarterly data, so 1 period lookback is sufficient
        return []; // Return EMPTY ARRAY
    }
    const calculated: TimeSeriesDataPoint[] = [];
    for (let i = 1; i < validData.length; i++) {
        const point = validData[i];
        const previousPoint = validData[i-1];
         if (previousPoint.value === 0) { // Avoid division by zero
            continue;
        }
        const qoqChange = (((point.value as number) - (previousPoint.value as number)) / Math.abs(previousPoint.value as number)) * 100;
        calculated.push({ ...point, value: parseFloat(qoqChange.toFixed(2)) });
    }
    return calculated;
}

export function calculateMovingAverage(data: TimeSeriesDataPoint[], windowSize: number): TimeSeriesDataPoint[] { // ALWAYS RETURN TimeSeriesDataPoint[]
  if (windowSize <= 0) {
    console.warn("Moving average windowSize must be greater than 0.");
    return []; // Return EMPTY ARRAY
  }
  const validPointsWithValue = getValidPoints(data);

  if (validPointsWithValue.length < windowSize) {
    return []; // Return EMPTY ARRAY
  }

  const result: TimeSeriesDataPoint[] = [];
  for (let i = 0; i <= validPointsWithValue.length - windowSize; i++) {
    const windowSlice = validPointsWithValue.slice(i, i + windowSize);
    const sum = windowSlice.reduce((acc, p) => acc + (p.value as number), 0);
    result.push({
      date: windowSlice[windowSize - 1].date,
      value: parseFloat((sum / windowSize).toFixed(2)),
    });
  }
  return result;
}

export interface SeriesStatistics {
  mean: number | null;
  median: number | null;
  stdDev: number | null;
  min: number | null;
  max: number | null;
  count: number;
}
export function calculateSeriesStatistics(data: TimeSeriesDataPoint[]): SeriesStatistics { // This one is fine, returns object
  const values = data.map(d => d.value).filter(v => v !== null && v !== undefined && !isNaN(v as number)) as number[];
  if (values.length === 0) {
    return { mean: null, median: null, stdDev: null, min: null, max: null, count: 0 };
  }
  const stdDevValue = values.length >= 2 ? parseFloat(sStdDev(values).toFixed(2)) : null;
  return {
    mean: parseFloat(sMean(values).toFixed(2)),
    median: parseFloat(sMedian(values).toFixed(2)),
    stdDev: stdDevValue,
    min: parseFloat(sMin(values).toFixed(2)),
    max: parseFloat(sMax(values).toFixed(2)),
    count: values.length,
  };
}