// src/components/dashboard/ChartComponent.tsx
'use client';

import React from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { TimeSeriesDataPoint } from '@/lib/indicators';
import { format, parseISO, differenceInDays, differenceInMonths, isValid } from 'date-fns'; // Added isValid

interface ChartComponentProps {
  data: TimeSeriesDataPoint[];
  dataKey: string;
  type?: 'line' | 'bar' | 'area';
}

export default function ChartComponent({ data, dataKey, type = 'line' }: ChartComponentProps) {
  const validData = data.filter(d => d.value !== null && d.value !== undefined && d.date && isValid(parseISO(d.date)));

  const dateRangeDays = validData.length > 1
    ? differenceInDays(parseISO(validData[validData.length - 1].date), parseISO(validData[0].date))
    : 0;
  const dateRangeMonths = validData.length > 1
    ? differenceInMonths(parseISO(validData[validData.length - 1].date), parseISO(validData[0].date))
    : 0;

  const formatDateTick = (tickItem: string) => {
    try {
        const date = parseISO(tickItem);
        if (!isValid(date)) return tickItem; // Handle invalid dates
        if (dateRangeDays <= 90) return format(date, 'MMM d');
        if (dateRangeMonths <= 24) return format(date, 'MMM yy');
        return format(date, 'yyyy');
    } catch (e) {
        return tickItem;
    }
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length && label) {
      let dateFormatted = label;
      try {
        const parsedLabel = parseISO(label);
        if (isValid(parsedLabel)) {
            dateFormatted = format(parsedLabel, 'MMM d, yyyy');
        }
      } catch (e) { /* ignore parsing error */ }

      const valueFormatted = payload[0].value?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? 'N/A';

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
    return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4 text-center"> {/* MODIFIED */}
          <p>No data available for the selected period or indicator.</p> {/* MODIFIED */}
        </div>
      );
  }

  let ChartComponentType: any = LineChart;
  let ChartElement: any = Line;
  let additionalProps: any = {}; // Use any for additionalProps for flexibility

  if (type === 'bar') {
    ChartComponentType = BarChart;
    ChartElement = Bar;
  } else if (type === 'area') {
     ChartComponentType = AreaChart;
     ChartElement = Area;
     additionalProps = {
        defs: (
            <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                </linearGradient>
            </defs>
        ),
     };
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ChartComponentType
        data={validData}
        margin={{
          top: 5, right: 10, left: -20, bottom: 5, // Adjusted margins
        }}
      >
        {additionalProps.defs}
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDateTick}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          stroke="hsl(var(--border))"
          dy={5}
          tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          interval={validData.length > 50 ? Math.floor(validData.length / 8) : (validData.length > 20 ? Math.floor(validData.length / 5) : 0) } // Dynamic interval
          padding={{ left: 10, right: 10 }} // Add padding to XAxis
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          stroke="hsl(var(--border))"
          tickFormatter={(value) => typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 1, notation: 'compact' }) : value} // Compact notation for large numbers
          dx={-5}
          tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          domain={['auto', 'auto']}
          allowDataOverflow={false} // Prevent overflow
        />
        <RechartsTooltip
            content={<CustomTooltip />}
            cursor={{ stroke: 'hsl(var(--foreground))', strokeWidth: 1, strokeDasharray: '3 3' }}
            wrapperStyle={{ zIndex: 10 }}
        />
        <ChartElement
          type="monotone"
          dataKey={dataKey}
          stroke="#4f46e5"
          fill={type === 'bar' ? "#4f46e5" : (type === 'area' ? "url(#colorValue)" : "none")}
          strokeWidth={type === 'area' ? 1.5 : 2}
          dot={type === 'line' && validData.length < 60 ? { r: 2.5, strokeWidth: 1.5, fill: "#6366f1" } : false}
          activeDot={type === 'line' ? { r: 5, strokeWidth: 2, fill: "#4338ca", stroke: 'hsl(var(--background))' } : undefined}
        />
      </ChartComponentType>
    </ResponsiveContainer>
  );
}