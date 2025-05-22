// src/components/dashboard/IndicatorCard.tsx
"use client";

import React, { useMemo } from 'react'; // Removed useState
import Link from 'next/link';
// import { useRouter } from 'next/navigation'; // Not needed for MVP card
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
// import { Switch } from "@/components/ui/switch"; // Not needed
// import { Label } from "@/components/ui/label"; // Not needed
import { Button } from '@/components/ui/button';
import { FaInfoCircle } from 'react-icons/fa';
import { FiAlertCircle } from 'react-icons/fi'; // Kept for no-data state
// import { Lock, Star, BarChartHorizontalBig } from 'lucide-react'; // Not needed for MVP
// import { useSession } from 'next-auth/react'; // Not needed for MVP card display logic
// import { useFavorites } from '@/hooks/useFavorites'; // Removed
// import { AppPlanTier } from '@/app/api/auth/[...nextauth]/route'; // Not needed
import { IndicatorMetadata, TimeSeriesDataPoint } from '@/lib/indicators';
// import { calculateSeriesStatistics, SeriesStatistics } from '@/lib/calculations'; // Defer stats for MVP
import ChartComponent from './ChartComponent'; // MovingAverages prop will be removed from ChartComponent
import { format, parseISO, isValid } from 'date-fns';

interface IndicatorCardProps {
  indicator: IndicatorMetadata;
  latestValue: TimeSeriesDataPoint | null;
  historicalData: TimeSeriesDataPoint[];
}

export default function IndicatorCard({ indicator, latestValue, historicalData }: IndicatorCardProps) {
  // const router = useRouter(); // Not needed for MVP
  // const { data: session, status: sessionStatus } = useSession(); // Not needed for MVP

  const displayValue = useMemo(() => latestValue?.value !== null && latestValue?.value !== undefined
    ? `${latestValue.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${indicator.unit}`
    : 'N/A', [latestValue, indicator.unit]);

  const displayDate = useMemo(() => {
    if (latestValue?.date && isValid(parseISO(latestValue.date))) {
      try { return `(${format(parseISO(latestValue.date), 'MMM d, yyyy')})`; } catch (e) { return ''; }
    }
    return '';
  }, [latestValue?.date]);

  const validHistoricalData = useMemo(() => Array.isArray(historicalData) ? historicalData.filter(d => d.value !== null && d.value !== undefined && d.date && isValid(parseISO(d.date))) : [], [historicalData]);

  // Defer statistics for MVP
  // const statistics: SeriesStatistics = useMemo(() =>
  //   calculateSeriesStatistics(validHistoricalData),
  // [validHistoricalData]);

  const isDataEffectivelyUnavailable = validHistoricalData.length === 0 && latestValue === null;

  return (
    <Card id={`indicator-${indicator.id}`} className="flex flex-col h-full border bg-card text-card-foreground shadow-sm hover:shadow-lg transition-shadow duration-200 relative overflow-hidden group">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start gap-2">
          <div className='flex-1 min-w-0'>
            <CardTitle className="text-base md:text-lg font-semibold leading-tight tracking-tight truncate" title={indicator.name}>
                {indicator.name}
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm mt-1">
              <span className='font-medium text-foreground'>{displayValue}</span>
              <span className="text-xs ml-1 text-muted-foreground">{displayDate}</span>
            </CardDescription>
          </div>
          <div className="flex items-center space-x-1 flex-shrink-0">
            {/* Favorites button removed */}
            {/* Statistics button removed */}
            {indicator.description && (
              <TooltipProvider delayDuration={100}> <Tooltip> <TooltipTrigger asChild>
                 <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                    <FaInfoCircle className="h-4 w-4" />
                 </Button>
              </TooltipTrigger> <TooltipContent className="max-w-xs text-xs bg-popover text-popover-foreground border-border shadow-lg rounded-md p-2">
                <p>{indicator.description}</p>
              </TooltipContent> </Tooltip> </TooltipProvider>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col px-3 sm:px-4 pt-0 pb-2">
        <div className="flex-grow h-48 md:h-56 lg:h-60 -ml-1 -mr-1 sm:-ml-2 sm:-mr-2">
           {validHistoricalData && validHistoricalData.length > 0 ? (
             <ChartComponent // Pass only necessary props for MVP
                data={validHistoricalData}
                dataKey="value"
                type={indicator.chartType || 'line'}
                // movingAverages prop removed
              />
           ) : (
             <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-xs p-3 text-center">
               <FiAlertCircle className="h-6 w-6 mb-2 opacity-70" />
               <p>
                {isDataEffectivelyUnavailable
                    ? "Data currently unavailable for this indicator."
                    : "No data points for the selected period."}
               </p>
             </div>
           )}
        </div>
      </CardContent>
      <CardFooter className="flex-col items-start space-y-2 text-xs px-3 sm:px-4 pt-2 pb-3 border-t">
        <div className="w-full flex justify-between items-center text-muted-foreground">
            <div className='truncate max-w-[50%] sm:max-w-[60%]' title={`Source: ${indicator.sourceName}`}>
                Source: {indicator.sourceLink ? (
                    <a href={indicator.sourceLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline ml-1">
                        {indicator.sourceName}
                    </a>
                ) : ( <span className="ml-1">{indicator.sourceName}</span> )}
            </div>
            {indicator.frequency && <span className="flex-shrink-0 ml-2">({indicator.frequency})</span>}
        </div>
        {/* Moving Averages UI removed */}
        {/* Advanced Stats Button UI removed */}
        {/* Signal display removed from footer */}
      </CardFooter>
    </Card>
  );
}