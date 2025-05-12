// src/components/dashboard/ChartComponent.tsx
'use client';
import React from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, AreaChart, Area,
  ReferenceArea,
} from 'recharts';
import { TimeSeriesDataPoint } from '@/lib/indicators';
import { format, parseISO, isValid, differenceInDays, differenceInMonths } from 'date-fns';
import { usRecessionPeriods, RecessionPeriod } from '@/lib/recessionData';

export interface MovingAverageSeries {
  period: number;
  data: TimeSeriesDataPoint[];
  color: string;
}

interface ChartComponentProps {
  data: TimeSeriesDataPoint[];
  dataKey: string;
  type?: 'line' | 'bar' | 'area';
  movingAverages?: MovingAverageSeries[];
}

export default function ChartComponent({ data, dataKey, type = 'line', movingAverages }: ChartComponentProps) {
  const validData = data.filter(d => d.value !== null && d.value !== undefined && d.date && isValid(parseISO(d.date)));

  let chartMinDate: Date | null = null;
  let chartMaxDate: Date | null = null;
  if (validData.length > 0) {
    try {
        chartMinDate = parseISO(validData[0].date);
        chartMaxDate = parseISO(validData[validData.length - 1].date);
    } catch (e) { console.error("Error parsing chart dates for boundary check", e); }
  }

  // --- YOUR ORIGINAL DATE FORMATTING LOGIC SHOULD BE HERE ---
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

      // Display all series in tooltip if MAs are present
      const mainSeries = payload.find((p: any) => p.name === "Value" || p.name === undefined); // Main data key
      const maSeriesPayload = payload.filter((p: any) => p.name?.startsWith("MA"));

      return (
        <div className="bg-popover text-popover-foreground p-2 border border-border rounded shadow-lg text-xs">
          <p className="font-semibold mb-1">{dateFormatted}</p>
          {mainSeries && (
            <p style={{ color: mainSeries.stroke || mainSeries.fill || '#4f46e5' }}>
              {mainSeries.name || 'Value'}: {mainSeries.value?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? 'N/A'}
            </p>
          )}
          {maSeriesPayload.map((maP: any) => (
            <p key={maP.name} style={{ color: maP.stroke || maP.fill }}>
              {maP.name}: {maP.value?.toLocaleString(undefined, { maximumFractionDigits: 2 }) ?? 'N/A'}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  // --- END OF YOUR ORIGINAL DATE FORMATTING LOGIC ---


  if (!validData || validData.length === 0) {
    return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4 text-center">
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
          yAxisId="left" // Default YAxis ID
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
          yAxisId="left"
          name="Value"
        />

        {chartMinDate && chartMaxDate && usRecessionPeriods
          .filter(period => {
            try {
                const periodStart = parseISO(period.startDate);
                const periodEnd = parseISO(period.endDate);
                return isValid(periodStart) && isValid(periodEnd) &&
                       periodStart <= chartMaxDate && periodEnd >= chartMinDate;
            } catch { return false; }
          })
          .map((period) => (
            <ReferenceArea
              key={period.id}
              x1={period.startDate}
              x2={period.endDate}
              yAxisId="left"
              fill="hsl(var(--muted))"
              fillOpacity={0.3}
              stroke="hsl(var(--border))"
              strokeOpacity={0.5}
              ifOverflow="hidden"
            />
          ))}

        {movingAverages?.map(ma => (
          <Line
            key={`ma-${ma.period}`}
            type="monotone"
            dataKey="value"
            data={ma.data.filter(d => d.value !== null && d.date && isValid(parseISO(d.date)))}
            stroke={ma.color}
            strokeWidth={1.5}
            dot={false}
            name={`MA ${ma.period}`}
            yAxisId="left"
            legendType="none"
          />
        ))}
        {((movingAverages && movingAverages.length > 0) || (type !== 'bar' && type !== 'area' /* Add more conditions if other series are added */) ) && 
            <Legend 
                wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} 
                iconSize={8}
            />
        }
      </ChartComponentType>
    </ResponsiveContainer>
  );
}