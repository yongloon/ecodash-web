// src/components/dashboard/ChartComponent.tsx
'use client'; // Recharts components are client-side

import React from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { TimeSeriesDataPoint } from '@/lib/indicators';
import { format, parseISO, differenceInDays, differenceInMonths } from 'date-fns';

interface ChartComponentProps {
  data: TimeSeriesDataPoint[];
  dataKey: string; // Key in the data objects for the value (e.g., "value")
  type?: 'line' | 'bar' | 'area'; // Add 'area' type
}

// Wrapper component for Recharts Line, Bar or Area chart
export default function ChartComponent({ data, dataKey, type = 'line' }: ChartComponentProps) {

  // Filter out null/invalid data points for cleaner charts
  const validData = data.filter(d => d.value !== null && d.value !== undefined && d.date);

  // Determine date range for smart tick formatting
  const dateRangeDays = validData.length > 1
    ? differenceInDays(parseISO(validData[validData.length - 1].date), parseISO(validData[0].date))
    : 0;
   const dateRangeMonths = validData.length > 1
    ? differenceInMonths(parseISO(validData[validData.length - 1].date), parseISO(validData[0].date))
    : 0;

  // Format date for XAxis tick display based on range
  const formatDateTick = (tickItem: string) => {
    try {
        const date = parseISO(tickItem);
        if (dateRangeDays <= 90) return format(date, 'MMM d'); // Show day for short ranges
        if (dateRangeMonths <= 24) return format(date, 'MMM yy'); // Show month/year for medium ranges
        return format(date, 'yyyy'); // Show only year for long ranges
    } catch (e) {
        return tickItem; // Fallback if parsing fails
    }
  };

   // Custom Tooltip Content
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length && label) {
      let dateFormatted = label;
      try {
        dateFormatted = format(parseISO(label), 'MMM d, yyyy'); // Full date in tooltip
      } catch (e) { /* ignore parsing error */ }

      const valueFormatted = payload[0].value?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? 'N/A'; // Format number

      return (
        <div className="bg-popover text-popover-foreground p-2 border border-border rounded shadow-lg text-xs">
          <p className="font-semibold">{dateFormatted}</p>
          <p className="text-indigo-600 dark:text-indigo-400">{`Value: ${valueFormatted}`}</p>
        </div>
      );
    }
    return null;
  };

  if (!validData || validData.length === 0) {
    return <div className="flex items-center justify-center h-full text-muted-foreground">No data available</div>;
  }

  // Choose chart component and element based on type
  let ChartComponent: any = LineChart; // Default to LineChart
  let ChartElement: any = Line;
  let additionalProps = {};

  if (type === 'bar') {
    ChartComponent = BarChart;
    ChartElement = Bar;
  } else if (type === 'area') {
     ChartComponent = AreaChart;
     ChartElement = Area;
     // Define gradient for Area chart
     additionalProps = {
        defs: (
            <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
            </defs>
        ),
        fill: "url(#colorValue)", // Apply gradient fill
     };
  }


  return (
    <ResponsiveContainer width="100%" height="100%">
      <ChartComponent
        data={validData}
        margin={{
          top: 5, right: 5, left: -25, bottom: 0, // Adjust margins carefully
        }}
      >
        {additionalProps.defs} {/* Add defs if they exist (for Area chart) */}
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDateTick}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          stroke="hsl(var(--border))"
          dy={5} // Offset tick down slightly
          tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          // Add interval="preserveStartEnd" or a number to skip ticks on dense charts
          interval={validData.length > 50 ? Math.floor(validData.length / 10) : 0} // Example interval logic
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          stroke="hsl(var(--border))"
          tickFormatter={(value) => typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : value} // Format Y-axis numbers
          dx={-5} // Offset tick left slightly
          tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          domain={['auto', 'auto']} // Let recharts handle domain usually
          // width={40} // Explicitly set width if labels overlap
        />
        <RechartsTooltip
            content={<CustomTooltip />}
            cursor={{ stroke: 'hsl(var(--foreground))', strokeWidth: 1, strokeDasharray: '3 3' }}
            wrapperStyle={{ zIndex: 10 }} // Ensure tooltip is above other elements
        />
        {/* <Legend /> // Optional: Add legend if multiple lines/bars */}
        <ChartElement
          type="monotone" // Smooth line/area
          dataKey={dataKey}
          stroke="#4f46e5" // Indigo-600 (Line/Area stroke)
          fill={type === 'bar' ? "#4f46e5" : (type === 'area' ? "url(#colorValue)" : "none")} // Fill for Bar/Area
          strokeWidth={2}
          dot={type === 'line' && validData.length < 100 ? { r: 2, strokeWidth: 1, fill: "#4f46e5" } : false} // Show dots only on line charts with fewer points
          activeDot={type === 'line' ? { r: 4, strokeWidth: 1, fill: "#4f46e5", stroke: 'hsl(var(--background))' } : undefined} // Style for dot on hover
        />
      </ChartComponent>
    </ResponsiveContainer>
  );
}
