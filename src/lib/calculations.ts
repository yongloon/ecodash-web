// src/lib/calculations.ts
import { TimeSeriesDataPoint } from './indicators';
import { parseISO, differenceInMonths, differenceInQuarters, differenceInYears, isValid } from 'date-fns'; // Added isValid

// Import from simple-statistics
import { mean as sMean, median as sMedian, standardDeviation as sStdDev, min as sMin, max as sMax } from 'simple-statistics';

// --- Existing Calculation Functions (YoY, MoM, QoQ) ---
// Ensure they handle null values gracefully or filter them out before calculation.
// For brevity, I'm assuming the existing functions are mostly fine but may need null checks.
export function calculateYoYPercent(
    data: TimeSeriesDataPoint[],
    lookbackPeriods: number = 12
): TimeSeriesDataPoint[] {
    const validData = data.filter(p => p.value !== null && p.date && isValid(parseISO(p.date)));
    if (validData.length < lookbackPeriods + 1) {
        return data.map(p => ({ ...p, value: null }));
    }

    return validData.map((point, index) => {
        if (index < lookbackPeriods) { // No value for points that don't have a year of prior data
            return { ...point, value: null };
        }
        const previousYearPoint = validData[index - lookbackPeriods];
        if (!previousYearPoint.value || previousYearPoint.value === 0) {
            return { ...point, value: null };
        }
        // @ts-ignore: Object is possibly 'null'. This is handled by filter and check above
        const yoyChange = ((point.value - previousYearPoint.value) / Math.abs(previousYearPoint.value)) * 100;
        return {
            ...point,
            value: parseFloat(yoyChange.toFixed(2)),
        };
    }).filter(p => p.value !== null); // Filter out points where calculation wasn't possible after mapping
}

export function calculateMoMPercent(data: TimeSeriesDataPoint[]): TimeSeriesDataPoint[] {
    const validData = data.filter(p => p.value !== null && p.date && isValid(parseISO(p.date)));
    if (validData.length < 2) {
        return data.map(p => ({ ...p, value: null }));
    }
    return validData.map((point, index) => {
        if (index < 1) {
            return { ...point, value: null };
        }
        const previousPoint = validData[index - 1];
        if (!previousPoint.value || previousPoint.value === 0) {
            return { ...point, value: null };
        }
         // @ts-ignore: Object is possibly 'null'.
        const momChange = ((point.value - previousPoint.value) / Math.abs(previousPoint.value)) * 100;
        return {
            ...point,
            value: parseFloat(momChange.toFixed(2)),
        };
    }).slice(1).filter(p => p.value !== null);
}

export function calculateMoMChange(data: TimeSeriesDataPoint[]): TimeSeriesDataPoint[] {
    const validData = data.filter(p => p.value !== null && p.date && isValid(parseISO(p.date)));
    if (validData.length < 2) {
        return data.map(p => ({ ...p, value: null }));
    }
    return validData.map((point, index) => {
        if (index < 1) {
            return { ...point, value: null };
        }
        const previousPoint = validData[index - 1];
        if (previousPoint.value === null) { // Check previous point value specifically
            return { ...point, value: null };
        }
         // @ts-ignore: Object is possibly 'null'.
        const momChange = point.value - previousPoint.value;
        return {
            ...point,
            value: parseFloat(momChange.toFixed(2)),
        };
    }).slice(1).filter(p => p.value !== null);
}

export function calculateQoQPercent(data: TimeSeriesDataPoint[]): TimeSeriesDataPoint[] {
    const validData = data.filter(p => p.value !== null && p.date && isValid(parseISO(p.date)));
    if (validData.length < 2) {
        return data.map(p => ({ ...p, value: null }));
    }
    return validData.map((point, index) => {
        if (index < 1) {
            return { ...point, value: null };
        }
        const previousPoint = validData[index - 1];
        if (!previousPoint.value || previousPoint.value === 0) {
            return { ...point, value: null };
        }
         // @ts-ignore: Object is possibly 'null'.
        const qoqChange = ((point.value - previousPoint.value) / Math.abs(previousPoint.value)) * 100;
        return {
            ...point,
            value: parseFloat(qoqChange.toFixed(2)),
        };
    }).slice(1).filter(p => p.value !== null);
}

// --- NEW Statistical Calculation Function ---
export interface SeriesStatistics {
  mean: number | null;
  median: number | null;
  stdDev: number | null;
  min: number | null;
  max: number | null;
  count: number;
}

export function calculateSeriesStatistics(data: TimeSeriesDataPoint[]): SeriesStatistics {
  const values = data.map(d => d.value).filter(v => v !== null && v !== undefined && !isNaN(v)) as number[];

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