// src/components/dashboard/ChartComponent.tsx
'use client';
import React, { useRef, useMemo } from 'react'; // ADDED useMemo here
import {
  ComposedChart, // CHANGED to ComposedChart
  Line, Bar, Area,
  XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  ReferenceArea, Brush
} from 'recharts';
import { TimeSeriesDataPoint } from '@/lib/indicators';
import { format, parseISO, isValid, differenceInDays, differenceInMonths } from 'date-fns';
import { usRecessionPeriods } from '@/lib/recessionData';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { AppPlanTier } from '@/app/api/auth/[...nextauth]/route';
import { canUserAccessFeature, FEATURE_KEYS } from '@/lib/permissions';
import toast from 'react-hot-toast';
// import { toPng } from 'html-to-image';

export interface ChartSeries {
  data: TimeSeriesDataPoint[]; // This will now be primarily for calculation before merging
  dataKey: string; // Unique key for this series in the merged dataset
  name: string;
  color: string;
  type?: 'line' | 'bar' | 'area';
  yAxisId?: string;
  strokeDasharray?: string;
  unit?: string;
  originalData?: TimeSeriesDataPoint[]; // Keep original for tooltip if normalized
}

interface ChartComponentProps {
  series: ChartSeries[];
  showRecessionPeriods?: boolean;
  enableBrush?: boolean;
  chartId?: string;
}

