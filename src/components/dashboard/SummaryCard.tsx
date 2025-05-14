// src/components/dashboard/SummaryCard.tsx
"use client"; 

import React from 'react';
import { IndicatorMetadata, TimeSeriesDataPoint, indicatorCategories } from '@/lib/indicators';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO, isValid } from 'date-fns';
import Link from 'next/link';
import { FaArrowUp, FaArrowDown, FaMinus } from 'react-icons/fa';
import { 
    ResponsiveContainer, 
    AreaChart, 
    Area, 
    XAxis,
    YAxis 
} from 'recharts';

interface SummaryCardProps {
  indicator: IndicatorMetadata;
  latestValue: TimeSeriesDataPoint | null;
  previousValue?: TimeSeriesDataPoint | null;
  sparklineData?: TimeSeriesDataPoint[];
}

export default function SummaryCard({ indicator, latestValue, previousValue, sparklineData }: SummaryCardProps) {
  const displayValue = latestValue?.value !== null && latestValue?.value !== undefined
    ? `${latestValue.value.toLocaleString(undefined, { 
        minimumFractionDigits: indicator.unit === '%' || indicator.unit?.includes('Index') ? 1 : 0,
        maximumFractionDigits: 2 
      })}`
    : 'N/A';
  const displayUnit = latestValue?.value !== null && latestValue?.value !== undefined && indicator.unit ? indicator.unit : '';

  let TrendIcon = FaMinus;
  let trendColor = 'text-muted-foreground';
  let trendPercentage: string | null = null;

  if (latestValue?.value !== null && latestValue?.value !== undefined && 
      previousValue?.value !== null && previousValue?.value !== undefined) {
    if (previousValue.value !== 0) {
        const change = latestValue.value - previousValue.value;
        const percentageChange = (change / Math.abs(previousValue.value)) * 100;
        trendPercentage = `${percentageChange > 0 ? '+' : ''}${percentageChange.toFixed(1)}%`;
    } else if (latestValue.value !== 0) {
        trendPercentage = latestValue.value > 0 ? "+INF%" : "-INF%";
    } else {
        trendPercentage = "0%";
    }
    
    if (latestValue.value > previousValue.value) {
      TrendIcon = FaArrowUp;
      trendColor = 'text-[hsl(var(--chart-green))]';
    } else if (latestValue.value < previousValue.value) {
      TrendIcon = FaArrowDown;
      trendColor = 'text-[hsl(var(--chart-red))]';
    }
  }

  const categoryForLink = Object.values(indicatorCategories).find(cat => cat.key === indicator.categoryKey);
  const linkHref = categoryForLink 
    ? `/category/${categoryForLink.slug}?indicator=${indicator.id}` 
    : `/`;

  let formattedDate = '';
  if (latestValue?.date && isValid(parseISO(latestValue.date))) {
      try { formattedDate = `(${format(parseISO(latestValue.date), 'MMM d, yyyy')})`; } catch (e) {}
  }

  const validSparklineData = sparklineData?.filter(d => d.value !== null && typeof d.value === 'number' && d.date && isValid(parseISO(d.date))) || [];
  
  let sparklineStrokeColor = "hsl(var(--chart-neutral))"; 
  let sparklineFillColor = "hsl(var(--chart-neutral))";
  
  if (latestValue?.value !== null && previousValue?.value !== null && latestValue?.value !== undefined && previousValue?.value !== undefined) {
      if (latestValue.value > previousValue.value) {
          sparklineStrokeColor = "hsl(var(--chart-green))";
          sparklineFillColor = "hsl(var(--chart-green))";
      } else if (latestValue.value < previousValue.value) {
          sparklineStrokeColor = "hsl(var(--chart-red))";
          sparklineFillColor = "hsl(var(--chart-red))";
      }
  }

  const gradientId = `sparklineGrad-${indicator.id.replace(/[^a-zA-Z0-9-_]/g, '')}`;

  return (
     <Link href={linkHref} className="block hover:shadow-xl focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-shadow duration-200 rounded-lg group">
        <Card className="h-full border border-border bg-card text-card-foreground group-hover:border-primary/60 transition-colors duration-200 flex flex-col">
            <CardHeader className="pb-2 px-4 pt-4 sm:px-5 sm:pt-5">
                <div className="flex justify-between items-start gap-1">
                    <CardTitle className="text-xs sm:text-sm font-medium text-muted-foreground group-hover:text-primary transition-colors truncate" title={indicator.name}>
                        {indicator.name}
                    </CardTitle>
                    {trendPercentage && (
                        <div className={`flex items-center text-xs font-semibold ${trendColor} flex-shrink-0`}>
                            <TrendIcon className="h-3 w-3 mr-0.5" />
                            {trendPercentage}
                        </div>
                    )}
                </div>
                <div className="text-xl sm:text-2xl font-bold text-foreground pt-0.5">
                    {displayValue}
                    <span className="text-xs font-normal text-muted-foreground ml-1">{displayUnit}</span>
                </div>
            </CardHeader>
            <CardContent className="pt-0 pb-3 px-4 sm:px-5 flex-grow flex flex-col justify-end">
                {validSparklineData.length > 1 ? (
                    <div className="w-full h-[40px] sm:h-[50px] mb-1 -mx-1">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={validSparklineData} margin={{ top: 5, right: 0, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={sparklineFillColor} stopOpacity={0.4}/>
                                        <stop offset="95%" stopColor={sparklineFillColor} stopOpacity={0.05}/>
                                    </linearGradient>
                                </defs>
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke={sparklineStrokeColor}
                                    fill={`url(#${gradientId})`}
                                    strokeWidth={1.5}
                                    dot={false}
                                    isAnimationActive={false}
                                />
                                <XAxis dataKey="date" hide />
                                <YAxis domain={['dataMin - Math.abs(dataMax-dataMin)*0.1', 'dataMax + Math.abs(dataMax-dataMin)*0.1']} hide padding={{ top: 5, bottom: 5 }}/> 
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <div className="w-full h-[40px] sm:h-[50px] mb-1 flex items-center justify-center">
                        <p className="text-xs text-muted-foreground">No trend data</p>
                    </div>
                )}
                <p className="text-xs text-muted-foreground mt-auto text-right w-full pt-1">
                    {formattedDate}
                </p>
            </CardContent>
        </Card>
    </Link>
  );
}