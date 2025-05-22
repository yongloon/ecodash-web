// src/components/dashboard/ChartComponent.tsx
'use client';
import React from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, AreaChart, Area,
} from 'recharts';
import { TimeSeriesDataPoint } from '@/lib/indicators';
import { format, parseISO, isValid, differenceInDays, differenceInMonths } from 'date-fns';
import { FiAlertCircle } from 'react-icons/fi'; // For error/no-data message

interface ChartComponentProps {
  data: TimeSeriesDataPoint[];
  dataKey: string;
  type?: 'line' | 'bar' | 'area';
}

export default function ChartComponent({ data, dataKey, type = 'line' }: ChartComponentProps) {
  const validData = data.filter(d => d.value !== null && d.value !== undefined && d.date && isValid(parseISO(d.date)));

  let chartMinDate: Date | null = null;
  let chartMaxDate: Date | null = null;
  if (validData.length > 0) {
    try {
        chartMinDate = parseISO(validData[0].date);
        chartMaxDate = parseISO(validData[validData.length - 1].date);
    } catch (e) { console.error("Error parsing chart dates for boundary check", e); }
  }

  const dateRangeDays = validData.length > 1 && chartMinDate && chartMaxDate
    ? differenceInDays(chartMaxDate, chartMinDate)
    : 0;

  const dateRangeMonths = validData.length > 1 && chartMinDate && chartMaxDate
    ? differenceInMonths(chartMaxDate, chartMinDate)
    : 0;

  const formatDateTick = (tickItem: string) => {
    try {
        const date = parseISO(tickItem);
        if (!isValid(date)) return tickItem;
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

      const mainSeries = payload.find((p: any) => p.dataKey === dataKey); // More robust find

      return (
        <div className="bg-popover text-popover-foreground p-2 border border-border rounded shadow-lg text-xs">
          <p className="font-semibold mb-1">{dateFormatted}</p>
          {mainSeries && (
            <p style={{ color: mainSeries.stroke || mainSeries.fill || '#4f46e5' }}>
              {mainSeries.name || 'Value'}: {mainSeries.value?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? 'N/A'}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (validData && validData.length === 1 && (validData[0] as any).error) { // Check for our custom error marker
    return (
      <div className="flex flex-col items-center justify-center h-full text-destructive text-sm p-4 text-center">
        <FiAlertCircle className="h-6 w-6 mb-2" />
        <p>Error: {(validData[0] as any).error}</p>
      </div>
    );
  }

  if (!validData || validData.length === 0) {
    return (
        <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm p-4 text-center">
          <FiAlertCircle className="h-6 w-6 mb-2 opacity-70" />
          <p>No data available for the selected period or indicator.</p>
        </div>
      );
  }

  let ChartComponentType: any = LineChart;
  let ChartElement: any = Line;
  let additionalProps: any = {};

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
        margin={{ top: 5, right: 10, left: -20, bottom: type === 'bar' ? 5 : 20 }}
      >
        {additionalProps.defs}
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
        <XAxis
          dataKey="date"
          tickFormatter={formatDateTick}
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          stroke="hsl(var(--border))"
          dy={type === 'bar' ? 5 : 10}
          tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          interval={validData.length > 60 ? Math.floor(validData.length / 10) : (validData.length > 30 ? Math.floor(validData.length/5) : 0)}
          padding={{ left: 10, right: 10 }}
          minTickGap={type === 'bar' ? 0 : 10}
        />
        <YAxis
          tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
          stroke="hsl(var(--border))"
          tickFormatter={(value) => typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 1, notation: 'compact' }) : value}
          dx={-5}
          tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
          axisLine={{ stroke: 'hsl(var(--border))' }}
          domain={['auto', 'auto']}
          allowDataOverflow={false}
          // yAxisId="left" // REMOVE if only one Y-axis and it doesn't have an ID
                           // OR ensure this YAxis component below has yAxisId="left"
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
          // yAxisId="left" // REMOVE this if the YAxis component above does not have an id="left"
          name="Value" // Name for the tooltip
        />
        {/* Legend can be removed if only one series and MAs are gone */}
      </ChartComponentType>
    </ResponsiveContainer>
  );
}