export default function ChartComponent({
  series,
  showRecessionPeriods = true,
  enableBrush = false,
  chartId = "chart"
}: ChartComponentProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const { data: session } = useSession();
  const userTier: AppPlanTier | undefined = (session?.user as any)?.activePlanTier;
  const canDownloadChart = canUserAccessFeature(userTier, FEATURE_KEYS.CHART_DOWNLOAD);

  // --- Data Merging Logic ---
  const mergedAndProcessedData = useMemo(() => {
    if (!series || series.length === 0) return [];

    const allDates = new Set<string>();
    series.forEach(s => {
      // Ensure s.data is an array before trying to iterate
      if (Array.isArray(s.data)) {
        s.data.forEach(dp => {
          if (dp && dp.date && isValid(parseISO(dp.date))) { // Added check for dp existence
            allDates.add(dp.date);
          }
        });
      }
    });

    const sortedDates = Array.from(allDates).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());

    return sortedDates.map(date => {
      const dataPoint: { date: string; [key: string]: any } = { date };
      series.forEach(s => {
        // Ensure s.data is an array before trying to find
        const point = Array.isArray(s.data) ? s.data.find(dp => dp && dp.date === date) : undefined; // Added check for dp existence
        dataPoint[s.dataKey] = point ? point.value : null;
      });
      return dataPoint;
    });
  }, [series]);
  // --- End Data Merging Logic ---

  const validData = mergedAndProcessedData.filter(d => d.date && isValid(parseISO(d.date)));

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

  const CustomTooltip = ({ active, payload, label, series: chartSeriesConfig }: any) => {
    if (active && payload && payload.length && label) {
      let dateFormatted = label;
      try {
        const parsedLabel = parseISO(label);
        if (isValid(parsedLabel)) {
            dateFormatted = format(parsedLabel, 'MMM d, yyyy');
        }
      } catch (e) { /* ignore parsing error */ }

      return (
        <div className="bg-popover text-popover-foreground p-2 border border-border rounded shadow-lg text-xs">
          <p className="font-semibold mb-1">{dateFormatted}</p>
          {payload.map((p: any) => {
            const originalSeriesConfig = chartSeriesConfig.find((s: ChartSeries) => s.dataKey === p.dataKey);
            return (
              <p key={`tooltip-${p.dataKey}`} style={{ color: p.color || p.stroke || p.fill }}>
                {p.name}: {p.value?.toLocaleString(undefined, {
                   minimumFractionDigits: originalSeriesConfig?.unit === '%' || originalSeriesConfig?.unit?.includes('Index') ? 1 : (originalSeriesConfig?.unit === "USD" ? 2 : 0),
                   maximumFractionDigits: 2,
                 }) ?? 'N/A'}
                {originalSeriesConfig?.unit && ` ${originalSeriesConfig.unit}`}
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };

  if (!validData || validData.length === 0) {
    return (
        <div className="flex items-center justify-center h-full text-muted-foreground text-sm p-4 text-center">
          <p>No data available for the selected period or indicator.</p>
        </div>
      );
  }

  const yAxisIds = new Set(series.map(s => s.yAxisId || 'left'));

  const handleDownload = () => {
    if (!canDownloadChart) {
      toast.error("Chart download is a Pro feature. Please upgrade your plan.");
      return;
    }
    toast.success("Chart download initiated (placeholder). Full implementation requires a library like html-to-image.");
    console.log("Attempting to download chart from ref:", chartRef.current);
    // if (chartRef.current) {
    //   const chartElement = chartRef.current.querySelector('.recharts-wrapper');
    //   if (chartElement) {
    //     toPng(chartElement as HTMLElement)
    //       .then((dataUrl) => { /* ... download logic ... */ })
    //       .catch(/* ... error handling ... */);
    //   }
    // }
  };

  return (
    <div ref={chartRef} className="relative w-full h-full">
        {canDownloadChart && (
          <Button
            variant="outline"
            size="icon"
            onClick={handleDownload}
            className="absolute top-1 right-1 z-10 h-7 w-7"
            title="Download Chart"
          >
            <Download className="h-3.5 w-3.5" />
          </Button>
        )}
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={validData} margin={{ top: 5, right: yAxisIds.has('right') ? 25 : 5, left: yAxisIds.has('left') ? -20 : 5, bottom: enableBrush ? 35 : 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" strokeOpacity={0.5} />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateTick}
            tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
            stroke="hsl(var(--border))"
            dy={10}
            tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
            axisLine={{ stroke: 'hsl(var(--border))' }}
            interval="preserveStartEnd"
            padding={{ left: 10, right: 10 }}
            minTickGap={20}
          />
          {yAxisIds.has('left') && (
            <YAxis
              yAxisId="left"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              stroke="hsl(var(--border))"
              tickFormatter={(value) => typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 1, notation: 'compact' }) : value}
              dx={-5}
              tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              domain={['auto', 'auto']}
              allowDataOverflow={false}
            />
          )}
          {yAxisIds.has('right') && (
            <YAxis
              yAxisId="right"
              orientation="right"
              tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
              stroke="hsl(var(--border))"
              tickFormatter={(value) => typeof value === 'number' ? value.toLocaleString(undefined, { maximumFractionDigits: 1, notation: 'compact' }) : value}
              dx={5}
              tickLine={{ stroke: 'hsl(var(--muted-foreground))' }}
              axisLine={{ stroke: 'hsl(var(--border))' }}
              domain={['auto', 'auto']}
              allowDataOverflow={false}
            />
          )}
          <RechartsTooltip
            content={<CustomTooltip series={series} />}
            cursor={{ stroke: 'hsl(var(--foreground))', strokeWidth: 1, strokeDasharray: '3 3' }}
            wrapperStyle={{ zIndex: 10 }}
          />

          <defs>
            {series.map((s, i) => (
              s.type === 'area' && (
                <linearGradient key={`gradient-${s.dataKey}`} id={`${chartId}-grad-${s.dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={s.color} stopOpacity={0.7}/>
                  <stop offset="95%" stopColor={s.color} stopOpacity={0.1}/>
                </linearGradient>
              )
            ))}
          </defs>

          {series.map((s) => {
            const commonProps = {
              key: s.dataKey,
              dataKey: s.dataKey,
              name: s.name,
              yAxisId: s.yAxisId || 'left',
              strokeDasharray: s.strokeDasharray,
              legendType: (series.length > 1) ? 'line' : 'none' as any,
              isAnimationActive: false,
            };

            if (s.type === 'bar') {
              return <Bar {...commonProps} fill={s.color} />;
            }
            if (s.type === 'area') {
              return <Area {...commonProps} type="monotone" stroke={s.color} fill={`url(#${chartId}-grad-${s.dataKey})`} strokeWidth={1.5} dot={false} />;
            }
            return <Line {...commonProps} type="monotone" stroke={s.color} strokeWidth={2} dot={validData.length < 60 ? { r: 2.5, strokeWidth: 1.5, fill: s.color } : false} activeDot={{ r: 5, strokeWidth: 2, fill: s.color, stroke: 'hsl(var(--background))' }} />;
          })}

          {showRecessionPeriods && chartMinDate && chartMaxDate && usRecessionPeriods
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

          {enableBrush && validData.length > 0 && (
            <Brush dataKey="date" stroke="hsl(var(--primary))" fill="hsl(var(--background))" height={25} travellerWidth={10} tickFormatter={formatDateTick} y={10} />
          )}

          {series.length > 1 &&
            <Legend
                wrapperStyle={{ fontSize: '10px', paddingTop: enableBrush ? '15px' : '10px' }}
                iconSize={8}
            />
        }
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}