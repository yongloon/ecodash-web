// src/components/dashboard/AssetRiskItem.tsx
"use client";

import React from 'react';
import Link from 'next/link';
import { IndicatorMetadata, TimeSeriesDataPoint, indicatorCategories } from '@/lib/indicators';
import { FaArrowUp, FaArrowDown, FaMinus } from 'react-icons/fa';
import { Area, AreaChart, ResponsiveContainer, XAxis, YAxis } from 'recharts';
import { format, parseISO, isValid, differenceInDays } from 'date-fns';

interface AssetRiskItemProps {
  indicator: IndicatorMetadata;
  latestValue: TimeSeriesDataPoint | null;
  previousValue?: TimeSeriesDataPoint | null; // For calculating 1-day change
  sparklineData?: TimeSeriesDataPoint[];
  changePeriodLabel?: string; // e.g., "1D Change", "7D Change"
  changeValue?: number | null; // Pre-calculated change
}

export default function AssetRiskItem({
  indicator,
  latestValue,
  previousValue,
  sparklineData,
  changePeriodLabel = "Change",
  changeValue,
}: AssetRiskItemProps) {

  const displayValue = latestValue?.value !== null && latestValue?.value !== undefined
    ? `${latestValue.value.toLocaleString(undefined, {
        minimumFractionDigits: indicator.unit === '%' ? 2 : (indicator.unit?.toLowerCase().includes('usd') ? 2 : 0),
        maximumFractionDigits: indicator.unit === '%' ? 2 : (indicator.unit?.toLowerCase().includes('usd') ? 2 : (indicator.id === 'BTC_PRICE_USD' ? 0 : 2)),
      })}`
    : 'N/A';
  const displayUnit = latestValue?.value !== null && latestValue?.value !== undefined && indicator.unit ? indicator.unit : '';

  let TrendIcon = FaMinus;
  let trendColor = 'text-muted-foreground';
  let trendPercentage: string | null = null;

  const calculatedChange = changeValue ?? (
    (latestValue?.value !== null && latestValue?.value !== undefined &&
     previousValue?.value !== null && previousValue?.value !== undefined && previousValue.value !== 0)
    ? ((latestValue.value - previousValue.value) / Math.abs(previousValue.value)) * 100
    : null
  );

  if (calculatedChange !== null) {
    trendPercentage = `${calculatedChange > 0 ? '+' : ''}${calculatedChange.toFixed(2)}%`;
    if (calculatedChange > 0) { TrendIcon = FaArrowUp; trendColor = 'text-[hsl(var(--chart-green))]'; }
    else if (calculatedChange < 0) { TrendIcon = FaArrowDown; trendColor = 'text-[hsl(var(--chart-red))]'; }
  }

  const categoryForLink = Object.values(indicatorCategories).find(cat => cat.key === indicator.categoryKey);
  const linkHref = categoryForLink
    ? `/category/${categoryForLink.slug}?indicator=${indicator.id}`
    : `/`;

  const validSparklineData = sparklineData?.filter(d => d.value !== null && typeof d.value === 'number' && d.date && isValid(parseISO(d.date))) || [];
  const sparklineStrokeColor = calculatedChange === null ? "hsl(var(--muted-foreground))" : (calculatedChange > 0 ? "hsl(var(--chart-green))" : (calculatedChange < 0 ? "hsl(var(--chart-red))" : "hsl(var(--muted-foreground))"));
  const gradientId = `assetSpark-${indicator.id.replace(/[^a-zA-Z0-9-_]/g, '')}`;

  return (
    <Link href={linkHref} className="block p-3 rounded-lg hover:bg-muted/50 transition-colors group">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground group-hover:text-primary truncate" title={indicator.name}>
            {indicator.name}
          </p>
          <p className="text-xs text-muted-foreground">{displayUnit}</p>
        </div>
        {validSparklineData.length > 1 && (
          <div className="w-16 h-8 flex-shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={validSparklineData} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
                <defs><linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor={sparklineStrokeColor} stopOpacity={0.4}/><stop offset="95%" stopColor={sparklineStrokeColor} stopOpacity={0.05}/></linearGradient></defs>
                <Area type="monotone" dataKey="value" stroke={sparklineStrokeColor} fill={`url(#${gradientId})`} strokeWidth={1.2} dot={false} isAnimationActive={false} />
                <XAxis dataKey="date" hide />
                <YAxis domain={['dataMin - Math.abs(dataMax-dataMin)*0.1', 'dataMax + Math.abs(dataMax-dataMin)*0.1']} hide />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
      <div className="mt-1 flex items-baseline justify-between">
        <p className="text-lg font-semibold text-foreground">{displayValue}</p>
        {trendPercentage && (
          <div className={`flex items-center text-xs font-medium ${trendColor}`}>
            <TrendIcon className="h-3 w-3 mr-0.5" />
            {trendPercentage}
            {changePeriodLabel && <span className="ml-1 text-muted-foreground/80 text-[0.65rem]">({changePeriodLabel})</span>}
          </div>
        )}
      </div>
    </Link>
  );
}