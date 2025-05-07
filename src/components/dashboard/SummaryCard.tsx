// src/components/dashboard/SummaryCard.tsx
import React from 'react';
import { IndicatorMetadata, TimeSeriesDataPoint } from '@/lib/indicators';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { format, parseISO } from 'date-fns';
import Link from 'next/link';
import { FaArrowUp, FaArrowDown, FaMinus } from 'react-icons/fa'; // Trend icons
import { indicatorCategories } from '@/lib/indicators';

interface SummaryCardProps {
  indicator: IndicatorMetadata;
  latestValue: TimeSeriesDataPoint | null;
  previousValue?: TimeSeriesDataPoint | null; // Optional previous value for trend
}

// Smaller card for the overview page, showing headline metrics
export default function SummaryCard({ indicator, latestValue, previousValue }: SummaryCardProps) {

  // Format the latest value
  const displayValue = latestValue?.value !== null && latestValue?.value !== undefined
    ? `${latestValue.value.toLocaleString(undefined, { maximumFractionDigits: 1 })}` // Just the number, limit decimals
    : 'N/A';
  const displayUnit = latestValue?.value !== null && latestValue?.value !== undefined ? indicator.unit : '';

  // Determine trend icon (simple comparison)
  let TrendIcon = FaMinus;
  let trendColor = 'text-muted-foreground'; // Use theme color
  if (latestValue?.value !== null && previousValue?.value !== null && latestValue?.value !== undefined && previousValue?.value !== undefined) {
    if (latestValue.value > previousValue.value) {
      TrendIcon = FaArrowUp;
      trendColor = 'text-green-500 dark:text-green-400';
    } else if (latestValue.value < previousValue.value) {
      TrendIcon = FaArrowDown;
      trendColor = 'text-red-500 dark:text-red-400';
    }
  }

  // Get category slug for linking
  const categorySlug = indicatorCategories[indicator.categoryKey]?.slug;
  const linkHref = categorySlug ? `/category/${categorySlug}` : '#'; // Link to category page

  return (
     <Link href={linkHref} className="block hover:shadow-lg transition-shadow duration-200 rounded-lg">
        <Card className="h-full border border-border"> {/* Ensure card takes full height if in grid */}
        <CardHeader className="pb-2"> {/* Reduce padding bottom */}
            <CardDescription className="text-xs truncate" title={indicator.name}>{indicator.name}</CardDescription>
            <CardTitle className="text-xl md:text-2xl flex items-center justify-between">
            <span>{displayValue}</span>
            <TrendIcon className={`h-4 w-4 flex-shrink-0 ${trendColor}`} />
            </CardTitle>
        </CardHeader>
        <CardContent className="pt-0"> {/* Remove top padding */}
            <p className="text-xs text-muted-foreground">
            {displayUnit}
            {latestValue?.date && ` (${format(parseISO(latestValue.date), 'MMM yyyy')})`} {/* Concise date */}
            </p>
        </CardContent>
        </Card>
    </Link>
  );
}
