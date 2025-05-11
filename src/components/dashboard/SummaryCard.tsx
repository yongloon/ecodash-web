// src/components/dashboard/SummaryCard.tsx
import React from 'react';
import { IndicatorMetadata, TimeSeriesDataPoint } from '@/lib/indicators';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO, isValid } from 'date-fns'; // Added isValid
import Link from 'next/link';
import { FaArrowUp, FaArrowDown, FaMinus } from 'react-icons/fa';
import { indicatorCategories } from '@/lib/indicators'; // Ensure this path is correct

interface SummaryCardProps {
  indicator: IndicatorMetadata;
  latestValue: TimeSeriesDataPoint | null;
  previousValue?: TimeSeriesDataPoint | null;
}

export default function SummaryCard({ indicator, latestValue, previousValue }: SummaryCardProps) {
  const displayValue = latestValue?.value !== null && latestValue?.value !== undefined
    ? `${latestValue.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}`
    : 'N/A';
  const displayUnit = latestValue?.value !== null && latestValue?.value !== undefined ? indicator.unit : '';

  let TrendIcon = FaMinus;
  let trendColor = 'text-muted-foreground';
  if (latestValue?.value !== null && previousValue?.value !== null && latestValue?.value !== undefined && previousValue?.value !== undefined) {
    if (latestValue.value > previousValue.value) {
      TrendIcon = FaArrowUp;
      trendColor = 'text-green-500 dark:text-green-400';
    } else if (latestValue.value < previousValue.value) {
      TrendIcon = FaArrowDown;
      trendColor = 'text-red-500 dark:text-red-400';
    }
  }

  const categoryData = Object.values(indicatorCategories).find(cat => cat.name === indicatorCategories[indicator.categoryKey].name);
  const linkHref = categoryData ? `/category/${categoryData.slug}` : '/';


  let formattedDate = '';
  if (latestValue?.date) {
      try {
          const parsedDate = parseISO(latestValue.date);
          if (isValid(parsedDate)) {
            formattedDate = `(${format(parsedDate, 'MMM yyyy')})`;
          }
      } catch (e) { /* Silently fail on date parse error */ }
  }


  return (
     <Link href={linkHref} className="block hover:shadow-lg transition-shadow duration-200 rounded-lg">
        <Card className="h-full border border-border bg-card text-card-foreground">
        <CardHeader className="pb-2">
            <CardDescription className="text-xs truncate" title={indicator.name}>{indicator.name}</CardDescription>
            <CardTitle className="text-xl md:text-2xl flex items-center justify-between">
            <span>{displayValue}</span>
            <TrendIcon className={`h-4 w-4 flex-shrink-0 ${trendColor}`} />
            </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
            <p className="text-xs text-muted-foreground">
            {displayUnit} {formattedDate}
            </p>
        </CardContent>
        </Card>
    </Link>
  );
}