// src/lib/calculations.ts
import { TimeSeriesDataPoint } from './indicators';
import { parseISO, differenceInMonths, differenceInQuarters, differenceInYears } from 'date-fns';

/**
 * Calculates the Year-over-Year (YoY) percentage change for a time series.
 * @param data - Sorted array of TimeSeriesDataPoint (oldest to newest).
 * @param lookbackPeriods - Number of periods in a year (e.g., 12 for monthly, 4 for quarterly).
 * @returns Array of TimeSeriesDataPoint with YoY percentage change, or original value if calculation not possible.
 */
export function calculateYoYPercent(
    data: TimeSeriesDataPoint[],
    lookbackPeriods: number = 12 // Default for monthly data
): TimeSeriesDataPoint[] {
    if (data.length < lookbackPeriods + 1) {
        // Not enough data for YoY calculation, return data as is or empty array for changes
        return data.map(p => ({ ...p, value: null })); // Or return [] if only changes are desired
    }

    return data.map((point, index) => {
        if (index < lookbackPeriods || !point.value) {
            return { ...point, value: null }; // Cannot calculate for earlier points or if current value is null
        }

        const previousYearPoint = data[index - lookbackPeriods];
        if (!previousYearPoint || previousYearPoint.value === null || previousYearPoint.value === 0) {
            return { ...point, value: null }; // Previous year data missing or zero, cannot calculate % change
        }

        // Ensure dates are roughly a year apart (optional, depends on data regularity)
        // const dateCurrent = parseISO(point.date);
        // const datePrevious = parseISO(previousYearPoint.date);
        // if (Math.abs(differenceInYears(dateCurrent, datePrevious)) > 1.1) { // Allow some leeway
        //     return { ...point, value: null };
        // }

        const yoyChange = ((point.value - previousYearPoint.value) / Math.abs(previousYearPoint.value)) * 100;
        return {
            ...point,
            value: parseFloat(yoyChange.toFixed(2)), // Keep two decimal places
        };
    }).slice(lookbackPeriods); // Remove initial points where YoY cannot be calculated
}

/**
 * Calculates the Month-over-Month (MoM) percentage change for a time series.
 * @param data - Sorted array of TimeSeriesDataPoint (oldest to newest).
 * @returns Array of TimeSeriesDataPoint with MoM percentage change.
 */
export function calculateMoMPercent(data: TimeSeriesDataPoint[]): TimeSeriesDataPoint[] {
    if (data.length < 2) {
        return data.map(p => ({ ...p, value: null }));
    }
    return data.map((point, index) => {
        if (index < 1 || !point.value) {
            return { ...point, value: null };
        }
        const previousPoint = data[index - 1];
        if (!previousPoint || previousPoint.value === null || previousPoint.value === 0) {
            return { ...point, value: null };
        }
        const momChange = ((point.value - previousPoint.value) / Math.abs(previousPoint.value)) * 100;
        return {
            ...point,
            value: parseFloat(momChange.toFixed(2)),
        };
    }).slice(1); // Remove first point
}

/**
 * Calculates the Month-over-Month (MoM) absolute change for a time series.
 * @param data - Sorted array of TimeSeriesDataPoint (oldest to newest).
 * @returns Array of TimeSeriesDataPoint with MoM absolute change.
 */
export function calculateMoMChange(data: TimeSeriesDataPoint[]): TimeSeriesDataPoint[] {
    if (data.length < 2) {
        return data.map(p => ({ ...p, value: null }));
    }
    return data.map((point, index) => {
        if (index < 1 || point.value === null) { // Check current point value
            return { ...point, value: null };
        }
        const previousPoint = data[index - 1];
        if (!previousPoint || previousPoint.value === null) { // Check previous point value
            return { ...point, value: null };
        }
        const momChange = point.value - previousPoint.value;
        return {
            ...point,
            value: parseFloat(momChange.toFixed(2)), // Adjust precision as needed
        };
    }).slice(1); // Remove first point
}


/**
 * Calculates the Quarter-over-Quarter (QoQ) percentage change for a time series.
 * Assumes data points are already quarterly.
 * @param data - Sorted array of TimeSeriesDataPoint (oldest to newest).
 * @returns Array of TimeSeriesDataPoint with QoQ percentage change.
 */
export function calculateQoQPercent(data: TimeSeriesDataPoint[]): TimeSeriesDataPoint[] {
    if (data.length < 2) {
        return data.map(p => ({ ...p, value: null }));
    }
    // Similar to MoM, but conceptually for quarterly data
    return data.map((point, index) => {
        if (index < 1 || !point.value) {
            return { ...point, value: null };
        }
        const previousPoint = data[index - 1];
        if (!previousPoint || previousPoint.value === null || previousPoint.value === 0) {
            return { ...point, value: null };
        }
        const qoqChange = ((point.value - previousPoint.value) / Math.abs(previousPoint.value)) * 100;
        return {
            ...point,
            value: parseFloat(qoqChange.toFixed(2)),
        };
    }).slice(1);
}

// Add calculateQoQChange if needed
