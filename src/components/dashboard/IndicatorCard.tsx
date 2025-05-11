// src/components/dashboard/IndicatorCard.tsx
import React from 'react';
import { IndicatorMetadata, TimeSeriesDataPoint } from '@/lib/indicators';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import ChartComponent from './ChartComponent';
import { format, parseISO, isValid } from 'date-fns';
import { FaInfoCircle } from 'react-icons/fa';
import { calculateSeriesStatistics, SeriesStatistics } from '@/lib/calculations';
import { FiBarChart2 } from 'react-icons/fi'; // Icon for stats

interface IndicatorCardProps {
  indicator: IndicatorMetadata;
  latestValue: TimeSeriesDataPoint | null;
  historicalData: TimeSeriesDataPoint[];
}

export default function IndicatorCard({ indicator, latestValue, historicalData }: IndicatorCardProps) {
  const displayValue = latestValue?.value !== null && latestValue?.value !== undefined
    ? `${latestValue.value.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${indicator.unit}`
    : 'N/A';

  let displayDate = '';
  if (latestValue?.date) {
    try {
      const parsed = parseISO(latestValue.date);
      if (isValid(parsed)) {
        displayDate = `(${format(parsed, 'MMM d, yyyy')})`;
      }
    } catch (e) { /* date parsing failed */ }
  }

  const statistics: SeriesStatistics = calculateSeriesStatistics(historicalData);

  return (
    <Card className="flex flex-col h-full border border-border bg-card text-card-foreground shadow-sm hover:shadow-md transition-shadow duration-200">
      <CardHeader>
        <div className="flex justify-between items-start gap-2">
          <div className='flex-1 min-w-0'>
            <CardTitle className="text-base md:text-lg font-semibold leading-tight tracking-tight truncate" title={indicator.name}>
                {indicator.name}
            </CardTitle>
            <CardDescription className="text-sm mt-1">
              <span className='font-medium text-foreground'>{displayValue}</span>
              <span className="text-xs ml-1 text-muted-foreground">{displayDate}</span>
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2 flex-shrink-0">
            {statistics.count > 0 && (
                 <TooltipProvider delayDuration={100}>
                    <Tooltip>
                        <TooltipTrigger asChild>
                        <button className="text-muted-foreground hover:text-foreground">
                            <FiBarChart2 className="h-4 w-4" />
                        </button>
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs text-xs bg-popover text-popover-foreground border-border shadow-lg rounded-md p-2">
                            <p className="font-semibold mb-1">Data Statistics ({statistics.count} points):</p>
                            <ul className="list-none space-y-0.5"> {/* Changed to list-none for cleaner look */}
                                <li>Mean: <span className="font-medium">{statistics.mean?.toLocaleString() ?? 'N/A'}</span></li>
                                <li>Median: <span className="font-medium">{statistics.median?.toLocaleString() ?? 'N/A'}</span></li>
                                <li>Min: <span className="font-medium">{statistics.min?.toLocaleString() ?? 'N/A'}</span></li>
                                <li>Max: <span className="font-medium">{statistics.max?.toLocaleString() ?? 'N/A'}</span></li>
                                <li>Std Dev: <span className="font-medium">{statistics.stdDev?.toLocaleString() ?? 'N/A'}</span></li>
                            </ul>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            )}
            {indicator.description && (
              <TooltipProvider delayDuration={100}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground hover:text-foreground">
                      <FaInfoCircle className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs text-xs bg-popover text-popover-foreground border-border shadow-lg rounded-md p-2">
                    <p>{indicator.description}</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col">
        <div className="flex-grow h-48 md:h-64 -ml-1 -mr-1 sm:-ml-2 sm:-mr-2"> {/* Minor adjustment to chart margins */}
           <ChartComponent
              data={historicalData}
              dataKey="value"
              type={indicator.chartType || 'line'}
            />
        </div>
      </CardContent>
      <CardFooter className="justify-between items-center text-xs text-muted-foreground">
        <div className='truncate max-w-[70%]' title={`Source: ${indicator.sourceName}`}>
            Source: {indicator.sourceLink ? (
            <a href={indicator.sourceLink} target="_blank" rel="noopener noreferrer" className="text-indigo-600 dark:text-indigo-400 hover:underline ml-1">
                {indicator.sourceName}
            </a>
            ) : (
            <span className="ml-1">{indicator.sourceName}</span>
            )}
        </div>
        {indicator.frequency && <span className="flex-shrink-0 ml-2">({indicator.frequency})</span>}
      </CardFooter>
    </Card>
  );
}